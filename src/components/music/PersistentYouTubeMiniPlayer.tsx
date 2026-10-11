import { Play, Pause, SkipBack, SkipForward, X, Music2 } from 'lucide-react';
import { useYouTubeMusic } from '@/contexts/YouTubeMusicContext';

interface PersistentYouTubeMiniPlayerProps {
  onExpand?: () => void;
}

export function PersistentYouTubeMiniPlayer({ onExpand }: PersistentYouTubeMiniPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    playNext,
    playPrevious,
    progress,
    playerReady,
  } = useYouTubeMusic();

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-[var(--app-dock-space)] left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl shadow-2xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-red-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-3 flex items-center gap-3">
        {/* Album art */}
        <div 
          className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer group"
          onClick={onExpand}
        >
          <img
            src={currentTrack.thumbnail || '/placeholder.svg'}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Music2 className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0" onClick={onExpand}>
          <p className="text-sm font-medium text-foreground truncate cursor-pointer hover:text-red-500 transition-colors">
            {currentTrack.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={playPrevious}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlayPause}
            disabled={!playerReady}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
          <button
            onClick={playNext}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
