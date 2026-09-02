CREATE OR REPLACE FUNCTION public.create_invite_link(p_session_token text, p_max_uses integer DEFAULT 1, p_note text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, code text, max_uses integer, uses integer, note text, is_active boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_code text;
BEGIN
  SELECT s.user_id INTO v_user_id FROM public.user_sessions s
   WHERE s.session_token = p_session_token AND s.expires_at > now();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Invalid or expired session'; END IF;
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can create invite links'; END IF;
  IF p_max_uses IS NULL OR p_max_uses < 1 OR p_max_uses > 1000 THEN RAISE EXCEPTION 'max_uses must be between 1 and 1000'; END IF;

  LOOP
    v_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invite_links l WHERE l.code = v_code);
  END LOOP;

  RETURN QUERY
  INSERT INTO public.invite_links (code, max_uses, note, created_by)
  VALUES (v_code, p_max_uses, nullif(btrim(coalesce(p_note,'')),''), v_user_id)
  RETURNING invite_links.id, invite_links.code, invite_links.max_uses, invite_links.uses,
            invite_links.note, invite_links.is_active, invite_links.created_at;
END;
$function$;