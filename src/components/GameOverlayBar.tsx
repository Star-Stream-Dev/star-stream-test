import { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  MessageCircle,
  Music,
  Send,
  X,
  ChevronUp,
  Users,
  ArrowLeft
} from 'lucide-react';
import { useYouTubeMusic } from '@/contexts/YouTubeMusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { censorText } from '@/lib/profanityFilter';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  sender_username: string;
  receiver_id: string;
  receiver_username: string;
  message: string;
  created_at: string;
}

interface Friend {
  id: string;
  username: string;
}

interface GameOverlayBarProps {
  onClose?: () => void;
}

export function GameOverlayBar({ onClose }: GameOverlayBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'music' | 'chat' | 'dm' | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dmMessagesEndRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // DM state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [dmMessage, setDmMessage] = useState('');

  const { user, sessionToken } = useAuth();
  
  // Use YouTube Music context instead of old music player
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    playNext,
    playPrevious,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
  } = useYouTubeMusic();

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) {
        setMessages(data.reverse());
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('game-overlay-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setMessages((prev) => [...prev.slice(-49), payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch friends
  const fetchFriends = async () => {
    if (!user) return;
    
    // First get friendships
    const { data: friendships } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);
    
    if (friendships && friendships.length > 0) {
      const friendIds = friendships.map(f => f.friend_id);
      
      // Use the RPC function since app_users has restrictive RLS
      const { data: allUsers } = await supabase.rpc('get_all_app_users');
      
      if (allUsers) {
        const friendUsers = allUsers.filter((u: { id: string; username: string }) => 
          friendIds.includes(u.id)
        );
        setFriends(friendUsers);
      }
    } else {
      setFriends([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    fetchFriends();

    // Subscribe to friendship changes
    const friendshipChannel = supabase
      .channel('game-overlay-friendships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        fetchFriends();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(friendshipChannel);
    };
  }, [user]);

  // Fetch DMs for selected friend
  useEffect(() => {
    if (!user || !selectedFriend) return;
    
    const fetchDms = async () => {
      const { data } = await supabase.rpc('get_my_direct_messages', {
        p_session_token: sessionToken!,
        p_other_user_id: selectedFriend.id,
      });
      
      if (data) {
        setDmMessages(data);
      }
    };
    
    fetchDms();
    
    // Subscribe to new DMs for this specific conversation
    const channel = supabase
      .channel(`game-overlay-dms-${selectedFriend.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const newDm = payload.new as DirectMessage;
          // Only add if it's for THIS conversation
          if ((newDm.sender_id === user.id && newDm.receiver_id === selectedFriend.id) ||
              (newDm.sender_id === selectedFriend.id && newDm.receiver_id === user.id)) {
            setDmMessages(prev => {
              // Prevent duplicates
              if (prev.some(m => m.id === newDm.id)) return prev;
              return [...prev, newDm];
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedFriend]);

  // Auto-scroll DMs
  useEffect(() => {
    if (activeTab === 'dm' && selectedFriend) {
      dmMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dmMessages, activeTab, selectedFriend]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (activeTab) return; // Don't hide if a panel is open
    hoverTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending) return;

    setIsSending(true);
    const censoredMessage = censorText(newMessage.trim());
    
    await supabase.from('chat_messages').insert({
      username: user.username,
      message: censoredMessage,
    });

    setNewMessage('');
    setIsSending(false);
  };

  const closePanel = () => {
    setActiveTab(null);
    setSelectedFriend(null);
  };

  const handleSendDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmMessage.trim() || !user || !selectedFriend || isSending) return;

    setIsSending(true);
    const censoredMessage = censorText(dmMessage.trim());
    
    await supabase.from('direct_messages').insert({
      sender_id: user.id,
      sender_username: user.username,
      receiver_id: selectedFriend.id,
      receiver_username: selectedFriend.username,
      message: censoredMessage,
    });

    setDmMessage('');
    setIsSending(false);
  };

  return (
    <>
      {/* Hover trigger zone at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 h-8 z-[101]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Indicator */}
        <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/30 transition-all duration-300 ${isVisible ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
          <ChevronUp className="w-4 h-4 text-muted-foreground animate-bounce" />
          <span className="text-xs text-muted-foreground">Hover for controls</span>
        </div>
      </div>

      {/* Main bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[102] transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Expanded panels */}
        {activeTab && (
          <div className="bg-background/95 backdrop-blur-lg border-t border-border/30">
            {activeTab === 'music' && (
              <div className="max-w-2xl mx-auto p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Music Player</h3>
                  <button onClick={closePanel} className="p-1 hover:bg-muted/50 rounded">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                
                {currentTrack ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={currentTrack.thumbnail || '/placeholder.svg'}
                      alt={currentTrack.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium truncate">{currentTrack.title}</p>
                      <p className="text-muted-foreground text-sm truncate">{currentTrack.artist}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-muted/50 rounded-lg">
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(parseInt(e.target.value));
                          setIsMuted(false);
                        }}
                        className="w-20 accent-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">No track playing. Start music from the main menu.</p>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="max-w-2xl mx-auto p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Quick Chat</h3>
                  <button onClick={closePanel} className="p-1 hover:bg-muted/50 rounded">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                
                {/* Messages */}
                <div className="h-40 overflow-y-auto space-y-2 mb-3 scrollbar-thin">
                  {messages.slice(-20).map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <span className="font-medium text-primary">{msg.username}: </span>
                      <span className="text-foreground">{msg.message}</span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                {user ? (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 bg-muted/30 border border-border/30 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      type="submit"
                      disabled={isSending || !newMessage.trim()}
                      className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <p className="text-muted-foreground text-sm text-center">Login to chat</p>
                )}
              </div>
            )}

            {activeTab === 'dm' && (
              <div className="max-w-2xl mx-auto p-4">
                <div className="flex items-center justify-between mb-2">
                  {selectedFriend ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedFriend(null)} 
                        className="p-1 hover:bg-muted/50 rounded"
                      >
                        <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <h3 className="text-sm font-semibold text-foreground">{selectedFriend.username}</h3>
                    </div>
                  ) : (
                    <h3 className="text-sm font-semibold text-foreground">Direct Messages</h3>
                  )}
                  <button onClick={closePanel} className="p-1 hover:bg-muted/50 rounded">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                
                {!user ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Login to send direct messages</p>
                ) : !selectedFriend ? (
                  // Friend list
                  <div className="h-40 overflow-y-auto space-y-1 scrollbar-thin">
                    {friends.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">No friends yet. Add friends from the chat!</p>
                    ) : (
                      friends.map((friend) => (
                        <button
                          key={friend.id}
                          onClick={() => setSelectedFriend(friend)}
                          className="w-full flex items-center gap-3 p-2 hover:bg-muted/30 rounded-lg transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary text-sm font-medium">
                              {friend.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm text-foreground">{friend.username}</span>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  // DM conversation
                  <>
                    <div className="h-40 overflow-y-auto space-y-2 mb-3 scrollbar-thin">
                      {dmMessages.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">No messages yet. Say hello!</p>
                      ) : (
                        dmMessages.map((msg) => (
                          <div 
                            key={msg.id} 
                            className={`text-sm ${msg.sender_id === user.id ? 'text-right' : ''}`}
                          >
                            <span className={`inline-block px-3 py-1.5 rounded-lg ${
                              msg.sender_id === user.id 
                                ? 'bg-primary/20 text-primary' 
                                : 'bg-muted/30 text-foreground'
                            }`}>
                              {msg.message}
                            </span>
                          </div>
                        ))
                      )}
                      <div ref={dmMessagesEndRef} />
                    </div>

                    <form onSubmit={handleSendDm} className="flex gap-2">
                      <input
                        type="text"
                        value={dmMessage}
                        onChange={(e) => setDmMessage(e.target.value)}
                        placeholder={`Message ${selectedFriend.username}...`}
                        className="flex-1 px-3 py-2 bg-muted/30 border border-border/30 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <button
                        type="submit"
                        disabled={isSending || !dmMessage.trim()}
                        className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Control bar */}
        <div className="bg-background/90 backdrop-blur-lg border-t border-border/30 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {/* Music controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(activeTab === 'music' ? null : 'music')}
                className={`p-2 rounded-lg transition-colors ${activeTab === 'music' ? 'bg-primary/20 text-primary' : 'hover:bg-muted/50 text-muted-foreground'}`}
              >
                <Music className="w-5 h-5" />
              </button>
              
              {currentTrack && (
                <div className="flex items-center gap-1">
                  <button onClick={playPrevious} className="p-1.5 hover:bg-muted/50 rounded text-muted-foreground">
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button onClick={togglePlayPause} className="p-2 bg-primary/20 hover:bg-primary/30 rounded-full text-primary">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <button onClick={playNext} className="p-1.5 hover:bg-muted/50 rounded text-muted-foreground">
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <span className="ml-2 text-xs text-muted-foreground truncate max-w-[120px]">
                    {currentTrack.title}
                  </span>
                </div>
              )}
            </div>

            {/* Chat & DM toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTab(activeTab === 'dm' ? null : 'dm');
                  if (activeTab !== 'dm') setSelectedFriend(null);
                }}
                className={`p-2 rounded-lg transition-colors ${activeTab === 'dm' ? 'bg-primary/20 text-primary' : 'hover:bg-muted/50 text-muted-foreground'}`}
                title="Direct Messages"
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')}
                className={`p-2 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-primary/20 text-primary' : 'hover:bg-muted/50 text-muted-foreground'}`}
                title="Quick Chat"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  title="Exit"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
