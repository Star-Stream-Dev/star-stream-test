import { useState, useEffect } from 'react';
import { Clock, MessageSquare, Bell, Gamepad2, Timer, Shield, User, TrendingUp, Zap, Trophy, Calendar, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import type { WidgetConfig } from './widgetTypes';

interface WidgetRendererProps {
  widget: WidgetConfig;
  onNavigate: (section: string) => void;
  sessionTime: number;
  userStats: { totalTime: number; gamesPlayed: number; sessionsCount: number; streak: number };
  recentGames: { thumbnail: string; title: string; id: string }[];
  currentTime: Date;
  unreadAnnouncements: number;
  unreadMessage: { from: string; message: string } | null;
  isEditing?: boolean;
}

export function WidgetRenderer({
  widget, onNavigate, sessionTime, userStats, recentGames,
  currentTime, unreadAnnouncements, unreadMessage, isEditing
}: WidgetRendererProps) {
  const { user, isAdmin } = useAuth();
  const { glassEnabled } = useTheme();

  const baseClass = `rounded-2xl p-4 bg-primary/5 border border-primary/10 ${isEditing ? 'pointer-events-none opacity-80' : ''}`;

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };
  const formatSessionTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  switch (widget.type) {
    case 'clock':
      return (
        <div className={baseClass}>
          <div className="flex items-center gap-4">

            <div className="flex-1">
              <p className="text-3xl font-bold text-foreground font-mono tracking-tight">{formatTime(currentTime)}</p>
              <p className="text-sm text-muted-foreground">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10">
              <Clock className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      );

    case 'welcome':
      return (
        <div className={baseClass}>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isAdmin
                  ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.3) 0%, rgba(234, 179, 8, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.1) 100%)'
              }}
            >
              {isAdmin ? <Shield className="w-7 h-7 text-yellow-400" /> : <User className="w-7 h-7 text-primary" />}
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Welcome back,</p>
              <p className="text-2xl font-bold text-foreground">{user?.username}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isAdmin ? 'bg-yellow-500/20 text-yellow-400' : 'bg-primary/20 text-primary'}`}>
                {isAdmin ? 'Admin' : 'User'}
              </span>
            </div>
          </div>
        </div>
      );

    case 'stats':
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl p-4 bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">This Session</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatSessionTime(sessionTime)}</p>
          </div>
          <div className="rounded-2xl p-4 bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Total Time</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatDuration(userStats.totalTime)}</p>
          </div>
          <div className="rounded-2xl p-4 bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Gamepad2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Games Played</span>
            </div>
            <p className="text-xl font-bold text-foreground">{userStats.gamesPlayed}</p>
          </div>
          <div className="rounded-2xl p-4 bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-muted-foreground">Day Streak</span>
            </div>
            <p className="text-xl font-bold text-foreground">{userStats.streak} 🔥</p>
          </div>
        </div>
      );

    case 'recent-games':
      return (
        <button
          onClick={() => onNavigate('games')}
          className={`${baseClass} text-left transition-all duration-300 hover:bg-primary/10 hover:scale-[1.01] active:scale-[0.99] w-full`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Recent Games</span>
            </div>
            <span className="text-xs text-muted-foreground">Click to play →</span>
          </div>
          <div className="flex gap-3">
            {recentGames.length > 0 ? (
              recentGames.map((game, i) => (
                <div key={game.id || i} className="w-20 h-20 rounded-xl overflow-hidden bg-muted/50 flex-shrink-0">
                  <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
                </div>
              ))
            ) : (
              [1, 2, 3].map((i) => (
                <div key={i} className="w-20 h-20 rounded-xl bg-muted/30 flex items-center justify-center flex-shrink-0">
                  <Gamepad2 className="w-6 h-6 text-muted-foreground/30" />
                </div>
              ))
            )}
          </div>
        </button>
      );

    case 'announcements':
      return (
        <button
          onClick={() => onNavigate('announcements')}
          className={`${baseClass} text-left transition-all duration-300 hover:bg-primary/10 hover:scale-[1.01] active:scale-[0.99] w-full`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${unreadAnnouncements > 0 ? 'bg-pink-500/20' : 'bg-primary/20'}`}>
              <Bell className={`w-5 h-5 ${unreadAnnouncements > 0 ? 'text-pink-400' : 'text-primary'}`} />
            </div>
            <div>
              <p className="font-semibold text-foreground">Announcements</p>
              <p className="text-xs text-muted-foreground">
                {unreadAnnouncements > 0 ? `${unreadAnnouncements} unread` : 'All caught up'}
              </p>
            </div>
          </div>
          {unreadAnnouncements > 0 && (
            <div className="flex items-center justify-center py-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <span className="text-3xl font-bold text-pink-400">{unreadAnnouncements}</span>
            </div>
          )}
        </button>
      );

    case 'messages':
      return (
        <button
          onClick={() => onNavigate('chatroom')}
          className="rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] w-full"
          style={{
            background: unreadMessage
              ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)'
              : 'rgba(139, 92, 246, 0.05)',
            border: unreadMessage
              ? '1px solid rgba(236, 72, 153, 0.2)'
              : '1px solid rgba(139, 92, 246, 0.1)'
          }}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${unreadMessage ? 'bg-pink-500/20' : 'bg-primary/20'}`}>
              <MessageSquare className={`w-5 h-5 ${unreadMessage ? 'text-pink-400' : 'text-primary'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground mb-1">Messages</p>
              {unreadMessage ? (
                <div className="rounded-lg bg-background/50 p-3">
                  <p className="text-xs text-pink-400 font-medium mb-1">From {unreadMessage.from}</p>
                  <p className="text-sm text-foreground/80">{unreadMessage.message}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No unread messages</p>
              )}
            </div>
          </div>
        </button>
      );

    case 'activity':
      return (
        <div className={baseClass}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Activity</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-xl bg-background/30">
              <p className="text-2xl font-bold text-foreground">{userStats.sessionsCount}</p>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-background/30">
              <p className="text-2xl font-bold text-foreground">
                {Math.round(userStats.totalTime / Math.max(userStats.sessionsCount, 1) / 60)}m
              </p>
              <p className="text-xs text-muted-foreground">Avg. Session</p>
            </div>
          </div>
        </div>
      );

    case 'text':
      return (
        <div className={baseClass}>
          <p className="font-semibold text-foreground mb-2">{widget.title || 'Note'}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{widget.content || 'Double-click to edit in widget editor'}</p>
        </div>
      );

    case 'quick-links':
      return (
        <div className={baseClass}>
          <p className="font-semibold text-foreground mb-3">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            {(widget.links && widget.links.length > 0 ? widget.links : [
              { label: '🎮 Games', target: 'games' },
              { label: '💬 Chat', target: 'chatroom' },
              { label: '📢 News', target: 'announcements' },
            ]).map((link, i) => (
              <button
                key={i}
                onClick={() => onNavigate(link.target)}
                className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm text-foreground hover:bg-primary/20 transition-colors flex items-center gap-1"
              >
                {link.label}
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      );

    case 'streak':
      return (
        <div className={baseClass + ' flex flex-col items-center justify-center'}>
          <Zap className="w-8 h-8 text-orange-400 mb-2" />
          <p className="text-3xl font-bold text-foreground">{userStats.streak}</p>
          <p className="text-xs text-muted-foreground">Day Streak 🔥</p>
        </div>
      );

    case 'embed': {
      const url = (widget.url || '').trim();
      const height = widget.height || 260;
      const safe = /^https?:\/\//i.test(url) ? url : '';
      return (
        <div className={baseClass + ' overflow-hidden'}>
          <div className="flex items-center justify-between mb-2 gap-2">
            <p className="font-semibold text-foreground truncate">{widget.title || 'Embed'}</p>
            {safe && (
              <a
                href={safe}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
              >
                Open <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {safe ? (
            <iframe
              src={safe}
              title={widget.title || 'Embedded content'}
              className="w-full rounded-xl bg-background border border-border/50"
              style={{ height }}
              loading="lazy"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
            />
          ) : (
            <div
              className="w-full rounded-xl border border-dashed border-primary/30 flex items-center justify-center text-xs text-muted-foreground"
              style={{ height }}
            >
              Add a URL in the widget editor
            </div>
          )}
        </div>
      );
    }

    case 'spacer':

      return <div className="min-h-[80px]" />;

    default:
      return <div className={baseClass}><p className="text-muted-foreground">Unknown widget</p></div>;
  }
}
