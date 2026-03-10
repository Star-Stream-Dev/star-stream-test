import { useState, useEffect } from 'react';
import { Clock, MessageSquare, Bell, Gamepad2, Timer, Shield, User, TrendingUp, Calendar, Zap, Trophy, Terminal, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer';
import { WidgetEditor } from '@/components/widgets/WidgetEditor';
import { loadLayout, saveLayout } from '@/components/widgets/widgetTypes';
import type { WidgetConfig } from '@/components/widgets/widgetTypes';

interface HomeDashboardProps {
  typewriterText: string;
  onNavigate: (section: string) => void;
  onDevMode?: () => void;
}

interface UserStats {
  totalTime: number;
  gamesPlayed: number;
  sessionsCount: number;
  lastVisit: string | null;
  streak: number;
}

const STATS_KEY = 'solarnova_user_stats';
const GAMES_HISTORY_KEY = 'solarnova_games_history';

export const HomeDashboard = ({ typewriterText, onNavigate, onDevMode }: HomeDashboardProps) => {
  const { user, isAdmin, sessionToken } = useAuth();
  const { glassEnabled } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadMessage, setUnreadMessage] = useState<{ from: string; message: string } | null>(null);
  const [recentGames, setRecentGames] = useState<{ thumbnail: string; title: string; id: string }[]>([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [sessionStart] = useState(Date.now());
  const [userStats, setUserStats] = useState<UserStats>({
    totalTime: 0,
    gamesPlayed: 0,
    sessionsCount: 1,
    lastVisit: null,
    streak: 1
  });

  // Widget layout
  const [layout, setLayout] = useState<WidgetConfig[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Load layout on mount
  useEffect(() => {
    if (user) {
      setLayout(loadLayout(user.id));
    }
  }, [user]);

  const handleSaveLayout = () => {
    if (user) {
      saveLayout(user.id, layout);
    }
  };

  // Load and update persistent stats
  useEffect(() => {
    if (!user) return;
    const statsKey = `${STATS_KEY}_${user.id}`;
    const savedStats = localStorage.getItem(statsKey);
    const today = new Date().toDateString();
    if (savedStats) {
      const parsed: UserStats = JSON.parse(savedStats);
      const lastVisitDate = parsed.lastVisit ? new Date(parsed.lastVisit).toDateString() : null;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let newStreak = parsed.streak;
      if (lastVisitDate === yesterday) newStreak = parsed.streak + 1;
      else if (lastVisitDate !== today) newStreak = 1;
      const updatedStats = { ...parsed, sessionsCount: lastVisitDate === today ? parsed.sessionsCount : parsed.sessionsCount + 1, lastVisit: today, streak: newStreak };
      setUserStats(updatedStats);
      localStorage.setItem(statsKey, JSON.stringify(updatedStats));
    } else {
      const newStats = { totalTime: 0, gamesPlayed: 0, sessionsCount: 1, lastVisit: today, streak: 1 };
      setUserStats(newStats);
      localStorage.setItem(statsKey, JSON.stringify(newStats));
    }
  }, [user]);

  // Save session time periodically
  useEffect(() => {
    if (!user) return;
    const statsKey = `${STATS_KEY}_${user.id}`;
    const interval = setInterval(() => {
      const savedStats = localStorage.getItem(statsKey);
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        const updated = { ...parsed, totalTime: parsed.totalTime + 10 };
        localStorage.setItem(statsKey, JSON.stringify(updated));
        setUserStats(updated);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [user, sessionStart]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const lastRead = localStorage.getItem(`announcements_last_read_${user?.id}`);
      const lastReadDate = lastRead ? new Date(lastRead) : new Date(0);
      const { count } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastReadDate.toISOString());
      setUnreadAnnouncements(count || 0);
    };
    if (user) fetchAnnouncements();
  }, [user]);

  useEffect(() => {
    const fetchUnreadDM = async () => {
      if (!user) return;
      const { data } = await supabase.rpc('get_my_unread_dms', {
        p_user_id: user.id,
      });
      if (data && data.length > 0) {
        setUnreadMessage({
          from: data[0].sender_username,
          message: data[0].message.length > 50 ? data[0].message.substring(0, 50) + '...' : data[0].message
        });
      }
    };
    fetchUnreadDM();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const historyKey = `${GAMES_HISTORY_KEY}_${user.id}`;
    const history = localStorage.getItem(historyKey);
    if (history) {
      try { setRecentGames(JSON.parse(history).slice(0, 3)); } catch {}
    }
  }, [user]);

  const glassStyle = glassEnabled ? {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
  } : {
    background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 100%)',
    border: '1px solid hsl(var(--primary) / 0.15)',
  };

  const visibleWidgets = layout.filter(w => w.visible);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Typewriter Title */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2 text-center text-gradient">
        {typewriterText}
        <span className="animate-pulse text-primary">|</span>
      </h1>
      <p className="text-center text-muted-foreground text-sm mb-2">Hub for all games • made by p0tato and Dannygo</p>
      <div className="flex justify-center mb-6">
        <span className="inline-block px-3 py-1 bg-primary/20 text-primary text-xs rounded-full border border-primary/30">
          ✨ Now with encrypted chatrooms
        </span>
      </div>

      {/* Edit button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary hover:bg-primary/20 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit Widgets
        </button>
      </div>

      {/* Widget Grid */}
      <div className="rounded-3xl p-6 md:p-8" style={glassStyle}>
        <div className="grid grid-cols-4 gap-4">
          {visibleWidgets.map(widget => (
            <div
              key={widget.id}
              className={`col-span-${widget.colSpan || 1}`}
              style={{ gridColumn: `span ${widget.colSpan || 1}` }}
            >
              <WidgetRenderer
                widget={widget}
                onNavigate={onNavigate}
                sessionTime={sessionTime}
                userStats={userStats}
                recentGames={recentGames}
                currentTime={currentTime}
                unreadAnnouncements={unreadAnnouncements}
                unreadMessage={unreadMessage}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Developer Mode button */}
      {onDevMode && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onDevMode}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all text-xs"
          >
            <Terminal className="w-3.5 h-3.5" />
            Developer Mode
          </button>
        </div>
      )}

      {/* Widget Editor Modal */}
      {isEditing && (
        <WidgetEditor
          layout={layout}
          onChange={setLayout}
          onClose={() => setIsEditing(false)}
          onSave={handleSaveLayout}
        />
      )}
    </div>
  );
};
