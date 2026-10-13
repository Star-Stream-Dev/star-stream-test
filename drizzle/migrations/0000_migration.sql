CREATE TABLE public.home_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
ALTER TABLE public.home_layouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.home_layouts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_home_layout(p_session_token text)
RETURNS TABLE(state jsonb, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  RETURN QUERY SELECT h.state, h.updated_at FROM home_layouts h WHERE h.user_id = v_user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.save_my_home_layout(p_session_token text, p_state jsonb)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user_id uuid; v_ts timestamptz := now();
BEGIN
  v_user_id := verify_session(p_session_token);
  IF octet_length(p_state::text) > 200000 THEN RAISE EXCEPTION 'Layout too large'; END IF;
  INSERT INTO home_layouts (user_id, state, updated_at) VALUES (v_user_id, p_state, v_ts)
  ON CONFLICT (user_id) DO UPDATE SET state = p_state, updated_at = v_ts;
  RETURN v_ts;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_my_home_layout(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_my_home_layout(text, jsonb) TO anon, authenticated;