CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_session_token text,
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_theme_preset text DEFAULT NULL,
  p_custom_bg_type text DEFAULT NULL,
  p_custom_bg_url text DEFAULT NULL,
  p_glass_enabled boolean DEFAULT NULL,
  p_layout_mode text DEFAULT NULL,
  p_popups_disabled boolean DEFAULT NULL,
  p_transitions_disabled boolean DEFAULT NULL,
  p_snowfall_enabled boolean DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO user_profiles (
    user_id, display_name, avatar_url, theme_preset, custom_bg_type, custom_bg_url,
    glass_enabled, layout_mode, popups_disabled, transitions_disabled, snowfall_enabled
  ) VALUES (
    v_user_id,
    p_display_name,
    p_avatar_url,
    COALESCE(p_theme_preset, 'purple'),
    COALESCE(p_custom_bg_type, 'none'),
    COALESCE(p_custom_bg_url, ''),
    COALESCE(p_glass_enabled, true),
    COALESCE(p_layout_mode, 'grid'),
    COALESCE(p_popups_disabled, false),
    COALESCE(p_transitions_disabled, false),
    COALESCE(p_snowfall_enabled, true)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name        = COALESCE(p_display_name, user_profiles.display_name),
    avatar_url          = COALESCE(p_avatar_url, user_profiles.avatar_url),
    theme_preset        = COALESCE(p_theme_preset, user_profiles.theme_preset),
    custom_bg_type      = COALESCE(p_custom_bg_type, user_profiles.custom_bg_type),
    custom_bg_url       = COALESCE(p_custom_bg_url, user_profiles.custom_bg_url),
    glass_enabled       = COALESCE(p_glass_enabled, user_profiles.glass_enabled),
    layout_mode         = COALESCE(p_layout_mode, user_profiles.layout_mode),
    popups_disabled     = COALESCE(p_popups_disabled, user_profiles.popups_disabled),
    transitions_disabled= COALESCE(p_transitions_disabled, user_profiles.transitions_disabled),
    snowfall_enabled    = COALESCE(p_snowfall_enabled, user_profiles.snowfall_enabled),
    updated_at = now();
  RETURN TRUE;
END;
$$;