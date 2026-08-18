import { useState, useEffect } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';

const DISCLAIMER_KEY = 'starstream_disclaimer_accepted';

interface DisclaimerModalProps {
  onAccept: () => void;
  onDeny: () => void;
}

export function DisclaimerModal({ onAccept, onDeny }: DisclaimerModalProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-4">
      {/* Background with stars effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-muted-foreground/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Logo */}
        <h1 className="text-5xl md:text-6xl font-bold italic text-primary mb-8 tracking-wide">
          Star Stream
        </h1>

        {/* Disclaimer text */}
        <div className="space-y-6 mb-10">
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
            This website was not created for the purpose of use during{' '}
            <span className="italic">instructional time</span>, please refrain from using Star Stream during{' '}
            <span className="italic">instructional periods</span>. By clicking accept, you agree to this.
          </p>

          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
            This website complies with{' '}
            <span className="text-primary underline decoration-primary/50">MCPSMD Internet Safety Practices</span>
          </p>

          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
            Meaning using the website link sections of this website as a student{' '}
            <span className="italic">during instructional time</span> is a violation of{' '}
            <span className="text-primary underline decoration-primary/50">MCPSMD SCOC</span>{' '}
            <span className="text-muted-foreground/80">(Student Code of Conduct)</span>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onAccept}
            className="px-8 py-3 bg-muted/30 hover:bg-muted/50 border border-border/50 rounded-lg text-foreground font-medium transition-all hover:scale-105"
          >
            Accept
          </button>
          <button
            onClick={onDeny}
            className="px-8 py-3 bg-muted/30 hover:bg-destructive/20 border border-border/50 hover:border-destructive/50 rounded-lg text-foreground hover:text-destructive font-medium transition-all hover:scale-105"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}

export function useDisclaimer() {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    const accepted = localStorage.getItem(DISCLAIMER_KEY);
    setHasAccepted(accepted === 'true');
  }, []);

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    setHasAccepted(true);
  };

  const handleDeny = () => {
    // Close the website
    window.location.href = 'https://www.google.com';
  };

  return { hasAccepted, handleAccept, handleDeny };
}
