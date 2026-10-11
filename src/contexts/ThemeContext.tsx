import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ThemePreset = 'purple' | 'blue' | 'green' | 'red' | 'orange' | 'pink' | 'cyan' | 'midnight';

export interface CustomBackground {
  type: 'none' | 'image' | 'video';
  url: string;
}

interface ThemeColors {
  primary: string;
  primaryHue: number;
  secondary: string;
  secondaryHue: number;
  accent: string;
  accentHue: number;
}

const THEME_PRESETS: Record<ThemePreset, ThemeColors> = {
  purple: { primary: '270 70% 50%', primaryHue: 270, secondary: '330 70% 50%', secondaryHue: 330, accent: '330 70% 50%', accentHue: 330 },
  blue: { primary: '220 70% 50%', primaryHue: 220, secondary: '260 70% 50%', secondaryHue: 260, accent: '260 70% 50%', accentHue: 260 },
  green: { primary: '150 70% 40%', primaryHue: 150, secondary: '180 70% 45%', secondaryHue: 180, accent: '180 70% 45%', accentHue: 180 },
  red: { primary: '0 70% 50%', primaryHue: 0, secondary: '330 70% 50%', secondaryHue: 330, accent: '330 70% 50%', accentHue: 330 },
  orange: { primary: '25 95% 53%', primaryHue: 25, secondary: '45 95% 55%', secondaryHue: 45, accent: '45 95% 55%', accentHue: 45 },
  pink: { primary: '330 70% 55%', primaryHue: 330, secondary: '280 70% 55%', secondaryHue: 280, accent: '280 70% 55%', accentHue: 280 },
  cyan: { primary: '185 70% 45%', primaryHue: 185, secondary: '200 70% 50%', secondaryHue: 200, accent: '200 70% 50%', accentHue: 200 },
  midnight: { primary: '240 50% 45%', primaryHue: 240, secondary: '260 50% 40%', secondaryHue: 260, accent: '260 50% 40%', accentHue: 260 },
};

interface ThemeContextType {
  currentTheme: ThemePreset;
  setCurrentTheme: (theme: ThemePreset) => void;
  customBackground: CustomBackground;
  setCustomBackground: (bg: CustomBackground) => void;
  glassEnabled: boolean;
  setGlassEnabled: (enabled: boolean) => void;
  themePresets: typeof THEME_PRESETS;
  isLoading: boolean;
  primaryColor: string;
  accentColor: string;
  setPrimaryColor: (color: string) => void;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, sessionToken } = useAuth();
  const [currentTheme, setCurrentThemeState] = useState<ThemePreset>('blue');
  const [customBackground, setCustomBackgroundState] = useState<CustomBackground>({ type: 'none', url: '' });
  const [glassEnabled, setGlassEnabledState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const colorKey = `starstream_colors_${user?.id ?? 'guest'}`;
  const [customColors, setCustomColors] = useState<{ primary?: string; accent?: string }>({});

  useEffect(() => {
    const load = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(colorKey) || '{}');
        const valid = (value: unknown): value is string => typeof value === 'string' && /^\d{1,3} \d{1,3}% \d{1,3}%$/.test(value);
        setCustomColors({ primary: valid(stored.primary) ? stored.primary : undefined, accent: valid(stored.accent) ? stored.accent : undefined });
      } catch { setCustomColors({}); }
    };
    load();
    const onStorage = (event: StorageEvent) => { if (event.key === colorKey) load(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [colorKey]);

  const setColor = (role: 'primary' | 'accent', color: string) => {
    setCustomColors(previous => {
      const next = { ...previous, [role]: color };
      localStorage.setItem(colorKey, JSON.stringify(next));
      return next;
    });
  };

  const loadUserTheme = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('theme_preset, custom_bg_type, custom_bg_url, glass_enabled')
        .eq('user_id', user.id)
        .single();
      if (data) {
        if (data.theme_preset && THEME_PRESETS[data.theme_preset as ThemePreset]) {
          setCurrentThemeState(data.theme_preset as ThemePreset);
        }
        if (data.custom_bg_type) {
          setCustomBackgroundState({ type: data.custom_bg_type as 'none' | 'image' | 'video', url: data.custom_bg_url || '' });
        }
        if (data.glass_enabled !== null) { setGlassEnabledState(data.glass_enabled); }
      }
    } catch (error) { console.error('Error loading theme settings:', error); }
    finally { setIsLoading(false); setHasLoaded(true); }
  }, [user]);

  useEffect(() => { loadUserTheme(); }, [loadUserTheme]);

  const saveThemeSettings = useCallback(async (theme: ThemePreset, bg: CustomBackground, glass: boolean) => {
    if (!user || !hasLoaded || !sessionToken) return;
    try {
      await supabase.rpc('upsert_my_profile', {
        p_session_token: sessionToken,
        p_theme_preset: theme,
        p_custom_bg_type: bg.type,
        p_custom_bg_url: bg.url,
        p_glass_enabled: glass,
      });
    } catch (error) { console.error('Error saving theme settings:', error); }
  }, [user, hasLoaded, sessionToken]);

  const setCurrentTheme = useCallback((theme: ThemePreset) => {
    setCustomColors({});
    localStorage.removeItem(colorKey);
    setCurrentThemeState(theme);
    saveThemeSettings(theme, customBackground, glassEnabled);
  }, [customBackground, glassEnabled, saveThemeSettings, colorKey]);

  const setCustomBackground = useCallback((bg: CustomBackground) => {
    setCustomBackgroundState(bg);
    saveThemeSettings(currentTheme, bg, glassEnabled);
  }, [currentTheme, glassEnabled, saveThemeSettings]);

  const setGlassEnabled = useCallback((enabled: boolean) => {
    setGlassEnabledState(enabled);
    saveThemeSettings(currentTheme, customBackground, enabled);
  }, [currentTheme, customBackground, saveThemeSettings]);

  useEffect(() => {
    const preset = THEME_PRESETS[currentTheme];
    const colors = {
      ...preset,
      primary: customColors.primary ?? preset.primary,
      primaryHue: customColors.primary ? parseFloat(customColors.primary) : preset.primaryHue,
      secondary: customColors.accent ?? preset.secondary,
      secondaryHue: customColors.accent ? parseFloat(customColors.accent) : preset.secondaryHue,
      accent: customColors.accent ?? preset.accent,
    };
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--ring', colors.primary);
    root.style.setProperty('--card', `${colors.primaryHue} 50% 8%`);
    root.style.setProperty('--popover', `${colors.primaryHue} 50% 8%`);
    root.style.setProperty('--muted', `${colors.primaryHue} 30% 20%`);
    root.style.setProperty('--muted-foreground', `${colors.primaryHue} 10% 60%`);
    root.style.setProperty('--border', `${colors.primaryHue} 50% 30%`);
    root.style.setProperty('--input', `${colors.primaryHue} 50% 20%`);
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${colors.primary}), hsl(${colors.secondary}))`);
    root.style.setProperty('--gradient-hero', `linear-gradient(to right, hsl(${colors.primaryHue}, 70%, 60%), hsl(${colors.secondaryHue}, 70%, 55%), hsl(${colors.primaryHue}, 70%, 55%))`);
    root.style.setProperty('--gradient-card', `linear-gradient(to bottom right, hsl(${colors.primaryHue}, 50%, 15%, 0.5), hsl(0, 0%, 0%))`);
    root.style.setProperty('--gradient-bg', `linear-gradient(to bottom right, hsl(${colors.primaryHue}, 50%, 15%, 0.2), hsl(0, 0%, 0%), hsl(${colors.secondaryHue}, 50%, 15%, 0.2))`);
    root.style.setProperty('--shadow-glow', `0 0 40px hsl(${colors.primary} / 0.4)`);
    root.style.setProperty('--shadow-card', `0 25px 50px -12px hsl(${colors.primary} / 0.5)`);
  }, [currentTheme, customColors]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, customBackground, setCustomBackground, glassEnabled, setGlassEnabled, themePresets: THEME_PRESETS, isLoading, primaryColor: customColors.primary ?? THEME_PRESETS[currentTheme].primary, accentColor: customColors.accent ?? THEME_PRESETS[currentTheme].accent, setPrimaryColor: color => setColor('primary', color), setAccentColor: color => setColor('accent', color) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) { throw new Error('useTheme must be used within a ThemeProvider'); }
  return context;
}
