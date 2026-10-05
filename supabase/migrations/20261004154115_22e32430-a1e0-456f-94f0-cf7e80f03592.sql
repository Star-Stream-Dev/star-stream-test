CREATE TABLE public.user_desktop_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.app_users(id) ON DELETE CASCADE,
  stream_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  tunnel_url text,
  is_online boolean NOT NULL DEFAULT false,
  last_heartbeat timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_desktop_streams TO service_role;
ALTER TABLE public.user_desktop_streams ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_my_desktop_stream(p_session_token text)
RETURNS TABLE(stream_token text, tunnel_url text, is_online boolean, last_heartbeat timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO user_desktop_streams (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;
  RETURN QUERY SELECT s.stream_token, s.tunnel_url,
    (s.is_online AND s.last_heartbeat > now() - interval '3 minutes'), s.last_heartbeat
  FROM user_desktop_streams s WHERE s.user_id = v_user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.regenerate_my_stream_token(p_session_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; v_tok text;
BEGIN
  v_user_id := verify_session(p_session_token);
  v_tok := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  INSERT INTO user_desktop_streams (user_id, stream_token) VALUES (v_user_id, v_tok)
  ON CONFLICT (user_id) DO UPDATE SET stream_token = v_tok, is_online = false, updated_at = now();
  RETURN v_tok;
END; $$;

CREATE OR REPLACE FUNCTION public.set_my_stream_url(p_session_token text, p_tunnel_url text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF p_tunnel_url IS NOT NULL AND p_tunnel_url <> '' AND p_tunnel_url !~ '^https://' THEN RAISE EXCEPTION 'URL must start with https://'; END IF;
  INSERT INTO user_desktop_streams (user_id, tunnel_url, is_online, last_heartbeat) VALUES (v_user_id, nullif(p_tunnel_url,''), p_tunnel_url <> '', now())
  ON CONFLICT (user_id) DO UPDATE SET tunnel_url = nullif(p_tunnel_url,''), is_online = coalesce(p_tunnel_url,'') <> '', last_heartbeat = now(), updated_at = now();
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.update_stream_tunnel(p_stream_token text, p_tunnel_url text, p_is_online boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_stream_token IS NULL OR length(p_stream_token) < 32 THEN RAISE EXCEPTION 'Invalid token'; END IF;
  IF p_tunnel_url IS NOT NULL AND p_tunnel_url !~ '^https://[a-z0-9-]+\.trycloudflare\.com/?$' THEN RAISE EXCEPTION 'Invalid tunnel URL'; END IF;
  UPDATE user_desktop_streams SET
    tunnel_url = coalesce(p_tunnel_url, tunnel_url), is_online = p_is_online,
    last_heartbeat = now(), updated_at = now()
  WHERE stream_token = p_stream_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid token'; END IF;
  RETURN true;
END; $$;

GRANT EXECUTE ON FUNCTION public.update_stream_tunnel(text,text,boolean) TO anon, authenticated;