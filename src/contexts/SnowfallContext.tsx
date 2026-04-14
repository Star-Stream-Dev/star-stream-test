import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SnowfallContextType {
  snowfallEnabled: boolean;
  setSnowfallEnabled: (enabled: boolean) => void;
}

const SnowfallContext = createContext<SnowfallContextType | undefined>(undefined);

const SNOWFALL_STORAGE_KEY = 'snowfall_enabled';

export function SnowfallProvider({ children }: { children: ReactNode }) {
  const { user, sessionToken } = useAuth();
  const [snowfallEnabled, setSnowfallEnabledState] = useState(true);

  useEffect(() => {
    const loadSnowfallPreference = async () => {
      if (user) {
        try {
          const { data } = await supabase
            .from('user_profiles')
            .select('snowfall_enabled')
            .eq('user_id', user.id)
            .single();

          const savedPreference = (data as { snowfall_enabled?: boolean | null } | null)?.snowfall_enabled;
          if (typeof savedPreference === 'boolean') {
            setSnowfallEnabledState(savedPreference);
            localStorage.setItem(`${SNOWFALL_STORAGE_KEY}_${user.id}`, String(savedPreference));
            return;
          }
        } catch {}
      }

      const userScopedKey = user ? `${SNOWFALL_STORAGE_KEY}_${user.id}` : SNOWFALL_STORAGE_KEY;
      const stored = localStorage.getItem(userScopedKey) ?? localStorage.getItem(SNOWFALL_STORAGE_KEY);
      setSnowfallEnabledState(stored !== null ? stored === 'true' : true);
    };

    void loadSnowfallPreference();
  }, [user]);

  const persistSnowfallPreference = useCallback(async (enabled: boolean) => {
    const storageKey = user ? `${SNOWFALL_STORAGE_KEY}_${user.id}` : SNOWFALL_STORAGE_KEY;
    localStorage.setItem(storageKey, String(enabled));

    if (user && sessionToken) {
      await supabase.rpc('update_my_profile', {
        p_session_token: sessionToken,
        p_snowfall_enabled: enabled,
      });
    }
  }, [user, sessionToken]);

  const setSnowfallEnabled = useCallback((enabled: boolean) => {
    setSnowfallEnabledState(enabled);
    void persistSnowfallPreference(enabled);
  }, [persistSnowfallPreference]);

  return (
    <SnowfallContext.Provider value={{ snowfallEnabled, setSnowfallEnabled }}>
      {children}
    </SnowfallContext.Provider>
  );
}

export function useSnowfall() {
  const context = useContext(SnowfallContext);
  if (context === undefined) {
    throw new Error('useSnowfall must be used within a SnowfallProvider');
  }
  return context;
}
