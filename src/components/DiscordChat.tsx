import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Users, MessageSquare, Hash, UserPlus, Bell, BellOff, Ban, Check, X, ChevronDown, ArrowLeft, Circle, Smile, Image as ImageIcon, Settings, Reply, XCircle, Trash2, Pin, PinOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePresence } from '@/contexts/PresenceContext';
import { censorText } from '@/lib/profanityFilter';
import { parseEmojis, isGifUrl, extractGifUrl } from '@/lib/emojiParser';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { GifPicker } from '@/components/chat/GifPicker';
import { EmojiAutocomplete } from '@/components/chat/EmojiAutocomplete';
import { MessageReactions } from '@/components/chat/MessageReactions';
import { UserSettings } from '@/components/chat/UserSettings';
import solarnovaIcon from '@/assets/solarnova-icon.png';

interface DiscordChatProps {
  onClose?: () => void;
}

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
  reply_to_id?: string | null;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  sender_username: string;
  receiver_id: string;
  receiver_username: string;
  message: string;
  read: boolean;
  created_at: string;
  reply_to_id?: string | null;
}

interface AppUser {
  id: string;
  username: string;
  created_at: string;
}

interface FriendRequest {
  id: string;
  from_user_id: string;
  from_username: string;
  to_user_id: string;
  to_username: string;
  status: string;
  created_at: string;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
}

interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
}

interface MuteSetting {
  id: string;
  user_id: string;
  muted_user_id: string;
  mute_until: string | null;
}

interface UserPresence {
  id: string;
  online_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface FriendNickname {
  id: string;
  user_id: string;
  friend_id: string;
  nickname: string;
}

type ChatView = 'server' | 'friends' | 'dm';

export function DiscordChat({ onClose }: DiscordChatProps) {
  const { user, sessionToken } = useAuth();
  const [view, setView] = useState<ChatView>('server');
  const [selectedDmUser, setSelectedDmUser] = useState<AppUser | null>(null);
  
  // Server chat
  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  
  // DM
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  
  // Friends system
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [muteSettings, setMuteSettings] = useState<MuteSetting[]>([]);
  
  // Online presence tracking - use context
  const { onlineUsers: presenceOnlineUsers, isUserOnline } = usePresence();
  const onlineUsers = useMemo(() => {
    return new Set(presenceOnlineUsers.map(u => u.id));
  }, [presenceOnlineUsers]);
  
  // Notifications
  const [showNotification, setShowNotification] = useState<FriendRequest | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showMuteDialog, setShowMuteDialog] = useState<string | null>(null);
  
  // Profiles and nicknames
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [nicknames, setNicknames] = useState<FriendNickname[]>([]);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [pinnedMessages, setPinnedMessages] = useState<Array<{ id: string; message_id: string; message_text: string; message_username: string; pinned_by: string; channel_id: string }>>([]);
  const [showPinned, setShowPinned] = useState(false);
  
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Record<string, { users: string[]; usernames: string[] }>>>({});
  const [replyingTo, setReplyingTo] = useState<Message | DirectMessage | null>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, { username: string; location: string }>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Close reaction picker on outside click
  useEffect(() => {
    if (!reactionPickerMsgId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-reaction-picker]')) {
        setReactionPickerMsgId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [reactionPickerMsgId]);


  const emojiAutocompleteQuery = useMemo(() => {
    const match = newMessage.match(/:([a-zA-Z0-9_+-]*)$/);
    return match ? match[1] : null;
  }, [newMessage]);

  const handleEmojiAutocomplete = (emoji: string, code: string) => {
    setNewMessage(prev => prev.replace(/:([a-zA-Z0-9_+-]*)$/, emoji));
  };

  // Typing indicator - broadcast when typing
  const broadcastTyping = () => {
    if (!user || !typingChannelRef.current) return;
    
    const location = view === 'server' ? 'server' : (selectedDmUser?.id || 'unknown');
    
    typingChannelRef.current.track({
      user_id: user.id,
      username: user.username,
      location,
      typing_at: new Date().toISOString(),
    });

    // Clear typing status after 3 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      typingChannelRef.current?.untrack();
    }, 3000);
  };

  // Setup typing channel
  useEffect(() => {
    if (!user) return;

    const typingChannel = supabase.channel('typing-indicators', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const newTypingUsers = new Map<string, { username: string; location: string }>();
        
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== user.id && presences.length > 0) {
            const presence = presences[0] as unknown as { username: string; location: string };
            if (presence.username && presence.location) {
              newTypingUsers.set(key, {
                username: presence.username,
                location: presence.location,
              });
            }
          }
        });
        
        setTypingUsers(newTypingUsers);
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(typingChannel);
    };
  }, [user]);

  // Presence tracking now handled by PresenceContext

  // Fetch all data on mount
  useEffect(() => {
    if (!user) return;
    
    fetchServerMessages();
    fetchAllUsers();
    fetchFriendRequests();
    fetchFriendships();
    fetchBlocks();
    fetchMuteSettings();
    fetchReactions();
    fetchProfiles();
    fetchNicknames();
    fetchAdminUsers();
    fetchPinnedMessages();
    
    // Subscribe to server messages
    const serverChannel = supabase
      .channel('server-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        setServerMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    
    // Subscribe to DMs - only add to dmMessages if it's for the currently selected conversation
    const dmChannel = supabase
      .channel('direct-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const newDm = payload.new as DirectMessage;
        if (newDm.receiver_id === user.id || newDm.sender_id === user.id) {
          // Only add to displayed messages if this DM is with the currently selected user
          setDmMessages(prev => {
            // Determine the other user in this DM
            const otherUserId = newDm.sender_id === user.id ? newDm.receiver_id : newDm.sender_id;
            
            // Check if we should add this message (only if it's from/to the selected user)
            // We check the existing messages to see which conversation is active
            if (prev.length === 0) return prev;
            
            const currentConversationUserId = prev[0].sender_id === user.id 
              ? prev[0].receiver_id 
              : prev[0].sender_id;
            
            if (otherUserId === currentConversationUserId) {
              // Prevent duplicates
              if (prev.some(m => m.id === newDm.id)) return prev;
              return [...prev, newDm];
            }
            return prev;
          });
          
          // Show notification if not muted
          if (newDm.sender_id !== user.id) {
            const isMuted = muteSettings.some(m => 
              m.muted_user_id === newDm.sender_id && 
              (!m.mute_until || new Date(m.mute_until) > new Date())
            );
            if (!isMuted) {
              setUnreadCounts(prev => ({
                ...prev,
                [newDm.sender_id]: (prev[newDm.sender_id] || 0) + 1
              }));
            }
          }
        }
      })
      .subscribe();
    
    // Subscribe to friend requests
    const frChannel = supabase
      .channel('friend-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_requests' }, (payload) => {
        const newRequest = payload.new as FriendRequest;
        if (newRequest.to_user_id === user.id && newRequest.status === 'pending') {
          setShowNotification(newRequest);
          setFriendRequests(prev => [...prev, newRequest]);
        }
      })
      .subscribe();

    // Subscribe to reactions
    const reactionsChannel = supabase
      .channel('message-reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        fetchReactions();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(serverChannel);
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(frChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [user]);

  // Track previous message counts to only scroll on new messages
  const prevServerMessagesCount = useRef(serverMessages.length);
  const prevDmMessagesCount = useRef(dmMessages.length);

  // Scroll to bottom only when new messages arrive
  useEffect(() => {
    if (serverMessages.length > prevServerMessagesCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevServerMessagesCount.current = serverMessages.length;
  }, [serverMessages.length]);

  useEffect(() => {
    if (dmMessages.length > prevDmMessagesCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevDmMessagesCount.current = dmMessages.length;
  }, [dmMessages.length]);

  const fetchServerMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);
    setServerMessages(data || []);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase.rpc('get_all_app_users');
    setAllUsers(data || []);
  };

  const fetchFriendRequests = async () => {
    const { data } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`);
    setFriendRequests(data || []);
  };

  const fetchFriendships = async () => {
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`);
    setFriendships(data || []);
  };

  const fetchBlocks = async () => {
    const { data } = await supabase.from('user_blocks').select('*');
    setBlocks(data || []);
  };

  const fetchMuteSettings = async () => {
    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user?.id);
    setMuteSettings(data || []);
  };

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('message_reactions')
      .select('*');
    
    // Group reactions by message_id and emoji
    const grouped: Record<string, Record<string, { users: string[]; usernames: string[] }>> = {};
    
    for (const reaction of data || []) {
      if (!grouped[reaction.message_id]) {
        grouped[reaction.message_id] = {};
      }
      if (!grouped[reaction.message_id][reaction.emoji]) {
        grouped[reaction.message_id][reaction.emoji] = { users: [], usernames: [] };
      }
      grouped[reaction.message_id][reaction.emoji].users.push(reaction.user_id);
      grouped[reaction.message_id][reaction.emoji].usernames.push(reaction.username);
    }
    
    setReactions(grouped);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('user_profiles').select('*');
    setProfiles(data || []);
  };

  const fetchNicknames = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friend_nicknames')
      .select('*')
      .eq('user_id', user.id);
    setNicknames(data || []);
  };

  const fetchAdminUsers = async () => {
    const { data: users } = await supabase.rpc('get_all_app_users');
    if (!users) return;
    const adminIds = new Set<string>();
    for (const u of users as Array<{ id: string; username: string }>) {
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: u.id, _role: 'admin' });
      if (isAdmin) adminIds.add(u.id);
    }
    setAdminUserIds(adminIds);
  };

  const fetchPinnedMessages = async () => {
    const { data } = await supabase.from('pinned_messages').select('*').order('pinned_at', { ascending: false });
    setPinnedMessages(data || []);
  };

  const pinMessage = async (msgId: string, msgText: string, msgUsername: string, channelId: string) => {
    if (!user || user.role !== 'admin') return;
    await supabase.from('pinned_messages').upsert({
      message_id: msgId,
      message_type: channelId === 'general' ? 'server' : 'dm',
      channel_id: channelId,
      message_text: msgText,
      message_username: msgUsername,
      pinned_by: user.username,
    }, { onConflict: 'message_id,channel_id' });
    fetchPinnedMessages();
  };

  const unpinMessage = async (msgId: string, channelId: string) => {
    if (!user || user.role !== 'admin') return;
    await supabase.from('pinned_messages').delete().eq('message_id', msgId).eq('channel_id', channelId);
    fetchPinnedMessages();
  };

  const isMessagePinned = (msgId: string, channelId: string) => {
    return pinnedMessages.some(p => p.message_id === msgId && p.channel_id === channelId);
  };

  const isAdminUser = (userId: string) => adminUserIds.has(userId);

  const getDisplayName = (userId: string, username: string) => {
    // First check for nickname (user-specific)

    const nickname = nicknames.find(n => n.friend_id === userId);
    if (nickname) return nickname.nickname;
    
    // Then check for display name from profile
    const profile = profiles.find(p => p.user_id === userId);
    if (profile?.display_name) return profile.display_name;
    
    // Fallback to username
    return username;
  };

  const getAvatar = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.avatar_url || null;
  };

  const fetchDmMessages = async (otherUserId: string) => {
    const { data } = await supabase.rpc('get_my_direct_messages', {
      p_user_id: user?.id,
      p_other_user_id: otherUserId,
    });
    setDmMessages(data || []);
    
    // Mark as read
    await supabase.rpc('mark_dms_read', {
      p_user_id: user?.id,
      p_sender_id: otherUserId,
    });
    
    setUnreadCounts(prev => ({ ...prev, [otherUserId]: 0 }));
  };

  const isFriend = (userId: string) => {
    return friendships.some(f => 
      (f.user_id === user?.id && f.friend_id === userId) ||
      (f.friend_id === user?.id && f.user_id === userId)
    );
  };

  const hasPendingRequest = (userId: string) => {
    return friendRequests.some(fr => 
      ((fr.from_user_id === user?.id && fr.to_user_id === userId) ||
       (fr.to_user_id === user?.id && fr.from_user_id === userId)) &&
      fr.status === 'pending'
    );
  };

  const isBlocked = (userId: string) => {
    return blocks.some(b => b.blocker_id === user?.id && b.blocked_id === userId);
  };

  const isBlockedBy = (userId: string) => {
    return blocks.some(b => b.blocker_id === userId && b.blocked_id === user?.id);
  };

  const sendFriendRequest = async (toUser: AppUser) => {
    if (!user) return;
    await supabase.rpc('send_friend_request', {
      p_caller_id: user.id,
      p_caller_username: user.username,
      p_to_user_id: toUser.id,
      p_to_username: toUser.username,
    });
    fetchFriendRequests();
  };

  const acceptFriendRequest = async (request: FriendRequest) => {
    if (!user) return;
    await supabase.rpc('accept_friend_request', {
      p_caller_id: user.id,
      p_request_id: request.id,
    });
    setShowNotification(null);
    fetchFriendRequests();
    fetchFriendships();
  };

  const rejectFriendRequest = async (request: FriendRequest) => {
    if (!user) return;
    await supabase.rpc('reject_friend_request', {
      p_caller_id: user.id,
      p_request_id: request.id,
    });
    setShowNotification(null);
    fetchFriendRequests();
  };

  const blockUser = async (userId: string) => {
    if (!user) return;
    await supabase.rpc('block_user', {
      p_caller_id: user.id,
      p_blocked_id: userId,
    });
    fetchBlocks();
  };

  const unblockUser = async (userId: string) => {
    if (!user) return;
    await supabase.rpc('unblock_user', {
      p_caller_id: user.id,
      p_blocked_id: userId,
    });
    fetchBlocks();
  };

  const muteUser = async (userId: string, duration: string | null) => {
    if (!user) return;
    const muteUntil = duration ? new Date(Date.now() + parseInt(duration)).toISOString() : null;
    
    await supabase.rpc('upsert_my_notification_setting', {
      p_caller_id: user.id,
      p_muted_user_id: userId,
      p_mute_until: muteUntil,
    });
    fetchMuteSettings();
    setShowMuteDialog(null);
  };

  const unmuteUser = async (userId: string) => {
    if (!user) return;
    await supabase.rpc('delete_my_notification_setting', {
      p_caller_id: user.id,
      p_muted_user_id: userId,
    });
    fetchMuteSettings();
  };

  const sendMessage = async (e: React.FormEvent, gifUrl?: string) => {
    e.preventDefault();
    const messageToSend = gifUrl || newMessage.trim();
    if (!messageToSend || isLoading || !user) return;

    setIsLoading(true);
    // Parse emojis and censor text (skip censoring for GIFs)
    const finalMessage = gifUrl 
      ? `[GIF](${gifUrl})` 
      : censorText(parseEmojis(messageToSend));

    if (view === 'server') {
      await supabase.from('chat_messages').insert({
        username: user.username,
        message: finalMessage,
        reply_to_id: replyingTo?.id || null,
      });
    } else if (view === 'dm' && selectedDmUser) {
      await supabase.from('direct_messages').insert({
        sender_id: user.id,
        sender_username: user.username,
        receiver_id: selectedDmUser.id,
        receiver_username: selectedDmUser.username,
        message: finalMessage,
        reply_to_id: replyingTo?.id || null,
      });
    }

    setNewMessage('');
    setReplyingTo(null);
    setIsLoading(false);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
  };

  const getReplyMessage = (replyToId: string | null | undefined, messageType: 'server' | 'dm') => {
    if (!replyToId) return null;
    if (messageType === 'server') {
      return serverMessages.find(m => m.id === replyToId);
    } else {
      return dmMessages.find(m => m.id === replyToId);
    }
  };

  const openDm = (dmUser: AppUser) => {
    if (isBlockedBy(dmUser.id)) return;
    if (!isFriend(dmUser.id) && !hasPendingRequest(dmUser.id)) {
      sendFriendRequest(dmUser);
      return;
    }
    if (!isFriend(dmUser.id)) return;
    
    setSelectedDmUser(dmUser);
    setView('dm');
    fetchDmMessages(dmUser.id);
  };

  const friends = allUsers.filter(u => u.id !== user?.id && isFriend(u.id));
  const pendingRequests = friendRequests.filter(fr => fr.to_user_id === user?.id && fr.status === 'pending');

  return (
    <div className="h-full w-full flex bg-background overflow-hidden">
      {/* Friend Request Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-xl p-4 shadow-2xl animate-fade-in max-w-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Friend Request</p>
              <p className="text-sm text-muted-foreground">{showNotification.from_username} wants to be your friend</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => acceptFriendRequest(showNotification)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Accept
            </button>
            <button
              onClick={() => rejectFriendRequest(showNotification)}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Decline
            </button>
          </div>
        </div>
      )}

      {/* Mute Dialog */}
      {showMuteDialog && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Mute Notifications</h3>
            <div className="space-y-2">
              <button onClick={() => muteUser(showMuteDialog, '3600000')} className="w-full text-left px-4 py-2 hover:bg-muted rounded-lg">1 Hour</button>
              <button onClick={() => muteUser(showMuteDialog, '86400000')} className="w-full text-left px-4 py-2 hover:bg-muted rounded-lg">1 Day</button>
              <button onClick={() => muteUser(showMuteDialog, '604800000')} className="w-full text-left px-4 py-2 hover:bg-muted rounded-lg">1 Week</button>
              <button onClick={() => muteUser(showMuteDialog, null)} className="w-full text-left px-4 py-2 hover:bg-muted rounded-lg">Forever</button>
            </div>
            <button onClick={() => setShowMuteDialog(null)} className="mt-4 w-full py-2 border border-border rounded-lg hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      {/* Server sidebar - hidden on mobile when viewing chat */}
      <div className={`w-14 md:w-16 bg-background border-r border-border/30 flex flex-col items-center py-3 md:py-4 gap-2 ${
        (view === 'dm' && selectedDmUser) ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center bg-destructive/20 hover:bg-destructive/40 text-destructive transition-all mb-2"
            title="Close Chat"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
        <button
          onClick={() => { setView('server'); setSelectedDmUser(null); }}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all ${
            view === 'server' ? 'bg-primary rounded-xl' : 'bg-muted hover:bg-muted/80 hover:rounded-xl'
          }`}
        >
          <img src={solarnovaIcon} alt="Server" className="w-6 h-6 md:w-8 md:h-8" />
        </button>
        <div className="w-6 md:w-8 h-0.5 bg-border rounded-full my-2" />
        <button
          onClick={() => { setView('friends'); setSelectedDmUser(null); }}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all ${
            view === 'friends' || view === 'dm' ? 'bg-primary rounded-xl' : 'bg-muted hover:bg-muted/80 hover:rounded-xl'
          }`}
        >
          <Users className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>

      {/* Channel/DM sidebar - hidden on mobile when in DM view */}
      <div className={`w-48 md:w-60 bg-card/50 border-r border-border/30 flex flex-col ${
        (view === 'dm' && selectedDmUser) ? 'hidden md:flex' : 'flex'
      }`}>
      {view === 'server' ? (
          <>
            <div className="p-4 border-b border-border/30">
              <h2 className="font-bold text-foreground">Solarnova Server</h2>
            </div>
            <div className="p-2 flex-1">
              <button 
                onClick={() => setView('server')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  view === 'server' ? 'bg-muted/50 text-foreground' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
              >
                <Hash className="w-4 h-4" />
                <span>general</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-border/30">
              <h2 className="font-bold text-foreground">Direct Messages</h2>
            </div>
            {pendingRequests.length > 0 && (
              <div className="p-2 border-b border-border/30">
                <p className="text-xs text-muted-foreground px-2 mb-2">PENDING REQUESTS</p>
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center gap-2 px-2 py-1">
                    <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-xs">
                      {req.from_username[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm truncate">{req.from_username}</span>
                    <button onClick={() => acceptFriendRequest(req)} className="p-1 hover:bg-green-600 rounded"><Check className="w-4 h-4" /></button>
                    <button onClick={() => rejectFriendRequest(req)} className="p-1 hover:bg-destructive rounded"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-2">
              <p className="text-xs text-muted-foreground px-2 mb-2">
                ONLINE — {friends.filter(f => onlineUsers.has(f.id)).length}
              </p>
              {friends.filter(f => onlineUsers.has(f.id)).map(friend => {
                const isMuted = muteSettings.some(m => m.muted_user_id === friend.id);
                const unread = unreadCounts[friend.id] || 0;
                const friendAvatar = getAvatar(friend.id);
                
                return (
                  <button
                    key={friend.id}
                    onClick={() => openDm(friend)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 ${
                      selectedDmUser?.id === friend.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs relative overflow-hidden">
                      {friendAvatar ? (
                        <img src={friendAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                          {friend.username[0].toUpperCase()}
                        </div>
                      )}
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-xs flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                      {/* Online indicator */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                    </div>
                    <span className="flex-1 text-sm truncate text-left">{getDisplayName(friend.id, friend.username)}</span>
                    {isMuted && <BellOff className="w-3 h-3 text-muted-foreground" />}
                  </button>
                );
              })}

              <p className="text-xs text-muted-foreground px-2 mt-4 mb-2">
                OFFLINE — {friends.filter(f => !onlineUsers.has(f.id)).length}
              </p>
              {friends.filter(f => !onlineUsers.has(f.id)).map(friend => {
                const isMuted = muteSettings.some(m => m.muted_user_id === friend.id);
                const unread = unreadCounts[friend.id] || 0;
                const friendAvatar = getAvatar(friend.id);
                
                return (
                  <button
                    key={friend.id}
                    onClick={() => openDm(friend)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 opacity-60 ${
                      selectedDmUser?.id === friend.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs relative overflow-hidden">
                      {friendAvatar ? (
                        <img src={friendAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                          {friend.username[0].toUpperCase()}
                        </div>
                      )}
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-xs flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                      {/* Offline indicator */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-muted-foreground rounded-full border-2 border-card" />
                    </div>
                    <span className="flex-1 text-sm truncate text-left">{getDisplayName(friend.id, friend.username)}</span>
                    {isMuted && <BellOff className="w-3 h-3 text-muted-foreground" />}
                  </button>
                );
              })}
              
              <p className="text-xs text-muted-foreground px-2 mt-4 mb-2">ALL USERS</p>
              {allUsers.filter(u => u.id !== user?.id && !isFriend(u.id)).map(otherUser => (
                <button
                  key={otherUser.id}
                  onClick={() => openDm(otherUser)}
                  disabled={isBlockedBy(otherUser.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 disabled:opacity-50"
                >
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs relative">
                    {otherUser.username[0].toUpperCase()}
                    {/* Online/Offline indicator for all users */}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                      onlineUsers.has(otherUser.id) ? 'bg-green-500' : 'bg-muted-foreground'
                    }`} />
                  </div>
                  <span className="flex-1 text-sm truncate text-left text-muted-foreground">{otherUser.username}</span>
                  {hasPendingRequest(otherUser.id) ? (
                    <span className="text-xs text-yellow-500">Pending</span>
                  ) : (
                    <UserPlus className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {/* Header */}
        <div className="h-12 md:h-14 border-b border-border/30 flex items-center px-3 md:px-4 gap-2">
          {view === 'server' ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                <span className="font-semibold text-sm md:text-base">general</span>
              </div>
              {user?.role === 'admin' && (
                <button
                  onClick={async () => {
                    if (!confirm('Clear all server messages? This cannot be undone.')) return;
                    const { error } = await (supabase.rpc as any)('clear_chat_messages', { p_admin_id: user.id });
                    if (!error) setServerMessages([]);
                  }}
                  className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                  title="Clear all messages"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Clear</span>
                </button>
              )}
            </div>
          ) : view === 'dm' && selectedDmUser ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectedDmUser(null); setView('friends'); }}
                  className="md:hidden p-1 -ml-1 text-muted-foreground"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs relative overflow-hidden">
                  {getAvatar(selectedDmUser.id) ? (
                    <img src={getAvatar(selectedDmUser.id)!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                      {selectedDmUser.username[0].toUpperCase()}
                    </div>
                  )}
                  {/* Online/offline indicator */}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
                    onlineUsers.has(selectedDmUser.id) ? 'bg-green-500' : 'bg-muted-foreground'
                  }`} />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm md:text-base leading-tight">{getDisplayName(selectedDmUser.id, selectedDmUser.username)}</span>
                  <span className={`text-[10px] leading-tight ${onlineUsers.has(selectedDmUser.id) ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {onlineUsers.has(selectedDmUser.id) ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {muteSettings.some(m => m.muted_user_id === selectedDmUser.id) ? (
                  <button onClick={() => unmuteUser(selectedDmUser.id)} className="p-2 hover:bg-muted rounded-lg" title="Unmute">
                    <Bell className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => setShowMuteDialog(selectedDmUser.id)} className="p-2 hover:bg-muted rounded-lg" title="Mute">
                    <BellOff className="w-4 h-4" />
                  </button>
                )}
                {isBlocked(selectedDmUser.id) ? (
                  <button onClick={() => unblockUser(selectedDmUser.id)} className="p-2 hover:bg-muted rounded-lg text-green-500" title="Unblock">
                    <Ban className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => blockUser(selectedDmUser.id)} className="p-2 hover:bg-muted rounded-lg text-destructive" title="Block">
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold">Friends</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {view === 'server' ? (
            serverMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground p-4">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-1">
                {/* Pinned messages banner */}
                {pinnedMessages.filter(p => p.channel_id === 'general').length > 0 && (
                  <div className="mb-2">
                    <button
                      onClick={() => setShowPinned(!showPinned)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded bg-primary/10 w-full text-left"
                    >
                      <Pin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        <span className="font-bold text-foreground">{pinnedMessages.filter(p => p.channel_id === 'general')[0]?.message_text}</span>
                        {' '}<span className="text-muted-foreground">— pinned by {pinnedMessages.filter(p => p.channel_id === 'general')[0]?.pinned_by}</span>
                      </span>
                      <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${showPinned ? 'rotate-180' : ''}`} />
                    </button>
                    {showPinned && (
                      <div className="mt-1 space-y-1 border border-border rounded-lg p-2 bg-muted/30">
                        {pinnedMessages.filter(p => p.channel_id === 'general').map(pin => (
                          <div key={pin.id} className="flex items-start justify-between gap-2 text-xs p-1.5 rounded bg-background/50">
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground">{pin.message_username}:</span>
                              <p className="font-bold text-foreground">{pin.message_text}</p>
                            </div>
                            {user?.role === 'admin' && (
                              <button onClick={() => unpinMessage(pin.message_id, 'general')} className="text-destructive hover:text-destructive/80 flex-shrink-0" title="Unpin">
                                <PinOff className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {serverMessages.map((msg) => {
                  const senderUser = allUsers.find(u => u.username === msg.username);
                  const msgAvatar = senderUser ? getAvatar(senderUser.id) : null;
                  const displayName = senderUser ? getDisplayName(senderUser.id, msg.username) : msg.username;
                  const replyMsg = getReplyMessage(msg.reply_to_id, 'server') as Message | null;
                  const senderIsAdmin = senderUser ? isAdminUser(senderUser.id) : false;
                  const msgPinned = isMessagePinned(msg.id, 'general');
                  
                    return (
                      <div key={msg.id} className={`group relative flex gap-3 hover:bg-muted/20 px-2 py-1 rounded ${msgPinned ? 'border-l-2 border-primary/50' : ''}`}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                          {msgAvatar ? (
                            <img src={msgAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                              {msg.username[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Reply preview */}
                          {replyMsg && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5 pl-2 border-l-2 border-primary/50">
                              <Reply className="w-3 h-3" />
                              <span className="font-medium">{replyMsg.username}</span>
                              <span className="truncate max-w-[200px]">
                                {isGifUrl(replyMsg.message) ? 'sent a GIF' : replyMsg.message}
                              </span>
                            </div>
                          )}
                          <div className="flex items-baseline gap-2">
                            <span className={`font-semibold ${senderIsAdmin ? 'text-red-500' : 'text-foreground'}`}>
                              {displayName}
                              {senderIsAdmin && <span className="ml-1 text-[10px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded align-middle">ADMIN</span>}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                            {msgPinned && <Pin className="w-3 h-3 text-primary" />}
                          </div>
                          <p className="text-foreground/90">
                            {isGifUrl(msg.message) ? (
                              <img src={extractGifUrl(msg.message) || ''} alt="GIF" className="max-w-xs rounded-lg" loading="lazy" />
                            ) : (
                              msg.message
                            )}
                          </p>
                          <MessageReactions
                            messageId={msg.id}
                            messageType="server"
                            reactions={reactions[msg.id] || {}}
                            onReactionChange={fetchReactions}
                          />
                        </div>
                        {/* Action buttons - compact toolbar */}
                        <div className={`absolute -top-3 right-2 flex gap-0.5 transition-opacity bg-card border border-border rounded-md shadow-lg z-10 ${reactionPickerMsgId === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Reply"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative" data-reaction-picker>
                            <button
                              onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)}
                              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="React"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            {reactionPickerMsgId === msg.id && (
                              <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-xl p-2 z-50" data-reaction-picker>
                                <div className="flex gap-1">
                                  {['👍', '❤️', '😂', '😮', '😢', '🔥', '💀', '🎉'].map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={async () => {
                                        if (!user) return;
                                        await supabase.rpc('toggle_reaction', {
                                          p_caller_id: user.id,
                                          p_message_id: msg.id,
                                          p_username: user.username,
                                          p_emoji: emoji,
                                          p_message_type: 'server',
                                        });
                                        fetchReactions();
                                        setReactionPickerMsgId(null);
                                      }}
                                      className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded transition-colors text-lg"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => msgPinned ? unpinMessage(msg.id, 'general') : pinMessage(msg.id, msg.message, msg.username, 'general')}
                              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title={msgPinned ? 'Unpin' : 'Pin'}
                            >
                              {msgPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                })}

              </div>
            )
          ) : view === 'dm' && selectedDmUser ? (
            dmMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet with {selectedDmUser.username}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-1">
                {dmMessages.map((msg) => {
                  const msgAvatar = getAvatar(msg.sender_id);
                  const displayName = getDisplayName(msg.sender_id, msg.sender_username);
                  const replyMsg = getReplyMessage(msg.reply_to_id, 'dm') as DirectMessage | null;
                  const senderIsAdmin = isAdminUser(msg.sender_id);
                  const dmChannelId = `dm-${[user?.id, selectedDmUser?.id].sort().join('-')}`;
                  const msgPinned = isMessagePinned(msg.id, dmChannelId);
                  
                  return (
                    <div key={msg.id} className={`group relative flex gap-3 hover:bg-muted/20 px-2 py-1 rounded ${msgPinned ? 'border-l-2 border-primary/50' : ''}`}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                        {msgAvatar ? (
                          <img src={msgAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                            {msg.sender_username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Reply preview */}
                        {replyMsg && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5 pl-2 border-l-2 border-primary/50">
                            <Reply className="w-3 h-3" />
                            <span className="font-medium">{replyMsg.sender_username}</span>
                            <span className="truncate max-w-[200px]">
                              {isGifUrl(replyMsg.message) ? 'sent a GIF' : replyMsg.message}
                            </span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-2">
                          <span className={`font-semibold ${senderIsAdmin ? 'text-red-500' : 'text-foreground'}`}>
                            {displayName}
                            {senderIsAdmin && <span className="ml-1 text-[10px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded align-middle">ADMIN</span>}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                          {msgPinned && <Pin className="w-3 h-3 text-primary" />}
                        </div>
                        <p className="text-foreground/90">
                          {isGifUrl(msg.message) ? (
                            <img src={extractGifUrl(msg.message) || ''} alt="GIF" className="max-w-xs rounded-lg" loading="lazy" />
                          ) : (
                            msg.message
                          )}
                        </p>
                        <MessageReactions
                          messageId={msg.id}
                          messageType="dm"
                          reactions={reactions[msg.id] || {}}
                          onReactionChange={fetchReactions}
                        />
                      </div>
                      {/* Action buttons - compact toolbar */}
                      <div className={`absolute -top-3 right-2 flex gap-0.5 transition-opacity bg-card border border-border rounded-md shadow-lg z-10 ${reactionPickerMsgId === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Reply"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                        <div className="relative" data-reaction-picker>
                          <button
                            onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)}
                            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="React"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>
                          {reactionPickerMsgId === msg.id && (
                            <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-xl p-2 z-50" data-reaction-picker>
                              <div className="flex gap-1">
                                {['👍', '❤️', '😂', '😮', '😢', '🔥', '💀', '🎉'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={async () => {
                                      if (!user) return;
                                      await supabase.rpc('toggle_reaction', {
                                        p_caller_id: user.id,
                                        p_message_id: msg.id,
                                        p_username: user.username,
                                        p_emoji: emoji,
                                        p_message_type: 'dm',
                                      });
                                      fetchReactions();
                                      setReactionPickerMsgId(null);
                                    }}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded transition-colors text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => msgPinned ? unpinMessage(msg.id, dmChannelId) : pinMessage(msg.id, msg.message, msg.sender_username, dmChannelId)}
                            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title={msgPinned ? 'Unpin' : 'Pin'}
                          >
                            {msgPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a friend to start chatting</p>
                <p className="text-sm mt-2">Or click on a user to send a friend request</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {(() => {
          const currentLocation = view === 'server' ? 'server' : selectedDmUser?.id;
          const typingHere = Array.from(typingUsers.entries())
            .filter(([, data]) => data.location === currentLocation)
            .map(([, data]) => data.username);
          
          if (typingHere.length === 0) return null;
          
          const text = typingHere.length === 1 
            ? `${typingHere[0]} is typing...`
            : typingHere.length === 2
            ? `${typingHere[0]} and ${typingHere[1]} are typing...`
            : `${typingHere.slice(0, 2).join(', ')} and ${typingHere.length - 2} others are typing...`;
          
          return (
            <div className="px-4 py-1 text-xs text-muted-foreground flex items-center gap-2">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              {text}
            </div>
          );
        })()}

        {/* Message input */}
        {(view === 'server' || (view === 'dm' && selectedDmUser && !isBlocked(selectedDmUser.id) && !isBlockedBy(selectedDmUser.id))) && (
          <form onSubmit={sendMessage} className="p-3 md:p-4 border-t border-border/30 safe-area-pb">
            {/* Reply indicator */}
            {replyingTo && (
              <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-muted/50 rounded-lg text-sm">
                <Reply className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Replying to</span>
                <span className="font-medium text-foreground">
                  {'username' in replyingTo ? replyingTo.username : replyingTo.sender_username}
                </span>
                <span className="text-muted-foreground truncate flex-1 max-w-[200px]">
                  {isGifUrl(replyingTo.message) ? 'GIF' : replyingTo.message}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="relative flex gap-2">
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={(emoji) => setNewMessage(prev => prev + emoji)}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
                {showGifPicker && (
                  <GifPicker
                    onSelect={(gifUrl) => sendMessage({ preventDefault: () => {} } as React.FormEvent, gifUrl)}
                    onClose={() => setShowGifPicker(false)}
                  />
                )}
                {emojiAutocompleteQuery && emojiAutocompleteQuery.length > 0 && !showEmojiPicker && !showGifPicker && (
                  <EmojiAutocomplete
                    query={emojiAutocompleteQuery}
                    onSelect={handleEmojiAutocomplete}
                  />
                )}
              <button
                type="button"
                onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                className="p-2.5 md:p-3 hover:bg-muted rounded-lg transition-colors"
              >
                <Smile className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                className="p-2.5 md:p-3 hover:bg-muted rounded-lg transition-colors"
              >
                <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  if (e.target.value.length > 0) {
                    broadcastTyping();
                  }
                }}
                className="flex-1 bg-muted border border-border/30 rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder={replyingTo ? 'Type your reply...' : (view === 'server' ? 'Message #general' : `Message ${selectedDmUser?.username}`)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-primary hover:opacity-90 p-2.5 md:p-3 rounded-lg transition-all duration-300 disabled:opacity-50"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}