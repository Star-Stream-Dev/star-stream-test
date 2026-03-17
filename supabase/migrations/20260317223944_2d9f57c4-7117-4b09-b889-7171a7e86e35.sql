
-- Create ROM library table
CREATE TABLE public.rom_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  console text NOT NULL,
  thumbnail_url text,
  file_path text NOT NULL,
  file_size integer,
  uploaded_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rom_library ENABLE ROW LEVEL SECURITY;

-- Anyone can read ROMs (for browsing/downloading)
CREATE POLICY "Anyone can read rom_library" ON public.rom_library FOR SELECT TO public USING (true);

-- No direct insert/update/delete (managed via RPC)
CREATE POLICY "No direct insert on rom_library" ON public.rom_library FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "No direct update on rom_library" ON public.rom_library FOR UPDATE TO public USING (false);
CREATE POLICY "No direct delete on rom_library" ON public.rom_library FOR DELETE TO public USING (false);

-- Create storage bucket for ROM files
INSERT INTO storage.buckets (id, name, public) VALUES ('rom-files', 'rom-files', true);

-- Storage policies for rom-files bucket
CREATE POLICY "Anyone can read rom files" ON storage.objects FOR SELECT TO public USING (bucket_id = 'rom-files');
CREATE POLICY "Anyone can upload rom files" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'rom-files');
CREATE POLICY "Anyone can delete rom files" ON storage.objects FOR DELETE TO public USING (bucket_id = 'rom-files');

-- Admin RPC to create ROM entry
CREATE OR REPLACE FUNCTION public.create_rom(
  p_session_token text,
  p_title text,
  p_console text,
  p_thumbnail_url text,
  p_file_path text,
  p_file_size integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid; new_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can upload ROMs'; END IF;
  INSERT INTO public.rom_library (title, console, thumbnail_url, file_path, file_size, uploaded_by)
  VALUES (p_title, p_console, p_thumbnail_url, p_file_path, p_file_size, v_user_id)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Admin RPC to delete ROM entry
CREATE OR REPLACE FUNCTION public.delete_rom(
  p_session_token text,
  p_rom_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can delete ROMs'; END IF;
  DELETE FROM public.rom_library WHERE id = p_rom_id;
  RETURN TRUE;
END;
$$;
