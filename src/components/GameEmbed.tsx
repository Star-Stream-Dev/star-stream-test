import { X, AlertTriangle, ExternalLink } from 'lucide-react';
import { GameOverlayBar } from './GameOverlayBar';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AgeVerificationModal, useAgeVerification } from './AgeVerificationModal';
import { isBlockedContent } from '@/lib/blockedContentIds';
import { toast } from 'sonner';
import { useGameProgress } from '@/hooks/useGameProgress';

interface GameEmbedProps {
  url: string;
  title: string;
  gameId?: string;
  onClose: () => void;
}

export function GameEmbed({ url, title, gameId, onClose }: GameEmbedProps) {
  const { startGameSession, updatePlayTime } = useGameProgress();
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const playTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { handleConfirm, handleDeny } = useAgeVerification();

  // Check if this is the mathepic streaming site (requires 18+ verification)
  const isMathepicSite = useMemo(() => {
    try {
      const u = new URL(url);
      return u.hostname === 'mathepic.tuvnord.hk';
    } catch {
      return false;
    }
  }, [url]);

  const isAstraClient = useMemo(() => {
    try {
      const u = new URL(url);
      return u.hostname === 'astraclient.com';
    } catch {
      return false;
    }
  }, [url]);

  // Start game session when component mounts
  useEffect(() => {
    startGameSession(url, title, gameId);
    
    // Update play time every 60 seconds
    playTimeIntervalRef.current = setInterval(() => {
      updatePlayTime(url, 60);
    }, 60000);

    return () => {
      // Save final play time on unmount
      const playedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      const remainingSeconds = playedSeconds % 60; // Time not yet saved by interval
      if (remainingSeconds > 10) { // Only save if played more than 10 seconds
        updatePlayTime(url, remainingSeconds);
      }
      
      if (playTimeIntervalRef.current) {
        clearInterval(playTimeIntervalRef.current);
      }
    };
  }, [url, title, gameId, startGameSession, updatePlayTime, sessionStartTime]);

  // Check age verification on mount for mathepic
  useEffect(() => {
    if (!isMathepicSite) return;
    
    const STORAGE_KEY = 'tv_movies_age_verified';
    const verified = sessionStorage.getItem(STORAGE_KEY) === 'true';
    if (verified) {
      setIsVerified(true);
    } else {
      setShowAgeVerification(true);
    }
  }, [isMathepicSite]);

  // Monitor iframe URL changes for blocked content
  const checkIframeUrl = useCallback(() => {
    if (!isMathepicSite) return;
    
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        try {
          const currentUrl = iframe.contentWindow.location.href;
          const result = isBlockedContent(currentUrl);
          if (result.blocked) {
            setIsBlocked(true);
            setViolationCount(prev => {
              const newCount = prev + 1;
              if (newCount >= 3) {
                toast.error('Multiple content policy violations. Session terminated.');
                setTimeout(() => {
                  window.location.href = 'https://www.google.com';
                }, 1000);
              } else {
                toast.error(result.reason || 'This content is restricted');
              }
              return newCount;
            });
          } else {
            setIsBlocked(false);
          }
        } catch {
          // Cross-origin error
        }
      }
    } catch {
      // Silent fail
    }
  }, [isMathepicSite]);

  // Poll for URL changes
  useEffect(() => {
    if (!isMathepicSite) return;
    
    const interval = setInterval(checkIframeUrl, 2000);
    return () => clearInterval(interval);
  }, [checkIframeUrl, isMathepicSite]);

  // Listen for messages from iframe
  useEffect(() => {
    if (!isMathepicSite) return;
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object' && event.data.url) {
        const result = isBlockedContent(event.data.url);
        if (result.blocked) {
          setIsBlocked(true);
          setViolationCount(prev => prev + 1);
          toast.error(result.reason || 'This content is restricted');
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isMathepicSite]);

  // Monitor for content filter violations
  useEffect(() => {
    if (violationCount >= 3) {
      toast.error('Multiple content policy violations detected. Session terminated.');
      setTimeout(() => {
        window.location.href = 'https://www.google.com';
      }, 1500);
    }
  }, [violationCount]);

  const handleAgeConfirm = () => {
    handleConfirm();
    setIsVerified(true);
    setShowAgeVerification(false);
  };

  const handleAgeDeny = () => {
    handleDeny();
  };

  // Show age verification for mathepic if not verified
  if (isMathepicSite && showAgeVerification && !isVerified) {
    return <AgeVerificationModal onConfirm={handleAgeConfirm} onDeny={handleAgeDeny} />;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header - transparent with just X */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-end px-4 z-20">
        <div className="flex items-center gap-2">
          {isMathepicSite && violationCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/20 text-destructive text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>{3 - violationCount} warnings left</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Third-Party Disclaimer Banner for mathepic */}
      {isMathepicSite && (
        <div className="absolute top-14 left-0 right-0 bg-muted/50 border-b border-border/30 px-4 py-2 z-10">
          <p className="text-center text-xs text-muted-foreground">
            <span className="font-medium">Disclaimer:</span> This content is provided through a third-party embedded service. Star Stream does not own, operate, or control the embedded website. 
            We are not responsible for the content, availability, or any issues arising from the use of this third-party service.
          </p>
        </div>
      )}

      {/* Blocked Content Overlay */}
      {isBlocked && (
        <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Content Blocked</h2>
            <p className="text-muted-foreground">
              This content has been restricted due to our content policy. 
              Please navigate to appropriate content.
            </p>
            <button
              onClick={() => {
                setIsBlocked(false);
                if (iframeRef.current) {
                  iframeRef.current.src = url;
                }
              }}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Load Error Fallback */}
      {loadError && (
        <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Failed to Load Game</h2>
            <p className="text-muted-foreground text-sm">
              The game could not be loaded. This may happen if the game files are missing or the bundle was not uploaded correctly.
            </p>
            <p className="text-xs text-muted-foreground/70 font-mono break-all">{url}</p>
            <div className="flex gap-3 justify-center">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Directly
              </a>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={url}
        title={title}
        className={`w-full h-full ${isMathepicSite ? 'pt-24' : ''}`}
        allow="fullscreen; autoplay; encrypted-media"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
        allowFullScreen
        onError={() => setLoadError(true)}
      />

      {/* Overlay bar for music and chat - hidden for Astra Client */}
      {!isAstraClient && <GameOverlayBar />}
    </div>
  );
}
