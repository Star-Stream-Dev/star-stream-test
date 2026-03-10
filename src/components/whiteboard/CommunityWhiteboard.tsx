import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { AlertTriangle, Users } from 'lucide-react';

// Generate a consistent color from user ID
function getUserColor(userId: string): string {
  const colors = [
    '#ff4444', '#44ff44', '#4488ff', '#ffff44', '#ff44ff',
    '#44ffff', '#ff8844', '#8844ff', '#44ff88', '#ff4488',
    '#88ff44', '#ff6600', '#00ff66', '#6600ff', '#ff0066',
    '#66ff00', '#0066ff', '#ff9933', '#33ff99', '#9933ff',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'pen' | 'eraser';
  userId?: string;
  username?: string;
}

export const CommunityWhiteboard = () => {
  const { user, isAdmin, sessionToken } = useAuth();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; username: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const assignedColor = user ? getUserColor(user.id) : '#ffffff';

  // Check 24h auto-reset & load persisted strokes
  useEffect(() => {
    const loadStrokes = async () => {
      // Check last reset
      const { data: meta } = await supabase
        .from('community_whiteboard_meta')
        .select('last_reset_at')
        .eq('id', 'singleton')
        .single();

      if (meta) {
        const lastReset = new Date(meta.last_reset_at).getTime();
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (now - lastReset > twentyFourHours && user && isAdmin) {
          // Auto-reset if admin is viewing
          await supabase.rpc('clear_community_whiteboard', {
            p_session_token: sessionToken!,
          });
        }
      }

      // Load all strokes
      const { data } = await supabase
        .from('community_whiteboard_strokes')
        .select('*')
        .order('created_at', { ascending: true });

      if (data) {
        const loaded: Stroke[] = data.map(s => ({
          points: s.points as any as { x: number; y: number }[],
          color: s.color,
          size: s.size,
          tool: s.tool as 'pen' | 'eraser',
          userId: s.user_id || undefined,
          username: s.username || undefined,
        }));
        setStrokes(loaded);
      }
      setLoading(false);
    };

    loadStrokes();
  }, []);

  // Realtime: listen for new strokes and clears via broadcast
  useEffect(() => {
    const channel = supabase
      .channel('community-whiteboard')
      .on('broadcast', { event: 'stroke' }, (payload) => {
        setStrokes(prev => [...prev, payload.payload as Stroke]);
      })
      .on('broadcast', { event: 'clear' }, () => {
        setStrokes([]);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat().map((p: any) => ({
          id: p.user_id,
          username: p.username,
          color: getUserColor(p.user_id),
        }));
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({
            user_id: user.id,
            username: user.username,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleStroke = useCallback(async (stroke: Stroke) => {
    // Broadcast to others
    supabase.channel('community-whiteboard').send({
      type: 'broadcast',
      event: 'stroke',
      payload: stroke,
    });

    // Persist to database
    await supabase.from('community_whiteboard_strokes').insert({
      points: stroke.points as any,
      color: stroke.color,
      size: stroke.size,
      tool: stroke.tool,
      user_id: stroke.userId || null,
      username: stroke.username || null,
    });
  }, []);

  const handleClear = useCallback(async () => {
    if (!user || !isAdmin) return;

    // Call admin clear function
    const { error } = await supabase.rpc('clear_community_whiteboard', {
      p_session_token: sessionToken!,
    });

    if (!error) {
      setStrokes([]);
      // Broadcast clear to everyone
      supabase.channel('community-whiteboard').send({
        type: 'broadcast',
        event: 'clear',
        payload: {},
      });
    }
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-muted-foreground">Loading whiteboard...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Rules banner */}
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        <span className="text-destructive">
          <strong>Rules:</strong> No NSFW, offensive, or hateful content. No spam drawing. Violators will be banned. Board resets every 24 hours.
        </span>
      </div>

      {/* Online users bar */}
      <div className="bg-muted/20 border-b border-border/30 px-4 py-2 flex items-center gap-3 overflow-x-auto">
        <Users className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground shrink-0">{onlineUsers.length} online</span>
        <div className="flex items-center gap-2">
          {onlineUsers.map(u => (
            <div key={u.id} className="flex items-center gap-1 shrink-0">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: u.color }} />
              <span className="text-xs text-foreground">{u.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <WhiteboardCanvas
          assignedColor={assignedColor}
          strokes={strokes}
          onStroke={handleStroke}
          onClear={isAdmin ? handleClear : undefined}
        />
      </div>
    </div>
  );
};
