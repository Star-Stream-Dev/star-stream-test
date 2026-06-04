import { X } from 'lucide-react';

interface TVMoviesPlayerProps {
  onClose: () => void;
}

export function TVMoviesPlayer({ onClose }: TVMoviesPlayerProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-background/90 backdrop-blur-lg border-b border-border/30 flex items-center justify-between px-4 z-20">
        <h2 className="text-lg font-bold text-foreground">TV & Movies</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 text-foreground transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* AdSense ad slot */}
      <div className="absolute inset-0 pt-14 flex items-center justify-center p-4">
        <div className="w-full h-full rounded-xl border border-dashed border-border/40 bg-muted/10 flex items-center justify-center">
          {/* Google AdSense ad unit goes here */}
          <span className="text-sm text-muted-foreground">Advertisement</span>
        </div>
      </div>
    </div>
  );
}
