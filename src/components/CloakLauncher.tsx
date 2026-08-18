import { useState, useEffect } from 'react';
import { ExternalLink, Monitor, AlertTriangle, Terminal } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Launch Options</h1>
          <p className="text-muted-foreground">Choose how you want to access the site</p>
        </div>

        {popupBlocked && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Popup Blocked</p>
              <p className="text-muted-foreground mt-1">
                Please allow popups for this site. Click the popup blocked icon in your browser's address bar, then try again.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Cloaked Launch Option */}
          <button
            onClick={launchCloaked}
            disabled={isLaunching}
            className="w-full p-6 rounded-xl border border-border/50 bg-card hover:bg-accent/10 transition-all duration-300 group text-left"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ExternalLink className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-semibold text-foreground">Launch Cloaked</h3>
                <p className="text-sm text-muted-foreground">
                  Opens in a new tab with about:blank URL. The address bar will show "about:blank" instead of the actual site URL.
                </p>
              </div>
            </div>
          </button>

          {/* Normal Launch Option */}
          <button
            onClick={() => {
              document.documentElement.requestFullscreen?.();
              onContinue();
            }}
            className="w-full p-6 rounded-xl border border-border/50 bg-card hover:bg-accent/10 transition-all duration-300 group text-left"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-muted text-muted-foreground group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                <Monitor className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-semibold text-foreground">Continue Normally</h3>
                <p className="text-sm text-muted-foreground">
                  Continue in fullscreen mode. Press F11 or G to exit fullscreen.
                </p>
              </div>
            </div>
          </button>

          {/* Developer Mode Option */}
          {onDevMode && (
            <button
              onClick={onDevMode}
              className="w-full p-6 rounded-xl border border-border/50 bg-card hover:bg-accent/10 transition-all duration-300 group text-left"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Terminal className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">Developer Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Launch the Star Stream desktop environment with command-line access.
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1 italic">
                    Thank you for the inspiration — source: NautilusOS
                  </p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}