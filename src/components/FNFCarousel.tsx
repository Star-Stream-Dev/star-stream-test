import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Play, ChevronLeft, ChevronRight, Mic2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const STATS_KEY = 'starstream_user_stats';
const GAMES_HISTORY_KEY = 'starstream_games_history';

interface Game {
  id?: string;
  title: string;
  description: string;
  url: string;
  preview: string;
  embed?: boolean;
  isTab?: string;
  category: string;
  thumbnail?: string;
}

interface FNFCarouselProps {
  onGameClick: (url: string, title: string, embed?: boolean, isTab?: string) => void;
  onBack?: () => void;
}

const defaultFNFGames: Game[] = [
  {
    title: 'Friday Night Funkin',
    description: 'Test your rhythm skills in epic rap battles with challenging beats.',
    url: 'https://fnfcbn.wasmer.app/',
    preview: 'Original FNF Game',
    embed: true,
    category: 'fnf',
    thumbnail: '/thumbnails/friday-night-funkin.png',
  },
];

export function FNFCarousel({ onGameClick, onBack }: FNFCarouselProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [games, setGames] = useState<Game[]>(defaultFNFGames);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const fetchFNFGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('category', 'fnf')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedGames: Game[] = data.map(g => ({
          id: g.id,
          title: g.title,
          description: g.description,
          url: g.url,
          preview: g.preview,
          embed: g.embed ?? true,
          isTab: g.is_tab || undefined,
          category: g.category,
          thumbnail: g.thumbnail_url || undefined,
        }));
        setGames(mappedGames);
      }
    } catch (error) {
      console.error('Error fetching FNF games:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFNFGames();
  }, []);

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      return game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             game.description.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [games, searchQuery]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [searchQuery]);

  const goToPrevious = useCallback(() => {
    if (isAnimating || filteredGames.length === 0) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === 0 ? filteredGames.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 300);
  }, [isAnimating, filteredGames.length]);

  const goToNext = useCallback(() => {
    if (isAnimating || filteredGames.length === 0) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === filteredGames.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsAnimating(false), 300);
  }, [isAnimating, filteredGames.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  const handleGameClick = (game: Game) => {
    if (!game.isTab && user) {
      const historyKey = `${GAMES_HISTORY_KEY}_${user.id}`;
      const statsKey = `${STATS_KEY}_${user.id}`;
      
      const existing = localStorage.getItem(historyKey);
      let history: { thumbnail: string; title: string; id: string }[] = [];
      if (existing) {
        try {
          history = JSON.parse(existing);
        } catch {}
      }
      
      const newEntry = {
        thumbnail: game.thumbnail || '',
        title: game.title,
        id: game.id || game.title
      };
      history = [newEntry, ...history.filter(g => g.id !== newEntry.id)].slice(0, 10);
      localStorage.setItem(historyKey, JSON.stringify(history));
      
      const statsData = localStorage.getItem(statsKey);
      if (statsData) {
        try {
          const stats = JSON.parse(statsData);
          stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
          localStorage.setItem(statsKey, JSON.stringify(stats));
        } catch {}
      }
    }
    onGameClick(game.url, game.title, game.embed ?? true, game.isTab);
  };

  const getCardStyle = (index: number) => {
    const diff = index - currentIndex;
    const totalGames = filteredGames.length;
    
    let adjustedDiff = diff;
    if (diff > totalGames / 2) adjustedDiff = diff - totalGames;
    if (diff < -totalGames / 2) adjustedDiff = diff + totalGames;

    const isCenter = adjustedDiff === 0;
    const isLeft = adjustedDiff === -1 || (currentIndex === 0 && index === totalGames - 1 && totalGames > 2);
    const isRight = adjustedDiff === 1 || (currentIndex === totalGames - 1 && index === 0 && totalGames > 2);

    if (isCenter) {
      return {
        transform: 'translateX(0) scale(1)',
        zIndex: 30,
        opacity: 1,
      };
    } else if (isLeft) {
      return {
        transform: 'translateX(-120%) scale(0.75)',
        zIndex: 20,
        opacity: 0.6,
      };
    } else if (isRight) {
      return {
        transform: 'translateX(120%) scale(0.75)',
        zIndex: 20,
        opacity: 0.6,
      };
    } else {
      return {
        transform: 'translateX(0) scale(0.5)',
        zIndex: 10,
        opacity: 0,
      };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground">Loading FNF mods...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 rounded-lg bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Mic2 className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-lg" />
            </div>
            <span className="absolute -top-2 -right-2 text-2xl animate-bounce">🎵</span>
            <span className="absolute -bottom-1 -left-2 text-xl animate-bounce" style={{ animationDelay: '0.3s' }}>🎶</span>
          </div>
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Friday Night Funkin'
          </span>
        </h2>
        <p className="text-muted-foreground">
          {filteredGames.length} mods available • Get funky! 🎤
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search FNF mods..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-full pl-12 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Carousel */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-16">
          <Mic2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">No FNF mods found</p>
          <p className="text-muted-foreground/70 text-sm mt-1">Try a different search</p>
        </div>
      ) : (
        <div className="relative">
          {/* Navigation Arrows */}
          <button
            onClick={goToPrevious}
            className="absolute left-0 md:-left-4 top-1/2 -translate-y-1/2 z-40 p-3 md:p-4 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-lg hover:shadow-primary/20"
            aria-label="Previous mod"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-0 md:-right-4 top-1/2 -translate-y-1/2 z-40 p-3 md:p-4 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-lg hover:shadow-primary/20"
            aria-label="Next mod"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
          </button>

          {/* Cards Container */}
          <div className="relative h-[480px] md:h-[520px] flex items-center justify-center overflow-hidden mx-12 md:mx-16">
            {filteredGames.map((game, index) => {
              const style = getCardStyle(index);
              const isCenter = index === currentIndex;

              return (
                <div
                  key={game.id || game.title}
                  className={cn(
                    "absolute w-[220px] md:w-[260px] transition-all duration-300 ease-out cursor-pointer",
                    isCenter ? "pointer-events-auto" : "pointer-events-none"
                  )}
                  style={{
                    transform: style.transform,
                    zIndex: style.zIndex,
                    opacity: style.opacity,
                  }}
                  onClick={() => isCenter && handleGameClick(game)}
                >
                  <div className={cn(
                    "bg-card border border-border/40 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col h-[420px] md:h-[460px]",
                    isCenter && "hover:border-primary/60 hover:shadow-2xl hover:shadow-cyan-500/20 ring-2 ring-cyan-500/30"
                  )}>
                    {/* Thumbnail - top */}
                    <div className="relative w-full h-[60%] overflow-hidden shrink-0">
                      {game.thumbnail ? (
                        <img 
                          src={game.thumbnail} 
                          alt={game.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <Mic2 className="w-16 h-16 text-primary" />
                        </div>
                      )}
                      {/* Play button overlay */}
                      {isCenter && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black/30">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/40 transform hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      )}
                      {/* FNF Badge */}
                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-purple-600 px-3 py-1 rounded-full text-white font-bold shadow-lg">
                          FNF
                        </span>
                      </div>
                    </div>

                    {/* Content - bottom */}
                    <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg shrink-0">🎤</span>
                        <h3 className="font-bold text-foreground text-base md:text-lg truncate">
                          {game.title}
                        </h3>
                      </div>
                      <p className="text-xs text-cyan-400/80 font-medium mb-1">{game.preview}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {game.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {filteredGames.slice(0, Math.min(filteredGames.length, 10)).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!isAnimating) {
                    setIsAnimating(true);
                    setCurrentIndex(index);
                    setTimeout(() => setIsAnimating(false), 300);
                  }
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentIndex 
                    ? "bg-gradient-to-r from-cyan-500 to-purple-600 w-6" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to mod ${index + 1}`}
              />
            ))}
            {filteredGames.length > 10 && (
              <span className="text-xs text-muted-foreground ml-2">+{filteredGames.length - 10}</span>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {currentIndex + 1} of {filteredGames.length}
          </p>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 text-muted-foreground text-sm">
          <span>💡</span>
          <span>Use arrow keys to navigate, space to hit notes!</span>
        </div>
      </div>
    </div>
  );
}
