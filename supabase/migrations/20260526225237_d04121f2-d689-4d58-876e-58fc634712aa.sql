
ALTER TABLE public.desktop_customizations
  ADD COLUMN IF NOT EXISTS folders jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS desktop_theme text;

CREATE OR REPLACE FUNCTION public.upsert_my_desktop_customizations(
  p_session_token text,
  p_hidden_apps jsonb DEFAULT '[]'::jsonb,
  p_custom_icons jsonb DEFAULT '{}'::jsonb,
  p_custom_names jsonb DEFAULT '{}'::jsonb,
  p_icon_positions jsonb DEFAULT '{}'::jsonb,
  p_folders jsonb DEFAULT NULL,
  p_desktop_theme text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO desktop_customizations (
    user_id, hidden_apps, custom_icons, custom_names, icon_positions, folders, desktop_theme, updated_at
  )
  VALUES (
    v_user_id::text,
    p_hidden_apps,
    p_custom_icons,
    p_custom_names,
    p_icon_positions,
    COALESCE(p_folders, '{}'::jsonb),
    p_desktop_theme,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    hidden_apps = EXCLUDED.hidden_apps,
    custom_icons = EXCLUDED.custom_icons,
    custom_names = EXCLUDED.custom_names,
    icon_positions = EXCLUDED.icon_positions,
    folders = COALESCE(EXCLUDED.folders, desktop_customizations.folders),
    desktop_theme = COALESCE(EXCLUDED.desktop_theme, desktop_customizations.desktop_theme),
    updated_at = now();
  RETURN TRUE;
END;
$function$;
