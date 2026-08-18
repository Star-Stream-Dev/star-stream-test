import { useState, useEffect } from 'react';
import { EyeOff, Scan, AlertTriangle, SquareTerminal } from 'lucide-react';
import starstreamIcon from '@/assets/starstream-icon.png';

interface CloakLauncherProps {
  onContinue: () => void;
  onDevMode?: () => void;
}

// Check if we're running inside an about:blank cloak
const isInCloak = (): boolean => {
  try {
    // If we're in an iframe and parent is about:blank, we're cloaked
    if (window.parent !== window && window.parent.location.href === 'about:blank') {
      return true;
    }
  } catch {
    // Cross-origin access denied means we're likely in a cloak
    if (window.parent !== window) {
      return true;
    }
  }
  return false;
};

export function CloakLauncher({ onContinue, onDevMode }: CloakLauncherProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  // If we're already in a cloak, skip the launcher
  useEffect(() => {
    if (isInCloak()) {
      onContinue();
    }
  }, [onContinue]);

  // Don't render anything if we're in a cloak (will auto-continue)
  if (isInCloak()) {
    return null;
  }

  const launchCloaked = () => {
    setIsLaunching(true);
    setPopupBlocked(false);
    
    const newWindow = window.open('about:blank', '_blank');
    if (newWindow) {
      const currentUrl = window.location.href;
      
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google</title>
            <link rel="icon" href="https://www.google.com/favicon.ico">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { height: 100%; overflow: hidden; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${currentUrl}" allow="fullscreen; autoplay; encrypted-media; clipboard-write; clipboard-read" allowfullscreen></iframe>
          </body>
        </html>
      `);
      newWindow.document.close();
      
      // Close the original tab
      window.close();
    } else {
      // Popup was blocked
      setPopupBlocked(true);
    }
    
    setIsLaunching(false);
  };

  const cardClass =
    'group h-full text-left rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/60 hover:bg-card hover:-translate-y-1 hover:shadow-[0_20px_45px_-25px_hsl(var(--primary)/0.9)] disabled:opacity-60';

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-5xl space-y-10">
        <div className="text-center space-y-4">
          <img
            src={starstreamIcon}
            alt="Star Stream"
            width={512}
            height={512}
            className="w-12 h-12 mx-auto drop-shadow-[0_0_18px_hsl(var(--primary)/0.8)]"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-[0.35em]">
            Launch Options
          </h1>
          <p className="text-muted-foreground text-sm md:text-base tracking-wide">
            Choose how you want to access the site
          </p>
        </div>

        {popupBlocked && (
          <div className="max-w-2xl mx-auto p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Popup Blocked</p>
              <p className="text-muted-foreground mt-1">
                Please allow popups for this site. Click the popup blocked icon in your browser's address bar, then try again.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3 items-stretch">
          {/* Cloaked Launch Option */}
          <button
            onClick={launchCloaked}
            disabled={isLaunching}
            className={cardClass}
          >
            <EyeOff className="w-6 h-6 text-primary mb-6" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Launch Cloaked</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Opens in a new tab with about:blank URL. The address bar will show "about:blank" instead of the actual site URL.
            </p>
          </button>

          {/* Normal Launch Option */}
          <button
            onClick={() => {
              document.documentElement.requestFullscreen?.();
              onContinue();
            }}
            className={cardClass}
          >
            <Scan className="w-6 h-6 text-primary mb-6" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Continue Normally</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Continue in fullscreen mode. Press F11 or G to exit fullscreen.
            </p>
          </button>

          {/* Developer Mode Option */}
          {onDevMode && (
            <button
              onClick={onDevMode}
              className={cardClass}
            >
              <SquareTerminal className="w-6 h-6 text-primary mb-6" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Developer Mode</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Launch the Star Stream OS desktop environment with command-line access.
              </p>
            </button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/70 tracking-wide">
          Thank you for the inspiration — source: NautilusOS
        </p>
      </div>
    </div>
  );
}