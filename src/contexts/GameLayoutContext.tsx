import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type GameLayoutMode = 'grid' | 'carousel';

interface GameLayoutContextType {
  layoutMode: GameLayoutMode;
  setLayoutMode: (mode: GameLayoutMode) => void;
  isLoading: boolean;
}

const GameLayoutContext = createContext<GameLayoutContextType | undefined>(undefined);

export function GameLayoutProvider({ children }: { children: ReactNode }) {
  const { user, sessionToken } = useAuth();
  const [layoutMode, setLayoutModeState] = useState<GameLayoutMode>('grid');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (user) {
        try {
          const { data } = await supabase
            .from('user_profiles')
            .select('layout_mode')
            .eq('user_id', user.id)
            .single();
          if (data?.layout_mode === 'carousel' || data?.layout_mode === 'grid') {
            setLayoutModeState(data.layout_mode as GameLayoutMode);
            setIsLoading(false);
            return;
          }
        } catch {}
      }
      const key = user ? `starstream_game_layout_${user.id}` : 'starstream_game_layout';
      const stored = localStorage.getItem(key);
      if (stored === 'carousel' || stored === 'grid') { setLayoutModeState(stored); }
      setIsLoading(false);
    };
    load();
  }, [user]);

  const setLayoutMode = useCallback((mode: GameLayoutMode) => {
    setLayoutModeState(mode);
    const key = user ? `starstream_game_layout_${user.id}` : 'starstream_game_layout';
    localStorage.setItem(key, mode);
    if (user && sessionToken) {
      supabase.rpc('update_my_profile', {
        p_session_token: sessionToken,
        p_layout_mode: mode,
      }).then();
    }
  }, [user, sessionToken]);

  return (
    <GameLayoutContext.Provider value={{ layoutMode, setLayoutMode, isLoading }}>
      {children}
    </GameLayoutContext.Provider>
  );
}

export function useGameLayout() {
  const context = useContext(GameLayoutContext);
  if (!context) { throw new Error('useGameLayout must be used within a GameLayoutProvider'); }
  return context;
}
