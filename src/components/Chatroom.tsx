import { useState, useRef, useEffect } from 'react';
import { Send, Lock, Users, MessageSquare, Smile, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { censorText } from '@/lib/profanityFilter';
import { parseEmojis, isGifUrl, extractGifUrl } from '@/lib/emojiParser';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { GifPicker } from '@/components/chat/GifPicker';
import { EmojiAutocomplete } from '@/components/chat/EmojiAutocomplete';

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

export function Chatroom() {
  const { user, sessionToken } = useAuth();
  const [step, setStep] = useState<'verify' | 'chat'>('verify');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiAutocomplete, setShowEmojiAutocomplete] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [adminUsernames, setAdminUsernames] = useState<Set<string>>(new Set());

  // Fetch admin usernames
  useEffect(() => {
    const fetchAdmins = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      if (!roles) return;
      const adminIds = roles.map(r => r.user_id);
      const { data: users } = await supabase.rpc('get_all_app_users');
      if (users) {
        const admins = new Set(users.filter((u: any) => adminIds.includes(u.id)).map((u: any) => u.username));
        setAdminUsernames(admins);
      }
    };
    fetchAdmins();
  }, []);

  // Fetch existing messages and subscribe to new ones
  useEffect(() => {
    if (step !== 'chat') return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages((data || []).slice().reverse());
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
      }, 100);
    };

    fetchMessages();

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [step]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // Check for emoji autocomplete trigger
  useEffect(() => {
    const colonMatch = newMessage.match(/:([a-zA-Z0-9_]{2,})$/);
    if (colonMatch) {
      setEmojiQuery(colonMatch[1]);
      setShowEmojiAutocomplete(true);
    } else {
      setShowEmojiAutocomplete(false);
      setEmojiQuery('');
    }
  }, [newMessage]);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!user) {
      setError('You must be logged in');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('auth-hash', {
        body: { action: 'login', username: user.username, password },
      });

      if (error || data?.error) {
        setError('Invalid password');
        setIsLoading(false);
        return;
      }

      setStep('chat');
    } catch (err) {
      setError('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || isLoading || !user) return;

    setIsLoading(true);
    setError('');

    // Parse emoji shortcodes before censoring
    const parsedMessage = parseEmojis(newMessage.trim());
    const censoredMessage = censorText(parsedMessage);
    
    try {
      const { error } = await supabase.from('chat_messages').insert({
        username: user.username,
        message: censoredMessage,
      });

      if (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message');
      } else {
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGifSelect = async (gifUrl: string) => {
    if (!user || isLoading) return;
    setIsLoading(true);
    
    try {
      const { error } = await supabase.from('chat_messages').insert({
        username: user.username,
        message: `[GIF](${gifUrl})`,
      });

      if (error) {
        console.error('Error sending GIF:', error);
      }
    } catch (err) {
      console.error('Error sending GIF:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleEmojiAutocompleteSelect = (emoji: string) => {
    // Replace the :query part with the emoji
    setNewMessage(prev => prev.replace(/:([a-zA-Z0-9_]{2,})$/, emoji));
    setShowEmojiAutocomplete(false);
    inputRef.current?.focus();
  };

  const renderMessage = (msg: Message) => {
    const gifUrl = extractGifUrl(msg.message);
    if (gifUrl) {
      return (
        <div className="max-w-[240px]">
          <img
            src={gifUrl}
            alt="GIF"
            className="rounded-lg w-full"
            loading="lazy"
          />
        </div>
      );
    }

    // Parse emoji shortcodes in display
    const parsed = parseEmojis(msg.message);
    return <p className="text-foreground break-words">{parsed}</p>;
  };

  if (step === 'verify') {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="bg-gradient-card border border-border/30 rounded-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-foreground" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-foreground text-center mb-2">Verify Identity</h2>
          <p className="text-muted-foreground text-center mb-6">
            Enter your password to access chat
          </p>

          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-destructive/20 border border-destructive rounded-lg px-4 py-2 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-primary hover:opacity-90 text-foreground font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-glow disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Access Chat'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border/20">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MessageSquare className="w-4 h-4" />
              <span>Re-authentication required for chat</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 border-b border-border/30 px-3 sm:px-6 py-3 sm:py-4 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-bold text-foreground truncate">Global Chat</h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">as {user?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user?.role === 'admin' && (
              <button
                onClick={async () => {
                  if (!confirm('Clear all chat messages? This cannot be undone.')) return;
                  const { error } = await supabase.rpc('clear_chat_messages', { p_session_token: sessionToken! });
                  if (!error) setMessages([]);
                }}
                className="text-xs sm:text-sm text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1"
                title="Clear all messages"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              onClick={() => {
                setStep('verify');
                setPassword('');
                setMessages([]);
              }}
              className="text-xs sm:text-sm text-primary hover:text-secondary transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.username === user?.username ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.username === user?.username
                    ? 'bg-gradient-primary'
                    : 'bg-muted'
                }`}
              >
                <p className={`text-xs mb-1 ${adminUsernames.has(msg.username) ? 'text-red-500 font-bold' : 'text-foreground/70'}`}>
                  {msg.username}
                  {adminUsernames.has(msg.username) && <span className="ml-1 text-[9px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded">ADMIN</span>}
                </p>
                {renderMessage(msg)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="border-t border-border/30 p-4 shrink-0">
        <div className="relative">
          {/* Emoji Autocomplete */}
          {showEmojiAutocomplete && (
            <EmojiAutocomplete
              query={emojiQuery}
              onSelect={(emoji) => handleEmojiAutocompleteSelect(emoji)}
            />
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}

          {/* GIF Picker */}
          {showGifPicker && (
            <GifPicker
              onSelect={handleGifSelect}
              onClose={() => setShowGifPicker(false)}
            />
          )}

          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
              className="p-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Emojis"
            >
              <Smile className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
              className="p-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="GIFs"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="Type a message... (use :emoji: for shortcuts)"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-primary hover:opacity-90 p-3 rounded-lg transition-all duration-300 shadow-glow disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
