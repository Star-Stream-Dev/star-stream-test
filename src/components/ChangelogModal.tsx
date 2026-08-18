import { useState } from 'react';
import { X, Sparkles, CheckCircle2, Zap, Bug, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
  features: string[];
  fixes: string[];
  improvements: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.0',
    date: 'March 8, 2026',
    highlights: ['Star Stream V3 — Major Release 🎉'],
    features: [
      'Real GitHub integration in Star Stream terminal (clone, pull, push)',
      'Resizable desktop windows with edge & corner drag',
      'Admin "Clear Chat" button in global chatroom',
      'Star Stream desktop environment with dual-theme (Windows/macOS)',
      'Persistent music playback across desktop windows',
      'Cross-device file system & pinned apps sync',
    ],
    fixes: [
      'Window overflow clipping fixed for resize handles',
      'Git command routing improved for async operations',
    ],
    improvements: [
      'Desktop windows feel native with full resize support',
      'Edge function proxy for secure GitHub API access',
      'Upgraded overall UI polish and interactions',
    ],
  },
  {
    version: '2.14',
    date: 'January 29, 2026',
    highlights: ['Personal Music Uploads in YouTube Music', 'Cross-device game progress sync'],
    features: [
      'Upload your own MP3s to YouTube Music 🎵',
      'Auto-fetch album art from iTunes/Apple Music',
      'Personal music library synced across devices',
      'Game progress now saves to cloud',
      'Play time tracking for all games',
    ],
    fixes: [
      'Game session data now persists across logins',
    ],
    improvements: [
      'Better music player with user uploads support',
      'Realtime sync for game progress',
    ],
  },
  {
    version: '2.13',
    date: 'January 25, 2026',
    highlights: ['Dedicated FNF Mods section with cool new design'],
    features: [
      'New FNF Mods section with microphone icon 🎤',
      'Admin can add/delete/edit FNF games from Admin Panel',
      'FNF games separated from main Games library',
    ],
    fixes: [
      'Games now properly embed instead of opening in new tabs',
      'Admin thumbnail upload works in FNF section',
    ],
    improvements: [
      'Better game category management',
      'Smoother game loading experience',
    ],
  },
  {
    version: '2.12',
    date: 'January 13, 2026',
    highlights: ['Enhanced transitions and animations throughout the app'],
    features: [
      'Changelog modal on app start',
      'Music auto-continues to next song',
      'Smoother page transitions',
    ],
    fixes: [
      'Music playback now continues automatically',
      'Background settings persist correctly',
    ],
    improvements: [
      'Polished animations site-wide',
      'Better visual feedback on interactions',
    ],
  },
  {
    version: '2.11',
    date: 'January 12, 2026',
    highlights: ['Custom video/image backgrounds'],
    features: [
      'Upload custom background images or videos',
      'Background settings saved to your profile',
    ],
    fixes: [
      'Chat, Music, and YouTube sections display correctly',
    ],
    improvements: [
      'Improved storage handling for backgrounds',
    ],
  },
  {
    version: '2.10',
    date: 'January 11, 2026',
    highlights: ['YouTube Music overhaul'],
    features: [
      'Music listening history',
      'AI-powered song recommendations',
      'Create and manage playlists',
    ],
    fixes: [],
    improvements: [
      'Better music player UI',
    ],
  },
  {
    version: '2.09',
    date: 'January 10, 2026',
    highlights: ['UNO multiplayer game'],
    features: [
      'Play UNO with friends',
      'Real-time multiplayer support',
    ],
    fixes: [],
    improvements: [],
  },
  {
    version: '2.08',
    date: 'January 9, 2026',
    highlights: ['Solar AI assistant'],
    features: [
      'AI-powered study helper',
      'Chat with Solar AI',
    ],
    fixes: [],
    improvements: [],
  },
  {
    version: '2.07',
    date: 'January 8, 2026',
    highlights: ['TV & Movies integration'],
    features: [
      'Watch movies and TV shows',
      'Search for content',
    ],
    fixes: [],
    improvements: [],
  },
  {
    version: '2.06',
    date: 'January 7, 2026',
    highlights: ['Enhanced chatroom'],
    features: [
      'Direct messages with friends',
      'Message reactions with emojis',
      'GIF support in chat',
    ],
    fixes: [],
    improvements: [
      'Real-time message updates',
    ],
  },
  {
    version: '2.05',
    date: 'January 6, 2026',
    highlights: ['Initial V2 release'],
    features: [
      'Complete UI redesign',
      'New game library',
      'YouTube integration',
      'Theme customization',
      'Snowfall effect toggle',
    ],
    fixes: [],
    improvements: [
      'Mobile-first responsive design',
      'Performance optimizations',
    ],
  },
];

export function ChangelogModal() {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={handleDismiss}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Gradient header */}
        <div className="relative px-6 py-5 bg-gradient-primary">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">✨ Star Stream V3 Changelog ✨</h2>
                <p className="text-sm text-white/80">See what's new</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-6 space-y-6">
          {CHANGELOG.map((entry, index) => (
            <div 
              key={entry.version}
              className={`relative pl-6 ${index !== CHANGELOG.length - 1 ? 'pb-6 border-l-2 border-border/50' : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Version dot */}
              <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gradient-primary shadow-glow" />
              
              {/* Version header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-lg font-bold text-foreground">v{entry.version}</span>
                <span className="text-sm text-muted-foreground">{entry.date}</span>
                {index === 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                    Latest
                  </span>
                )}
              </div>

              {/* Highlights */}
              {entry.highlights.length > 0 && (
                <div className="mb-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 text-primary">
                    <Star className="w-4 h-4" />
                    <span className="font-medium text-sm">{entry.highlights.join(', ')}</span>
                  </div>
                </div>
              )}

              {/* Features */}
              {entry.features.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 text-green-400 mb-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">New Features</span>
                  </div>
                  <ul className="space-y-1">
                    {entry.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fixes */}
              {entry.fixes.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 text-amber-400 mb-1.5">
                    <Bug className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Bug Fixes</span>
                  </div>
                  <ul className="space-y-1">
                    {entry.fixes.map((fix, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                        {fix}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {entry.improvements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-blue-400 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Improvements</span>
                  </div>
                  <ul className="space-y-1">
                    {entry.improvements.map((improvement, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border/30">
          <Button
            onClick={handleDismiss}
            className="w-full bg-gradient-primary hover:opacity-90 text-white font-medium transition-all duration-300 hover:shadow-glow"
          >
            Got it, let's go! 🚀
          </Button>
        </div>
      </div>
    </div>
  );
}
