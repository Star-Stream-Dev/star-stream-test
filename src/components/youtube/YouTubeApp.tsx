import { useState, useEffect } from 'react';
import { YouTubeHome } from './YouTubeHome';
import { YouTubeShorts } from './YouTubeShorts';
import { YouTubeWatch } from './YouTubeWatch';
import { YouTubeHistory } from './YouTubeHistory';
import { Home, Flame, Film, History, Youtube } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { setAlgorithmSessionToken, loadAlgorithmStateFromDB } from '@/lib/shortsAlgorithm';

type View = 'home' | 'shorts' | 'watch' | 'history';

interface YouTubeAppProps {
  onClose?: () => void;
}

export function YouTubeApp({ onClose }: YouTubeAppProps) {
  const { user, sessionToken } = useAuth();
  const [view, setView] = useState<View>('home');
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize algorithm DB sync on mount
  useEffect(() => {
    setAlgorithmSessionToken(sessionToken);
    if (sessionToken && user?.id) {
      // Load from DB and cache locally (async, won't block render)
      loadAlgorithmStateFromDB(sessionToken, user.id).catch(() => {});
    }
    return () => { setAlgorithmSessionToken(null); };
  }, [sessionToken, user?.id]);

  const handleVideoSelect = (videoId: string) => {
    setCurrentVideoId(videoId);
    setView('watch');
  };

  const handleBack = () => {
    if (view === 'shorts' || view === 'history') {
      setView('home');
    } else {
      setView('home');
      setCurrentVideoId(null);
    }
  };

  const handleShortsClick = () => {
    setView('shorts');
  };
  
  const isShorts = view === 'shorts';

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500">
            <Youtube className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">YouTube</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {view !== 'shorts' && (
          <nav className="hidden md:flex w-20 flex-col items-center py-4 gap-2 border-r border-border/50">
            <button
              onClick={() => { setView('home'); setCurrentVideoId(null); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors w-16 ${
                view === 'home' && !currentVideoId ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px]">Home</span>
            </button>
            <button
              onClick={handleShortsClick}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors w-16 ${
                isShorts ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Flame className="w-5 h-5" />
              <span className="text-[10px]">Shorts</span>
            </button>
            <button
              className="flex flex-col items-center gap-1 p-3 rounded-xl transition-colors w-16 text-muted-foreground hover:bg-muted/50"
            >
              <Film className="w-5 h-5" />
              <span className="text-[10px]">Subs</span>
            </button>
            <button
              onClick={() => setView('history')}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors w-16 ${
                view === 'history' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="text-[10px]">History</span>
            </button>
          </nav>
        )}

      {/* Content Area */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {view === 'home' && !currentVideoId && (
            <YouTubeHome
              onVideoSelect={handleVideoSelect}
              onShortsClick={handleShortsClick}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}
          {view === 'shorts' && (
            <YouTubeShorts onBack={handleBack} />
          )}
          {view === 'watch' && currentVideoId && (
            <YouTubeWatch
              videoId={currentVideoId}
              onBack={handleBack}
              onVideoSelect={handleVideoSelect}
            />
          )}
          {view === 'history' && (
            <YouTubeHistory
              onVideoSelect={handleVideoSelect}
              onBack={handleBack}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {view !== 'shorts' && (
        <nav className="md:hidden flex items-center justify-around py-2 border-t border-border/50 bg-background">
          <button
            onClick={() => { setView('home'); setCurrentVideoId(null); }}
            className={`flex flex-col items-center gap-1 p-2 ${
              view === 'home' && !currentVideoId ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </button>
          <button
            onClick={handleShortsClick}
            className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
          >
            <Flame className="w-5 h-5" />
            <span className="text-[10px]">Shorts</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Film className="w-5 h-5" />
            <span className="text-[10px]">Subs</span>
          </button>
          <button
            onClick={() => setView('history')}
            className={`flex flex-col items-center gap-1 p-2 ${
              view === 'history' ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px]">History</span>
          </button>
        </nav>
      )}
    </div>
  );
}
