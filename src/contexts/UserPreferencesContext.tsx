import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserPreferencesContextType {
  popupsDisabled: boolean;
  setPopupsDisabled: (disabled: boolean) => void;
  transitionsDisabled: boolean;
  setTransitionsDisabled: (disabled: boolean) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user, sessionToken, isLoading: authLoading } = useAuth();
  const [popupsDisabled, setPopupsDisabledState] = useState(false);
  const [transitionsDisabled, setTransitionsDisabledState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const applyStoredPreferences = useCallback((key: string) => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return false;
      const prefs = JSON.parse(stored);
      if (typeof prefs.popupsDisabled === 'boolean') setPopupsDisabledState(prefs.popupsDisabled);
      if (typeof prefs.transitionsDisabled === 'boolean') setTransitionsDisabledState(prefs.transitionsDisabled);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Load preferences from DB if logged in, else localStorage
  useEffect(() => {
    if (authLoading) return;

    const load = async () => {
      const key = user ? `solarnova_prefs_${user.id}` : 'solarnova_prefs';
      applyStoredPreferences(key);

      if (user) {
        try {
          const { data } = await supabase
            .from('user_profiles')
            .select('popups_disabled, transitions_disabled')
            .eq('user_id', user.id)
            .single();

          if (data) {
            setPopupsDisabledState(data.popups_disabled ?? false);
            setTransitionsDisabledState(data.transitions_disabled ?? false);
            localStorage.setItem(key, JSON.stringify({
              popupsDisabled: data.popups_disabled ?? false,
              transitionsDisabled: data.transitions_disabled ?? false,
            }));
            setLoaded(true);
            return;
          }
        } catch {}
      }

      // Fallback to localStorage
      applyStoredPreferences(key);
      setLoaded(true);
    };
    
    setLoaded(false);
    load();
  }, [applyStoredPreferences, authLoading, user]);

  // Apply/remove transitions class on body
  useEffect(() => {
    if (transitionsDisabled) {
      document.documentElement.classList.add('no-transitions');
    } else {
      document.documentElement.classList.remove('no-transitions');
    }
  }, [transitionsDisabled]);

  const saveToDb = useCallback(async (popups: boolean, transitions: boolean) => {
    const key = user ? `solarnova_prefs_${user.id}` : 'solarnova_prefs';
    localStorage.setItem(key, JSON.stringify({ popupsDisabled: popups, transitionsDisabled: transitions }));

    if (user && sessionToken) {
      await supabase.rpc('upsert_my_profile', {
        p_session_token: sessionToken,
        p_popups_disabled: popups,
        p_transitions_disabled: transitions,
      });
    }
  }, [user, sessionToken]);

  const setPopupsDisabled = useCallback((disabled: boolean) => {
    setPopupsDisabledState(disabled);
    saveToDb(disabled, transitionsDisabled);
  }, [saveToDb, transitionsDisabled]);

  const setTransitionsDisabled = useCallback((disabled: boolean) => {
    setTransitionsDisabledState(disabled);
    saveToDb(popupsDisabled, disabled);
  }, [saveToDb, popupsDisabled]);

  return (
    <UserPreferencesContext.Provider value={{ popupsDisabled, setPopupsDisabled, transitionsDisabled, setTransitionsDisabled }}>
      {authLoading || !loaded ? null : children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}
