import { useState, useEffect, useCallback } from 'react';
import starstreamIcon from '@/assets/starstream-icon.png';

interface BootScreenProps {
  onComplete: () => void;
  onDevMode: () => void;
}

const BOOT_MESSAGES = [
  { prefix: '[OK]', text: 'Starting boot sequence for Star Stream...' },
  { prefix: '[OK]', text: 'Initializing kernel modules...' },
  { prefix: '[OK]', text: 'Loading system configuration...' },
  { prefix: '[OK]', text: 'Running startup functions...' },
  { prefix: '[OK]', text: '- initializeAuth()' },
  { prefix: '[OK]', text: '- startLoginClock()' },
  { prefix: '[OK]', text: '- updateLoginClock()' },
  { prefix: '[OK]', text: '- displayBrowserInfo()' },
  { prefix: '[OK]', text: '- updateUptime()' },
  { prefix: '[OK]', text: '- loadUserProfiles()' },
  { prefix: '[OK]', text: '- initializeDatabase()' },
  { prefix: '[OK]', text: '- connectToServices()' },
  { prefix: '[OK]', text: '- loadThemeEngine()' },
  { prefix: '[OK]', text: '- initializeRealtime()' },
  { prefix: '[OK]', text: '- updateLoginGreeting()' },
  { prefix: '[OK]', text: 'All systems operational.' },
  { prefix: '[OK]', text: 'Launching Star Stream...' },
];

export function BootScreen({ onComplete, onDevMode }: BootScreenProps) {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [showDevHint, setShowDevHint] = useState(true);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        // Don't intercept browser dev tools
        return;
      }
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        onDevMode();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDevMode]);

  useEffect(() => {
    const totalMessages = BOOT_MESSAGES.length;
    const messageInterval = 120;
    
    const timer = setInterval(() => {
      setVisibleMessages(prev => {
        const next = prev + 1;
        setProgress((next / totalMessages) * 100);
        
        if (next >= totalMessages) {
          clearInterval(timer);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 600);
          }, 400);
        }
        return next;
      });
    }, messageInterval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[400] bg-[hsl(220,20%,10%)] flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* Logo */}
      <div className="mb-2">
        <img src={starstreamIcon} alt="Star Stream" className="w-16 h-16 mx-auto" />
      </div>
      <h1 className="text-2xl font-mono font-bold tracking-[0.3em] text-foreground mb-1">
        STAR STREAM
      </h1>
      <p className="text-sm text-muted-foreground font-mono mb-8">Version 3.0</p>

      {/* Progress bar */}
      <div className="w-[90%] max-w-2xl mb-8">
        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Boot messages */}
      <div className="w-[90%] max-w-2xl h-64 overflow-hidden font-mono text-sm">
        {BOOT_MESSAGES.slice(0, visibleMessages).map((msg, i) => (
          <div
            key={i}
            className="flex gap-2 leading-relaxed"
            style={{ opacity: i < visibleMessages - 3 ? 0.4 : 1, transition: 'opacity 0.3s' }}
          >
            <span className="text-primary font-bold shrink-0">{msg.prefix}</span>
            <span className="text-muted-foreground">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Dev mode hint */}
      {showDevHint && (
        <div className="absolute bottom-6 text-center">
          <p className="text-muted-foreground/40 text-xs font-mono animate-pulse">
            Press ` (backtick) for Developer Mode
          </p>
        </div>
      )}
    </div>
  );
}
