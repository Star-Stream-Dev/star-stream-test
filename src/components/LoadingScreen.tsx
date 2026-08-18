import { useEffect, useState } from 'react';
import starstreamIcon from '@/assets/starstream-icon.png';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Random duration between 1-3 seconds
    const duration = 1000 + Math.random() * 2000;
    const interval = 30; // Update every 30ms
    const increment = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 500); // Wait for fade out
          }, 200);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[300] bg-background flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/20 animate-pulse"
            style={{
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Orbital rings animation */}
      <div className="relative w-48 h-48 mb-8">
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-primary/30 animate-spin"
          style={{ animationDuration: '3s' }}
        />
        {/* Middle ring */}
        <div
          className="absolute inset-4 rounded-full border-2 border-primary/50 animate-spin"
          style={{ animationDuration: '2s', animationDirection: 'reverse' }}
        />
        {/* Inner ring */}
        <div
          className="absolute inset-8 rounded-full border-2 border-primary/70 animate-spin"
          style={{ animationDuration: '1.5s' }}
        />
        
        {/* Center logo with pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <img
              src={starstreamIcon}
              alt="Star Stream"
              className="w-20 h-20 relative z-10 animate-pulse"
              style={{ animationDuration: '2s' }}
            />
          </div>
        </div>

        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0 animate-spin"
            style={{ animationDuration: `${2 + i * 0.5}s` }}
          >
            <div
              className="absolute w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/50"
              style={{
                top: '0%',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />
          </div>
        ))}
      </div>

      {/* Title with glow */}
      <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-8 tracking-wider">
        STAR STREAM
      </h1>

      {/* Progress bar container */}
      <div className="w-64 md:w-80 relative">
        {/* Background bar */}
        <div className="h-2 bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm">
          {/* Progress fill with gradient */}
          <div
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full transition-all duration-100 relative"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
        
        {/* Progress text */}
        <div className="flex justify-between mt-3 text-sm">
          <span className="text-muted-foreground">Loading...</span>
          <span className="text-primary font-mono">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Loading tips */}
      <p className="mt-8 text-muted-foreground/60 text-sm text-center max-w-sm px-4 animate-pulse">
        Preparing your experience...
      </p>

      {/* Custom shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
