
CREATE TABLE public.youtube_algorithm_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.youtube_algorithm_state ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for public RPC pattern)
CREATE POLICY "Anyone can read algorithm state"
  ON public.youtube_algorithm_state FOR SELECT
  TO public USING (true);

-- Block direct insert/update (use RPC)
CREATE POLICY "No direct insert on algorithm state"
  ON public.youtube_algorithm_state FOR INSERT
  TO public WITH CHECK (false);

CREATE POLICY "No direct update on algorithm state"
  ON public.youtube_algorithm_state FOR UPDATE
  TO public USING (false);

CREATE POLICY "No direct delete on algorithm state"
  ON public.youtube_algorithm_state FOR DELETE
  TO public USING (false);

-- RPC to load algorithm state
CREATE OR REPLACE FUNCTION public.get_my_algorithm_state(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid; v_state jsonb;
BEGIN
  v_user_id := verify_session(p_session_token);
  SELECT state INTO v_state FROM youtube_algorithm_state WHERE user_id = v_user_id;
  RETURN COALESCE(v_state, '{}'::jsonb);
END;
$$;

-- RPC to save algorithm state
CREATE OR REPLACE FUNCTION public.save_my_algorithm_state(p_session_token text, p_state jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO youtube_algorithm_state (user_id, state, updated_at)
  VALUES (v_user_id, p_state, now())
  ON CONFLICT (user_id) DO UPDATE SET state = p_state, updated_at = now();
  RETURN true;
END;
$$;
