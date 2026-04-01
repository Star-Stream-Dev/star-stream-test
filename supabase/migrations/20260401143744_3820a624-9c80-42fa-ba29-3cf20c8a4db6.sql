CREATE OR REPLACE FUNCTION public.update_rom(
  p_session_token text,
  p_rom_id uuid,
  p_title text,
  p_console text,
  p_thumbnail_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can update ROMs'; END IF;
  UPDATE public.rom_library SET title = p_title, console = p_console, thumbnail_url = p_thumbnail_url, updated_at = now() WHERE id = p_rom_id;
  RETURN TRUE;
END;
$$;