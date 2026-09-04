import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, MessageSquare, Bell, Gamepad2, Timer, Shield, User, TrendingUp, Calendar, Zap, Trophy, Terminal, Pencil, Move } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer';
import { WidgetEditor } from '@/components/widgets/WidgetEditor';
import { loadLayout, saveLayout, loadFreeMode, saveFreeMode, seedFreePositions } from '@/components/widgets/widgetTypes';
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

const STATS_KEY = 'starstream_user_stats';
const GAMES_HISTORY_KEY = 'starstream_games_history';

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
  const [jiggle, setJiggle] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [freeMode, setFreeMode] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const pendingId = useRef<string | null>(null);
  const layoutRef = useRef<WidgetConfig[]>([]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const grabOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const freeModeRef = useRef(false);
  layoutRef.current = layout;
  freeModeRef.current = freeMode;

  // Load layout on mount
  useEffect(() => {
    if (user) {
      const free = loadFreeMode(user.id);
      setFreeMode(free);
      const loaded = loadLayout(user.id);
      setLayout(free ? seedFreePositions(loaded) : loaded);
    }
  }, [user]);

  const toggleFreeMode = () => {
    if (!user) return;
    const next = !freeMode;
    setFreeMode(next);
    saveFreeMode(user.id, next);
    if (next) {
      const seeded = seedFreePositions(layoutRef.current);
      setLayout(seeded);
      saveLayout(user.id, seeded);
    }
    setJiggle(false);
    setDragId(null);
  };

  const handleSaveLayout = () => {
    if (user) {
      saveLayout(user.id, layout);
    }
  };

  const persist = useCallback((next: WidgetConfig[]) => {
    if (user) saveLayout(user.id, next);
  }, [user]);

  const reorder = useCallback((fromId: string, toId: string) => {
    setLayout(prev => {
      const from = prev.findIndex(w => w.id === fromId);
      const to = prev.findIndex(w => w.id === toId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pendingId.current = null;
  };

  const rememberGrabOffset = (e: React.PointerEvent) => {
    const cell = (e.currentTarget as HTMLElement).getBoundingClientRect();
    grabOffset.current = { dx: e.clientX - cell.left, dy: e.clientY - cell.top };
  };

  const moveFree = useCallback((id: string, clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setLayout(prev => prev.map(w => {
      if (w.id !== id) return w;
      const width = w.w ?? 50;
      const leftPx = clientX - rect.left - grabOffset.current.dx;
      const topPx = clientY - rect.top - grabOffset.current.dy;
      const xPct = Math.max(0, Math.min(100 - width, (leftPx / rect.width) * 100));
      return { ...w, x: Math.round(xPct * 10) / 10, y: Math.max(0, Math.round(topPx)) };
    }));
  }, []);

  const onWidgetPointerDown = (e: React.PointerEvent, id: string) => {
    if ((e.target as HTMLElement).closest('a,button,input,select,textarea,iframe')) return;
    startPoint.current = { x: e.clientX, y: e.clientY };
    rememberGrabOffset(e);
    if (jiggle) {
      setDragId(id);
      return;
    }
    pendingId.current = id;
    longPressTimer.current = window.setTimeout(() => {
      setJiggle(true);
      setDragId(pendingId.current);
      if (navigator.vibrate) navigator.vibrate(10);
    }, 400);
  };

  // Global drag tracking (works with touch, pen and mouse)
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragId) {
        if (longPressTimer.current && startPoint.current) {
          const dx = Math.abs(e.clientX - startPoint.current.x);
          const dy = Math.abs(e.clientY - startPoint.current.y);
          if (dx > 10 || dy > 10) cancelLongPress();
        }
        return;
      }
      e.preventDefault();
      if (freeModeRef.current) {
        moveFree(dragId, e.clientX, e.clientY);
        return;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const cell = el?.closest('[data-widget-id]') as HTMLElement | null;
      const targetId = cell?.dataset.widgetId;
      if (targetId && targetId !== dragId) reorder(dragId, targetId);
    };
    const handleUp = () => {
      cancelLongPress();
      if (dragId) {
        setDragId(null);
        persist(layoutRef.current);
      }
    };
    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragId, reorder, persist, moveFree]);


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
        p_session_token: sessionToken!,
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
  const canvasHeight = Math.max(
    600,
    ...visibleWidgets.map(w => (w.y ?? 0) + (w.type === 'embed' ? (w.height || 260) + 120 : 200))
  );

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
      <div className="flex justify-end items-center gap-2 mb-3 flex-wrap">
        {jiggle ? (
          <button
            onClick={() => { setJiggle(false); setDragId(null); persist(layout); }}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
          >
            Done
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {freeMode ? 'Hold a widget to move it anywhere' : 'Hold a widget to rearrange'}
          </span>
        )}
        <button
          onClick={toggleFreeMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
            freeMode
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          Free Layout
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary hover:bg-primary/20 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit Widgets
        </button>
      </div>

      {/* Widget canvas */}
      {freeMode ? (
        <div
          ref={canvasRef}
          className="relative rounded-3xl p-3 md:p-6"
          style={{ ...glassStyle, minHeight: canvasHeight }}
        >
          {visibleWidgets.map((widget) => {
            const isDragging = dragId === widget.id;
            return (
              <div
                key={widget.id}
                data-widget-id={widget.id}
                onPointerDown={(e) => onWidgetPointerDown(e, widget.id)}
                onContextMenu={(e) => { if (jiggle) e.preventDefault(); }}
                style={{
                  position: 'absolute',
                  left: `${widget.x ?? 0}%`,
                  top: `${widget.y ?? 0}px`,
                  width: `${widget.w ?? 50}%`,
                  touchAction: jiggle ? 'none' : undefined,
                }}
                className={`min-w-0 rounded-2xl p-1 ${
                  jiggle && !isDragging ? 'animate-jiggle' : ''
                } ${isDragging ? 'scale-105 opacity-90 ring-2 ring-primary/60 shadow-2xl z-20 cursor-grabbing' : ''} ${
                  jiggle ? 'select-none' : ''
                }`}
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
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl p-3 md:p-8" style={glassStyle}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-min">
            {visibleWidgets.map((widget, i) => {
              const desktopSpan = widget.colSpan || 1;
              const mobileSpan = Math.min(desktopSpan, 2);
              const spanClass =
                `${mobileSpan === 2 ? 'col-span-2' : 'col-span-1'} ` +
                `${desktopSpan === 4 ? 'md:col-span-4' : desktopSpan === 3 ? 'md:col-span-3' : desktopSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}`;
              const isDragging = dragId === widget.id;
              return (
                <div
                  key={widget.id}
                  data-widget-id={widget.id}
                  onPointerDown={(e) => onWidgetPointerDown(e, widget.id)}
                  onContextMenu={(e) => { if (jiggle) e.preventDefault(); }}
                  style={{
                    touchAction: jiggle ? 'none' : undefined,
                    animationDelay: `${(i % 4) * 60}ms`,
                  }}
                  className={`${spanClass} min-w-0 rounded-2xl transition-transform duration-200 ${
                    jiggle && !isDragging ? 'animate-jiggle' : ''
                  } ${isDragging ? 'scale-105 opacity-90 ring-2 ring-primary/60 shadow-2xl z-10 cursor-grabbing' : ''} ${
                    jiggle ? 'select-none' : ''
                  }`}
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
              );
            })}
          </div>
        </div>
      )}


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
