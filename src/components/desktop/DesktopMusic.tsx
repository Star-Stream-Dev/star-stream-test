import { useState, useEffect } from 'react';
import { Music2, Sparkles } from 'lucide-react';
import { YouTubeMusicPlayer } from '@/components/music/YouTubeMusicPlayer';
import starstreamIcon from '@/assets/starstream-icon.png';

let hasLoadedOnce = false;

export function DesktopMusic() {
  const [isLoading, setIsLoading] = useState(!hasLoadedOnce);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    'Connecting to music servers...',
    'Loading your library...',
    'Preparing playback engine...',
    'Curating your feed...',
    'Ready to play...',
  ];

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev >= loadingMessages.length - 1) {
          clearInterval(stepInterval);
          setTimeout(() => {
            setIsLoading(false);
            hasLoadedOnce = true;
          }, 400);
          return prev + 1;
        }
        return prev + 1;
      });
    }, 450);

    return () => clearInterval(stepInterval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[hsl(var(--background))] gap-6">
        {/* Animated music icon */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <Music2 className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        {/* Equalizer bars animation */}
        <div className="flex items-end gap-1 h-6">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full"
              style={{
                animation: `equalizer 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                height: '4px',
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes equalizer {
            0% { height: 4px; }
            100% { height: 24px; }
          }
        `}</style>

        {/* Loading bar */}
        <div className="w-48 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground animate-fade-in flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-primary" />
          {loadingMessages[Math.min(loadingStep, loadingMessages.length - 1)]}
        </p>

        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
          Star Stream Music
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[hsl(var(--background))]">
      <YouTubeMusicPlayer />
    </div>
  );
}
