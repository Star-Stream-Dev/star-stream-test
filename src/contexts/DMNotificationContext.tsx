import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface DMNotification {
  id: string;
  senderId: string;
  senderUsername: string;
  message: string;
  timestamp: Date;
}

interface DMNotificationContextType {
  notification: DMNotification | null;
  isReplying: boolean;
  replyMessage: string;
  setReplyMessage: (msg: string) => void;
  openReply: () => void;
  closeReply: () => void;
  sendReply: () => Promise<void>;
  dismissNotification: () => void;
}

const DMNotificationContext = createContext<DMNotificationContextType | undefined>(undefined);

interface MuteSetting {
  muted_user_id: string;
  mute_until: string | null;
}

export function DMNotificationProvider({ children }: { children: ReactNode }) {
  const { user, sessionToken } = useAuth();
  const [notification, setNotification] = useState<DMNotification | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [muteSettings, setMuteSettings] = useState<MuteSetting[]>([]);
  const muteSettingsRef = useRef<MuteSetting[]>([]);
  const shownNotificationIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    muteSettingsRef.current = muteSettings;
  }, [muteSettings]);

  useEffect(() => {
    shownNotificationIdsRef.current.clear();
  }, [user?.id]);

  // Fetch mute settings
  useEffect(() => {
    if (!user) {
      setMuteSettings([]);
      return;
    }
    
    const fetchMuteSettings = async () => {
      const { data } = await supabase
        .from('notification_settings')
        .select('muted_user_id, mute_until')
        .eq('user_id', user.id);
      setMuteSettings(data || []);
    };

    fetchMuteSettings();

    // Refresh mute settings periodically
    const interval = setInterval(fetchMuteSettings, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const isSenderMuted = useCallback((senderId: string) => {
    return muteSettingsRef.current.some(m =>
      m.muted_user_id === senderId && (!m.mute_until || new Date(m.mute_until) > new Date())
    );
  }, []);

  const showNotificationForDm = useCallback((dm: {
    id: string;
    sender_id: string;
    sender_username: string;
    message: string;
  }) => {
    if (shownNotificationIdsRef.current.has(dm.id)) return;
    if (isSenderMuted(dm.sender_id)) return;

    shownNotificationIdsRef.current.add(dm.id);
    setNotification({
      id: dm.id,
      senderId: dm.sender_id,
      senderUsername: dm.sender_username,
      message: dm.message,
      timestamp: new Date(),
    });
    setIsReplying(false);
    setReplyMessage('');
  }, [isSenderMuted]);

  // Subscribe to DMs
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-dm-notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'direct_messages' }, 
        (payload) => {
          const newDm = payload.new as {
            id: string;
            sender_id: string;
            sender_username: string;
            receiver_id: string;
            message: string;
          };

          // Only show notification if we're the receiver
          if (newDm.receiver_id !== user.id) return;
          showNotificationForDm(newDm);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, showNotificationForDm]);

  // Poll unread DMs as a fallback for missed realtime events
  useEffect(() => {
    if (!user || !sessionToken) return;

    let isMounted = true;

    const pollUnreadDms = async () => {
      const { data, error } = await supabase.rpc('get_my_unread_dms', {
        p_session_token: sessionToken,
      });

      if (!isMounted || error || !data || data.length === 0) return;

      for (const dm of data) {
        if (dm.receiver_id === user.id) {
          showNotificationForDm(dm);
          break;
        }
      }
    };

    pollUnreadDms();
    const intervalId = setInterval(pollUnreadDms, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [user, sessionToken, showNotificationForDm]);

  // Auto-dismiss notification after 5 seconds (unless replying)
  useEffect(() => {
    if (!notification || isReplying) return;

    const timeout = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [notification, isReplying]);

  const dismissNotification = useCallback(() => {
    setNotification(null);
    setIsReplying(false);
    setReplyMessage('');
  }, []);

  const openReply = useCallback(() => {
    setIsReplying(true);
  }, []);

  const closeReply = useCallback(() => {
    setIsReplying(false);
    setReplyMessage('');
  }, []);

  const sendReply = useCallback(async () => {
    if (!user || !notification || !replyMessage.trim()) return;

    await supabase.from('direct_messages').insert({
      sender_id: user.id,
      sender_username: user.username,
      receiver_id: notification.senderId,
      receiver_username: notification.senderUsername,
      message: replyMessage.trim(),
    });

    setReplyMessage('');
    setIsReplying(false);
    setNotification(null);
  }, [user, notification, replyMessage]);

  return (
    <DMNotificationContext.Provider
      value={{
        notification,
        isReplying,
        replyMessage,
        setReplyMessage,
        openReply,
        closeReply,
        sendReply,
        dismissNotification,
      }}
    >
      {children}
    </DMNotificationContext.Provider>
  );
}

export function useDMNotification() {
  const context = useContext(DMNotificationContext);
  if (context === undefined) {
    throw new Error('useDMNotification must be used within a DMNotificationProvider');
  }
  return context;
}
