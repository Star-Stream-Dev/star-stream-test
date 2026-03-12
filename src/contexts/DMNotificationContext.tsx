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
  // Fetch mute settings
  useEffect(() => {
    if (!user) return;
    
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

          // Check if sender is muted
          const isMuted = muteSettings.some(m => 
            m.muted_user_id === newDm.sender_id && 
            (!m.mute_until || new Date(m.mute_until) > new Date())
          );
          
          if (isMuted) return;

          // Show notification
          setNotification({
            id: newDm.id,
            senderId: newDm.sender_id,
            senderUsername: newDm.sender_username,
            message: newDm.message,
            timestamp: new Date(),
          });
          setIsReplying(false);
          setReplyMessage('');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, muteSettings]);

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
