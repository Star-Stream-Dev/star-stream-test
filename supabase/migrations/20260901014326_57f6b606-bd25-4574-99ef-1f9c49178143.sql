CREATE TABLE IF NOT EXISTS public.invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0 AND max_uses <= 1000),
  uses integer NOT NULL DEFAULT 0,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invite_link_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.invite_links(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.invite_links TO service_role;
GRANT ALL ON public.invite_link_uses TO service_role;

ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_link_uses ENABLE ROW LEVEL SECURITY;

-- Admin: create invite link
CREATE OR REPLACE FUNCTION public.create_invite_link(p_session_token text, p_max_uses integer DEFAULT 1, p_note text DEFAULT NULL)
RETURNS TABLE(id uuid, code text, max_uses integer, uses integer, note text, is_active boolean, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    v_code := lower(encode(gen_random_bytes(6), 'hex'));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invite_links l WHERE l.code = v_code);
  END LOOP;

  RETURN QUERY
  INSERT INTO public.invite_links (code, max_uses, note, created_by)
  VALUES (v_code, p_max_uses, nullif(btrim(coalesce(p_note,'')),''), v_user_id)
  RETURNING invite_links.id, invite_links.code, invite_links.max_uses, invite_links.uses,
            invite_links.note, invite_links.is_active, invite_links.created_at;
END;
$$;

-- Admin: list invite links
CREATE OR REPLACE FUNCTION public.get_invite_links(p_session_token text)
RETURNS TABLE(id uuid, code text, max_uses integer, uses integer, note text, is_active boolean, created_at timestamptz, created_by_username text, redeemed_usernames text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  SELECT s.user_id INTO v_user_id FROM public.user_sessions s
   WHERE s.session_token = p_session_token AND s.expires_at > now();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Invalid or expired session'; END IF;
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can view invite links'; END IF;

  RETURN QUERY
  SELECT l.id, l.code, l.max_uses, l.uses, l.note, l.is_active, l.created_at,
         au.username,
         COALESCE(ARRAY(SELECT u.username FROM public.invite_link_uses u WHERE u.invite_id = l.id ORDER BY u.created_at), '{}'::text[])
  FROM public.invite_links l
  LEFT JOIN public.app_users au ON au.id = l.created_by
  ORDER BY l.created_at DESC;
END;
$$;

-- Admin: revoke / delete
CREATE OR REPLACE FUNCTION public.set_invite_link_active(p_session_token text, p_invite_id uuid, p_active boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  SELECT s.user_id INTO v_user_id FROM public.user_sessions s
   WHERE s.session_token = p_session_token AND s.expires_at > now();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Invalid or expired session'; END IF;
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can modify invite links'; END IF;
  UPDATE public.invite_links SET is_active = p_active WHERE id = p_invite_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_invite_link(p_session_token text, p_invite_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  SELECT s.user_id INTO v_user_id FROM public.user_sessions s
   WHERE s.session_token = p_session_token AND s.expires_at > now();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Invalid or expired session'; END IF;
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can delete invite links'; END IF;
  DELETE FROM public.invite_links WHERE id = p_invite_id;
  RETURN true;
END;
$$;

-- Public: check an invite code validity (no sensitive data)
CREATE OR REPLACE FUNCTION public.check_invite_code(p_code text)
RETURNS TABLE(valid boolean, remaining integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT (l.is_active AND l.uses < l.max_uses), GREATEST(l.max_uses - l.uses, 0)
  FROM public.invite_links l WHERE l.code = lower(btrim(p_code));
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_invite_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_invite_link(text, integer, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_links(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_invite_link_active(text, uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_invite_link(text, uuid) TO anon, authenticated;

-- Signup redemption (called by edge function with service role)
CREATE OR REPLACE FUNCTION public.redeem_invite_link(p_code text, p_username text, p_password_hash text, p_password_salt text)
RETURNS TABLE(user_id uuid, username text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link public.invite_links%ROWTYPE;
  v_new_id uuid;
  v_username text := btrim(p_username);
BEGIN
  IF length(v_username) < 3 OR length(v_username) > 32 THEN
    RAISE EXCEPTION 'Username must be 3-32 characters';
  END IF;

  SELECT * INTO v_link FROM public.invite_links
   WHERE code = lower(btrim(p_code)) FOR UPDATE;

  IF v_link.id IS NULL THEN RAISE EXCEPTION 'Invalid invite link'; END IF;
  IF NOT v_link.is_active THEN RAISE EXCEPTION 'This invite link has been revoked'; END IF;
  IF v_link.uses >= v_link.max_uses THEN RAISE EXCEPTION 'This invite link has no uses remaining'; END IF;
  IF EXISTS (SELECT 1 FROM public.app_users a WHERE lower(a.username) = lower(v_username)) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;

  INSERT INTO public.app_users (username, password_hash, password_salt)
  VALUES (v_username, p_password_hash, p_password_salt)
  RETURNING id INTO v_new_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_new_id, 'user');
  UPDATE public.invite_links SET uses = uses + 1 WHERE id = v_link.id;
  INSERT INTO public.invite_link_uses (invite_id, user_id, username) VALUES (v_link.id, v_new_id, v_username);

  RETURN QUERY SELECT v_new_id, v_username;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_invite_link(text, text, text, text) FROM anon, authenticated;