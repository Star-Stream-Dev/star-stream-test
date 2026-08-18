import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { DiscordChat } from '@/components/DiscordChat';
import starstreamIcon from '@/assets/starstream-icon.png';

let hasLoadedOnce = false;

export function DesktopChat() {
  const [isLoading, setIsLoading] = useState(!hasLoadedOnce);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    'Establishing secure connection...',
    'Loading message history...',
    'Syncing with chat servers...',
    'Preparing your workspace...',
    'Almost ready...',
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
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(stepInterval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[hsl(var(--background))] gap-6">
        {/* Star Stream logo with pulse */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <img src={starstreamIcon} alt="" className="w-10 h-10" />
          </div>
        </div>

        {/* Loading bar */}
        <div className="w-48 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
          />
        </div>

        {/* Loading text with fade */}
        <div className="h-6 flex items-center">
          <p className="text-xs text-muted-foreground animate-fade-in flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            {loadingMessages[loadingStep]}
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
          Star Stream Chat
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))]">
      <DiscordChat />
    </div>
  );
}
