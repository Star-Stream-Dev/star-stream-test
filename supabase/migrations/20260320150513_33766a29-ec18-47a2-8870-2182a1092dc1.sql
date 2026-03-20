-- Create game-files storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('game-files', 'game-files', true);

-- Allow public read access to game files
CREATE POLICY "Anyone can read game files" ON storage.objects FOR SELECT TO public USING (bucket_id = 'game-files');

-- Allow upload of game files
CREATE POLICY "Anyone can upload game files" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'game-files');

-- Allow deletion of game files
CREATE POLICY "Anyone can delete game files" ON storage.objects FOR DELETE TO public USING (bucket_id = 'game-files');

-- Add hosted_path column to games table
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS hosted_path text DEFAULT NULL;

-- Update create_game function to include hosted_path
CREATE OR REPLACE FUNCTION public.create_game(
  p_session_token text, p_title text, p_description text, p_url text, p_preview text, 
  p_embed boolean, p_is_tab text, p_category text, p_thumbnail_url text, p_display_order integer,
  p_hosted_path text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid; new_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can create games'; END IF;
  INSERT INTO public.games (title, description, url, preview, embed, is_tab, category, thumbnail_url, display_order, created_by, hosted_path)
  VALUES (p_title, p_description, p_url, p_preview, p_embed, p_is_tab, p_category, p_thumbnail_url, p_display_order, v_user_id, p_hosted_path)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Update update_game function to include hosted_path
CREATE OR REPLACE FUNCTION public.update_game(
  p_session_token text, p_game_id uuid, p_title text, p_description text, p_url text, 
  p_preview text, p_embed boolean, p_is_tab text, p_category text, p_thumbnail_url text, 
  p_display_order integer, p_hosted_path text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can update games'; END IF;
  UPDATE public.games SET title = p_title, description = p_description, url = p_url, preview = p_preview,
    embed = p_embed, is_tab = p_is_tab, category = p_category, thumbnail_url = p_thumbnail_url,
    display_order = p_display_order, hosted_path = p_hosted_path, updated_at = now() WHERE id = p_game_id;
  RETURN TRUE;
END;
$$;