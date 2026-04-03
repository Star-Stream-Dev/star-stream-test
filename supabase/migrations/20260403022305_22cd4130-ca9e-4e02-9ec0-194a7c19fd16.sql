
-- Create emulator_saves table
CREATE TABLE public.emulator_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  save_name text NOT NULL,
  game_name text NOT NULL,
  console text NOT NULL DEFAULT '',
  file_path text NOT NULL,
  file_size integer DEFAULT NULL,
  thumbnail_url text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.emulator_saves ENABLE ROW LEVEL SECURITY;

-- RLS: read all saves (public), no direct insert/update/delete
CREATE POLICY "Anyone can read emulator_saves" ON public.emulator_saves FOR SELECT USING (true);
CREATE POLICY "No direct insert on emulator_saves" ON public.emulator_saves FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on emulator_saves" ON public.emulator_saves FOR UPDATE USING (false);
CREATE POLICY "No direct delete on emulator_saves" ON public.emulator_saves FOR DELETE USING (false);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('emulator-saves', 'emulator-saves', true);

CREATE POLICY "Anyone can read emulator saves" ON storage.objects FOR SELECT USING (bucket_id = 'emulator-saves');
CREATE POLICY "Anyone can upload emulator saves" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'emulator-saves');
CREATE POLICY "Anyone can delete emulator saves" ON storage.objects FOR DELETE USING (bucket_id = 'emulator-saves');

-- RPC: upload save
CREATE OR REPLACE FUNCTION public.upload_emulator_save(
  p_session_token text,
  p_save_name text,
  p_game_name text,
  p_console text,
  p_file_path text,
  p_file_size integer DEFAULT NULL,
  p_thumbnail_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid; new_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO public.emulator_saves (user_id, save_name, game_name, console, file_path, file_size, thumbnail_url)
  VALUES (v_user_id, p_save_name, p_game_name, p_console, p_file_path, p_file_size, p_thumbnail_url)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- RPC: delete save (own only)
CREATE OR REPLACE FUNCTION public.delete_emulator_save(
  p_session_token text,
  p_save_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  DELETE FROM public.emulator_saves WHERE id = p_save_id AND user_id = v_user_id;
  RETURN TRUE;
END;
$$;

-- RPC: get my saves
CREATE OR REPLACE FUNCTION public.get_my_emulator_saves(
  p_session_token text
)
RETURNS TABLE(id uuid, save_name text, game_name text, console text, file_path text, file_size integer, thumbnail_url text, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  RETURN QUERY SELECT es.id, es.save_name, es.game_name, es.console, es.file_path, es.file_size, es.thumbnail_url, es.created_at, es.updated_at
  FROM public.emulator_saves es WHERE es.user_id = v_user_id ORDER BY es.created_at DESC;
END;
$$;
