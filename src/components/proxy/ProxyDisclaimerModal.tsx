import { useState, useEffect } from 'react';
import { AlertTriangle, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PROXY_DISCLAIMER_KEY = 'starstream_proxy_disclaimer_accepted';

interface ProxyDisclaimerModalProps {
  onAccept: () => void;
  onDeny: () => void;
}

export function ProxyDisclaimerModal({ onAccept, onDeny }: ProxyDisclaimerModalProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Background with stars effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-lg w-full bg-card/80 backdrop-blur-lg border border-border/50 rounded-2xl p-6 md:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/20 rounded-xl">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Proxy Browser</h2>
            <span className="text-xs font-semibold text-primary bg-primary/20 px-2 py-0.5 rounded-full">BETA</span>
          </div>
        </div>

        {/* Warning icon */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-accent/20 border border-accent/50 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-accent-foreground flex-shrink-0" />
          <p className="text-sm text-accent-foreground">
            This feature is in beta and may not work perfectly with all websites.
          </p>
        </div>

        {/* Disclaimer text */}
        <div className="space-y-4 mb-6 text-muted-foreground">
          <p>
            The proxy browser allows you to browse websites through Star Stream. By using this feature, you acknowledge:
          </p>
          
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Some websites may not load correctly or at all</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Video streaming and DRM-protected content will not work</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Login sessions may not persist between visits</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Use responsibly and in accordance with school policies</span>
            </li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onDeny}
            className="px-6"
          >
            Go Back
          </Button>
          <Button
            onClick={onAccept}
            className="px-6 bg-primary hover:bg-primary/90"
          >
            I Understand
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useProxyDisclaimer() {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    const accepted = localStorage.getItem(PROXY_DISCLAIMER_KEY);
    setHasAccepted(accepted === 'true');
  }, []);

  const handleAccept = () => {
    localStorage.setItem(PROXY_DISCLAIMER_KEY, 'true');
    setHasAccepted(true);
  };

  const reset = () => {
    setHasAccepted(false);
  };

  return { hasAccepted, handleAccept, reset };
}
