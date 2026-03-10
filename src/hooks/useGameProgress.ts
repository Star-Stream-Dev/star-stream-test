import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface GameProgress {
  id: string;
  user_id: string;
  game_id: string | null;
  game_url: string;
  game_title: string;
  play_time: number;
  last_played: string;
  custom_settings: Json;
  created_at: string;
  updated_at: string;
}

export function useGameProgress() {
  const { user, sessionToken } = useAuth();
  const [sessions, setSessions] = useState<GameProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load sessions from database on mount
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    const loadProgress = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('game_progress')
          .select('*')
          .eq('user_id', user.id)
          .order('last_played', { ascending: false });

        if (error) {
          console.error('Error loading game progress:', error);
          return;
        }

        setSessions((data || []) as GameProgress[]);
      } catch (e) {
        console.error('Error loading game progress:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();

    // Subscribe to realtime updates for cross-device sync
    const channel = supabase
      .channel('game_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_progress',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSessions((prev) => [payload.new as GameProgress, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === (payload.new as GameProgress).id
                  ? (payload.new as GameProgress)
                  : s
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setSessions((prev) =>
              prev.filter((s) => s.id !== (payload.old as GameProgress).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Start or update a game session
  const startGameSession = useCallback(
    async (gameUrl: string, gameTitle: string, gameId?: string) => {
      if (!user) return null;

      try {
        // Check if session already exists
        const existing = sessions.find((s) => s.game_url === gameUrl);

        if (existing) {
          // Update last played time
          const { data, error } = await supabase
            .rpc('start_game_session', {
              p_session_token: sessionToken!,
              p_game_url: gameUrl,
              p_game_title: gameTitle,
              p_game_id: gameId || null,
            });

          if (error) {
            console.error('Error updating game session:', error);
            return existing;
          }

          return (data as GameProgress[])?.[0] || existing;
        } else {
          // Create new session
          const { data, error } = await supabase
            .rpc('start_game_session', {
              p_session_token: sessionToken!,
              p_game_url: gameUrl,
              p_game_title: gameTitle,
              p_game_id: gameId || null,
            });

          if (error) {
            console.error('Error creating game session:', error);
            return null;
          }

          return (data as GameProgress[])?.[0] || null;
        }
      } catch (e) {
        console.error('Error in startGameSession:', e);
        return null;
      }
    },
    [user, sessions]
  );

  // Update play time for a game
  const updatePlayTime = useCallback(
    async (gameUrl: string, additionalSeconds: number) => {
      if (!user) return;

      const session = sessions.find((s) => s.game_url === gameUrl);
      if (!session) return;

      try {
        await supabase.rpc('update_game_play_time', {
          p_session_token: sessionToken!,
          p_game_url: gameUrl,
          p_additional_seconds: additionalSeconds,
        });
      } catch (e) {
        console.error('Error updating play time:', e);
      }
    },
    [user, sessions]
  );

  // Save custom settings for a game (keybindings, preferences, etc.)
  const saveGameSettings = useCallback(
    async (gameUrl: string, settings: Record<string, Json | undefined>) => {
      if (!user) return;

      const session = sessions.find((s) => s.game_url === gameUrl);
      if (!session) return;

      try {
        const existingSettings = (typeof session.custom_settings === 'object' && session.custom_settings !== null && !Array.isArray(session.custom_settings)) 
          ? session.custom_settings as Record<string, Json | undefined>
          : {};
        const mergedSettings = { ...existingSettings, ...settings };
        await supabase.rpc('save_game_settings', {
          p_session_token: sessionToken!,
          p_game_url: gameUrl,
          p_custom_settings: mergedSettings as any,
        });
      } catch (e) {
        console.error('Error saving game settings:', e);
      }
    },
    [user, sessions]
  );

  // Get settings for a specific game
  const getGameSettings = useCallback(
    (gameUrl: string): Json => {
      const session = sessions.find((s) => s.game_url === gameUrl);
      return session?.custom_settings || {};
    },
    [sessions]
  );

  // Get recently played games
  const getRecentlyPlayed = useCallback(
    (limit = 10) => {
      return sessions
        .sort(
          (a, b) =>
            new Date(b.last_played).getTime() - new Date(a.last_played).getTime()
        )
        .slice(0, limit);
    },
    [sessions]
  );

  // Get specific game session
  const getGameSession = useCallback(
    (gameUrl: string) => {
      return sessions.find((s) => s.game_url === gameUrl);
    },
    [sessions]
  );

  // Clear all game progress
  const clearProgress = useCallback(async () => {
    if (!user) return;

    try {
      await supabase.rpc('clear_my_game_progress', { p_session_token: sessionToken! });
      setSessions([]);
    } catch (e) {
      console.error('Error clearing progress:', e);
    }
  }, [user]);

  // Format play time for display
  const formatPlayTime = useCallback((seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }, []);

  return {
    sessions,
    isLoading,
    startGameSession,
    updatePlayTime,
    saveGameSettings,
    getGameSettings,
    getRecentlyPlayed,
    getGameSession,
    clearProgress,
    formatPlayTime,
  };
}
