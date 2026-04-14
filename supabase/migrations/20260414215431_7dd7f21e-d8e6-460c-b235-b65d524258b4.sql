ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS snowfall_enabled boolean DEFAULT true;

UPDATE public.user_profiles
SET snowfall_enabled = true
WHERE snowfall_enabled IS NULL;

CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_session_token text,
  p_display_name text DEFAULT NULL::text,
  p_avatar_url text DEFAULT NULL::text,
  p_theme_preset text DEFAULT 'purple'::text,
  p_custom_bg_type text DEFAULT 'none'::text,
  p_custom_bg_url text DEFAULT ''::text,
  p_glass_enabled boolean DEFAULT true,
  p_layout_mode text DEFAULT 'grid'::text,
  p_popups_disabled boolean DEFAULT false,
  p_transitions_disabled boolean DEFAULT false,
  p_snowfall_enabled boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO user_profiles (
    user_id,
    display_name,
    avatar_url,
    theme_preset,
    custom_bg_type,
    custom_bg_url,
    glass_enabled,
    layout_mode,
    popups_disabled,
    transitions_disabled,
    snowfall_enabled
  )
  VALUES (
    v_user_id,
    p_display_name,
    p_avatar_url,
    p_theme_preset,
    p_custom_bg_type,
    p_custom_bg_url,
    p_glass_enabled,
    p_layout_mode,
    p_popups_disabled,
    p_transitions_disabled,
    p_snowfall_enabled
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    theme_preset = EXCLUDED.theme_preset,
    custom_bg_type = EXCLUDED.custom_bg_type,
    custom_bg_url = EXCLUDED.custom_bg_url,
    glass_enabled = EXCLUDED.glass_enabled,
    layout_mode = EXCLUDED.layout_mode,
    popups_disabled = EXCLUDED.popups_disabled,
    transitions_disabled = EXCLUDED.transitions_disabled,
    snowfall_enabled = EXCLUDED.snowfall_enabled,
    updated_at = now();
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_session_token text,
  p_display_name text DEFAULT NULL::text,
  p_avatar_url text DEFAULT NULL::text,
  p_theme_preset text DEFAULT NULL::text,
  p_custom_bg_type text DEFAULT NULL::text,
  p_custom_bg_url text DEFAULT NULL::text,
  p_glass_enabled boolean DEFAULT NULL::boolean,
  p_layout_mode text DEFAULT NULL::text,
  p_popups_disabled boolean DEFAULT NULL::boolean,
  p_transitions_disabled boolean DEFAULT NULL::boolean,
  p_snowfall_enabled boolean DEFAULT NULL::boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO user_profiles (
    user_id,
    display_name,
    avatar_url,
    theme_preset,
    custom_bg_type,
    custom_bg_url,
    glass_enabled,
    layout_mode,
    popups_disabled,
    transitions_disabled,
    snowfall_enabled
  )
  VALUES (
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
    display_name = COALESCE(p_display_name, user_profiles.display_name),
    avatar_url = COALESCE(p_avatar_url, user_profiles.avatar_url),
    theme_preset = COALESCE(p_theme_preset, user_profiles.theme_preset),
    custom_bg_type = COALESCE(p_custom_bg_type, user_profiles.custom_bg_type),
    custom_bg_url = COALESCE(p_custom_bg_url, user_profiles.custom_bg_url),
    glass_enabled = COALESCE(p_glass_enabled, user_profiles.glass_enabled),
    layout_mode = COALESCE(p_layout_mode, user_profiles.layout_mode),
    popups_disabled = COALESCE(p_popups_disabled, user_profiles.popups_disabled),
    transitions_disabled = COALESCE(p_transitions_disabled, user_profiles.transitions_disabled),
    snowfall_enabled = COALESCE(p_snowfall_enabled, user_profiles.snowfall_enabled),
    updated_at = now();
  RETURN TRUE;
END;
$function$;