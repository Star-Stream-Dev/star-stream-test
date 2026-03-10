import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface OnlineUser {
  id: string;
  username: string;
  online_at: string;
}

interface UserStatus {
  user_id: string;
  last_seen: string;
  is_online: boolean;
}

interface PresenceContextType {
  onlineUsers: OnlineUser[];
  isUserOnline: (userId: string) => boolean;
  getLastSeen: (userId: string) => Promise<string | null>;
  formatLastSeen: (lastSeen: string | null) => string;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user, sessionToken } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [statusCache, setStatusCache] = useState<Map<string, UserStatus>>(new Map());
  const previousOnlineRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Update user status in database
  const updateUserStatus = useCallback(async (userId: string, isOnline: boolean) => {
    const { error } = await supabase.rpc('upsert_my_status', {
      p_session_token: sessionToken!,
      p_is_online: isOnline,
    });

    if (error) {
      console.error('Error updating user status:', error);
    }
  }, []);

  // Fetch friends list
  useEffect(() => {
    if (!user) {
      setFriends([]);
      return;
    }

    const fetchFriends = async () => {
      const { data } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (data) {
        const friendIds = data.map((f) =>
          f.user_id === user.id ? f.friend_id : f.user_id
        );
        setFriends(friendIds);
      }
    };

    fetchFriends();

    // Subscribe to friendship changes
    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => fetchFriends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Track presence
  useEffect(() => {
    if (!user) {
      // Clean up if user logs out
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setOnlineUsers([]);
      previousOnlineRef.current = new Set();
      return;
    }

    // Set user as online
    updateUserStatus(user.id, true);

    // Handle page close/refresh - set user as offline
    const handleBeforeUnload = () => {
      // Use RPC via fetch for reliable delivery on page unload
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/upsert_my_status`;
      const body = JSON.stringify({ p_caller_id: user.id, p_is_online: false });
      navigator.sendBeacon?.(
        url,
        new Blob([body], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];

        Object.entries(state).forEach(([, presences]) => {
          const presenceArray = presences as Array<{ id: string; username: string; online_at: string; presence_ref: string }>;
          const presence = presenceArray[0];
          if (presence && presence.id) {
            users.push({
              id: presence.id,
              username: presence.username,
              online_at: presence.online_at,
            });
          }
        });

        // Check for newly online friends
        const currentOnline = new Set(users.map((u) => u.id));
        const previousOnline = previousOnlineRef.current;

        users.forEach((onlineUser) => {
          // If this user wasn't online before, and they're a friend, show notification
          if (
            !previousOnline.has(onlineUser.id) &&
            friends.includes(onlineUser.id) &&
            onlineUser.id !== user.id
          ) {
            toast.custom(
              () => (
                <div className="flex items-center gap-3 bg-background border border-border/50 rounded-lg px-4 py-3 shadow-lg">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {onlineUser.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {onlineUser.username}
                    </p>
                    <p className="text-xs text-muted-foreground">is now online!</p>
                  </div>
                </div>
              ),
              {
                duration: 4000,
                position: 'bottom-right',
              }
            );
          }
        });

        previousOnlineRef.current = currentOnline;
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
        // Update last seen for users who left
        const leftUsers = leftPresences as Array<{ id?: string; presence_ref: string }>;
        leftUsers.forEach((leftUser) => {
          if (leftUser.id) {
            updateUserStatus(leftUser.id, false);
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id,
            username: user.username,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      // Set offline when component unmounts
      updateUserStatus(user.id, false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, friends, updateUserStatus]);

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.some((u) => u.id === userId);
  };

  const getLastSeen = useCallback(async (userId: string): Promise<string | null> => {
    // Check cache first
    const cached = statusCache.get(userId);
    if (cached) {
      return cached.last_seen;
    }

    const { data } = await supabase
      .from('user_status')
      .select('user_id, last_seen, is_online')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setStatusCache((prev) => new Map(prev).set(userId, data));
      return data.last_seen;
    }

    return null;
  }, [statusCache]);

  const formatLastSeen = useCallback((lastSeen: string | null): string => {
    if (!lastSeen) {
      return 'Never seen';
    }

    try {
      return `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`;
    } catch {
      return 'Last seen recently';
    }
  }, []);

  return (
    <PresenceContext.Provider value={{ onlineUsers, isUserOnline, getLastSeen, formatLastSeen }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
}
