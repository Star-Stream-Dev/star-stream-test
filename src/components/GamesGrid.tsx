import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Play, Gamepad2, Music, Cpu, Car, Sparkles, Camera, Loader2, Clock, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const STATS_KEY = 'solarnova_user_stats';
const GAMES_HISTORY_KEY = 'solarnova_games_history';
const GAME_SESSION_KEY = 'solarnova_game_sessions';

interface GameSession {
  gameTitle: string;
  url: string;
  playTime: number;
  lastPlayed: string;
}

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

interface GamesGridProps {
  onGameClick: (url: string, title: string, embed?: boolean, isTab?: string) => void;
}

const categories = [
  { id: 'all', label: 'All Games', icon: Gamepad2 },
  { id: 'rhythm', label: 'Rhythm', icon: Music },
  { id: 'arcade', label: 'Arcade', icon: Sparkles },
  { id: 'utility', label: 'Utility', icon: Cpu },
  { id: 'racing', label: 'Racing', icon: Car },
];

const getGameEmoji = (title: string, category: string) => {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('music') || titleLower.includes('funkin')) return '🎵';
  if (titleLower.includes('car') || titleLower.includes('race')) return '🏎️';
  if (titleLower.includes('cobra')) return '🐍';
  if (titleLower.includes('lumi') || titleLower.includes('os')) return '💻';
  if (titleLower.includes('petezah')) return '🎮';
  if (titleLower.includes('umbrion')) return '⚡';
  if (titleLower.includes('kermit')) return '🐸';
  if (titleLower.includes('math')) return '🧮';
  return '🎯';
};

// Fallback games if database is empty (FNF games are in dedicated section)
const defaultGames: Game[] = [
  {
    title: 'Petezah Games',
    description: 'Access a massive collection of unblocked games all in one place.',
    url: 'https://petezahstatic.wasmer.app',
    preview: 'Game collection hub',
    embed: true,
    category: 'arcade',
    thumbnail: '/thumbnails/petezah-games.png',
  },
  {
    title: 'Solarnova Music',
    description: 'Stream your favorite music with our sleek, feature-rich player.',
    url: '',
    preview: 'Music streaming',
    isTab: 'music',
    category: 'utility',
    thumbnail: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400&h=300&fit=crop',
  },
  {
    title: 'Umbrion Games',
    description: 'Explore creative indie game projects and unique experiences.',
    url: 'https://umbrion.wasmer.app/projects.html',
    preview: 'Indie game showcase',
    embed: true,
    category: 'arcade',
    thumbnail: '/thumbnails/umbrion-games.png',
  },
  {
    title: 'Lumi OS',
    description: 'A complete web-based operating system in your browser.',
    url: 'https://lumios.wasmer.app',
    preview: 'Browser OS',
    embed: true,
    category: 'utility',
    thumbnail: '/thumbnails/lumi-os.png',
  },
  {
    title: 'Kermitco',
    description: 'Unique gaming experience with creative challenges and fun.',
    url: 'https://kermitcooffline82hfdisocirk88enlqtpc75wchgb45cstvvixmc-12367506.codehs.me/0aDV71GtSpyy91KtZE6P7qeL56mVU5nSvCKNk5fdoGV6N1xy1qsbFa548gBQcARY.html',
    preview: 'Creative adventure',
    embed: true,
    category: 'arcade',
    thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
  },
  {
    title: 'Cobra',
    description: 'Professional business platform with powerful productivity tools.',
    url: 'https://thecobra.odoo.com/',
    preview: 'Business platform',
    embed: true,
    category: 'utility',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
  },
  {
    title: 'Car Game',
    description: 'Get behind the wheel and race through exciting tracks.',
    url: 'https://codebeautify.org/htmlviewer/y25205daf#',
    preview: 'Racing game',
    embed: true,
    category: 'racing',
    thumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=300&fit=crop',
  },
  {
    title: 'Mathepic',
    description: 'All credits to gooierpizza7003!',
    url: 'https://mathepic.tuvnord.hk/',
    preview: 'Math learning game',
    embed: true,
    category: 'arcade',
    thumbnail: '/thumbnails/mathepic.png',
  },
  {
    title: 'studymath.top',
    description: 'Educational math games and learning tools.',
    url: 'https://studymath.top',
    preview: 'Math learning platform',
    embed: true,
    category: 'arcade',
    thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
  },
];

export function GamesGrid({ onGameClick }: GamesGridProps) {
  const { isAdmin, user, sessionToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [games, setGames] = useState<Game[]>(defaultGames);
  const [loading, setLoading] = useState(true);
  const [uploadingGameId, setUploadingGameId] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Load recent game sessions
  useEffect(() => {
    if (!user) return;
    
    const key = `${GAME_SESSION_KEY}_${user.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const sessions = JSON.parse(stored) as GameSession[];
        setRecentSessions(sessions.slice(0, 5));
      } catch (e) {
        console.error('Error loading game sessions:', e);
      }
    }
  }, [user]);

  // Format play time
  const formatPlayTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Map database fields to component format
        const mappedGames: Game[] = data.map(g => ({
          id: g.id,
          title: g.title,
          description: g.description,
          url: g.url,
          preview: g.preview,
          embed: g.embed ?? true, // Default to embed if not specified
          isTab: g.is_tab || undefined,
          category: g.category,
          thumbnail: g.thumbnail_url || undefined,
        }));
        setGames(mappedGames);
      }
      // If no games in DB, keep default games
    } catch (error) {
      console.error('Error fetching games:', error);
      // Keep default games on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleThumbnailUpload = async (gameId: string, file: File) => {
    if (!user || !isAdmin) return;
    
    setUploadingGameId(gameId);
    
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${gameId}-${Date.now()}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('game-thumbnails')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('game-thumbnails')
        .getPublicUrl(filePath);

      // Update game in database
      const { error: updateError } = await supabase.rpc('update_game', {
        p_session_token: sessionToken!,
        p_game_id: gameId,
        p_title: games.find(g => g.id === gameId)?.title || '',
        p_description: games.find(g => g.id === gameId)?.description || '',
        p_url: games.find(g => g.id === gameId)?.url || '',
        p_preview: games.find(g => g.id === gameId)?.preview || '',
        p_embed: games.find(g => g.id === gameId)?.embed ?? true,
        p_is_tab: games.find(g => g.id === gameId)?.isTab || '',
        p_category: games.find(g => g.id === gameId)?.category || 'arcade',
        p_thumbnail_url: publicUrl,
        p_display_order: 0,
      });

      if (updateError) throw updateError;

      toast.success('Thumbnail updated!');
      fetchGames(); // Refresh games list
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingGameId(null);
    }
  };

  const filteredGames = useMemo(() => {
    return games
      .filter(game => game.category !== 'fnf') // FNF games are in dedicated section
      .filter(game => {
        const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             game.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || game.category === activeCategory;
        return matchesSearch && matchesCategory;
      });
  }, [games, searchQuery, activeCategory]);

  return (
    <div className="max-w-6xl mx-auto px-2 md:px-0">
      {/* Header */}
      <div className="text-center mb-6 md:mb-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 text-gradient">
          Game Library
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          {games.length} games available
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto mb-6 md:mb-8 px-2 md:px-0">
        <Search className="absolute left-6 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border/50 rounded-full pl-11 md:pl-12 pr-4 py-2.5 md:py-3 text-sm md:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mb-6 md:mb-10 px-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <Icon className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden xs:inline md:inline">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Games Grid */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-12 md:py-16">
          <Gamepad2 className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground text-base md:text-lg">No games found</p>
          <p className="text-muted-foreground/70 text-xs md:text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 px-2 md:px-0">
          {filteredGames.map((game) => {
            const emoji = getGameEmoji(game.title, game.category);
            const isUploading = uploadingGameId === game.id;
            return (
              <div key={game.id || game.title} className="relative">
                <button
                  onClick={() => {
                    // Save game to history for dashboard with persistent tracking
                    if (!game.isTab && user) {
                      const historyKey = `${GAMES_HISTORY_KEY}_${user.id}`;
                      const statsKey = `${STATS_KEY}_${user.id}`;
                      
                      // Update games history
                      const existing = localStorage.getItem(historyKey);
                      let history: { thumbnail: string; title: string; id: string }[] = [];
                      if (existing) {
                        try {
                          history = JSON.parse(existing);
                        } catch {}
                      }
                      
                      // Add to front, remove duplicates, keep last 10
                      const newEntry = {
                        thumbnail: game.thumbnail || '',
                        title: game.title,
                        id: game.id || game.title
                      };
                      history = [newEntry, ...history.filter(g => g.id !== newEntry.id)].slice(0, 10);
                      localStorage.setItem(historyKey, JSON.stringify(history));
                      
                      // Update games played count in stats
                      const statsData = localStorage.getItem(statsKey);
                      if (statsData) {
                        try {
                          const stats = JSON.parse(statsData);
                          stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
                          localStorage.setItem(statsKey, JSON.stringify(stats));
                        } catch {}
                      }
                    }
                    onGameClick(game.url, game.title, game.embed, game.isTab);
                  }}
                  className="group relative w-full bg-card border border-border/40 rounded-xl md:rounded-2xl overflow-hidden text-left hover:border-primary/60 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
                >
                  {/* Thumbnail Image */}
                  <div className="relative w-full h-32 md:h-40 overflow-hidden">
                    {game.thumbnail ? (
                      <img 
                        src={game.thumbnail} 
                        alt={game.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-4xl md:text-5xl">{emoji}</span>
                      </div>
                    )}
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground fill-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    
                    {/* Category badge */}
                    <div className="absolute top-2 md:top-3 right-2 md:right-3">
                      <span className="text-[9px] md:text-[10px] uppercase tracking-wider bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-foreground font-medium">
                        {game.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3 md:p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{emoji}</span>
                      <h3 className="font-semibold text-foreground text-sm md:text-base truncate group-hover:text-primary transition-colors">
                        {game.title}
                      </h3>
                    </div>
                    <p className="text-[10px] md:text-xs text-primary/80 font-medium mb-1">{game.preview}</p>
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {game.description}
                    </p>
                  </div>
                </button>

                {/* Admin thumbnail upload button */}
                {isAdmin && game.id && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => { fileInputRefs.current[game.id!] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && game.id) {
                          handleThumbnailUpload(game.id, file);
                        }
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRefs.current[game.id!]?.click();
                      }}
                      disabled={isUploading}
                      className="absolute top-2 left-2 z-10 p-2 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-primary hover:text-primary-foreground transition-all shadow-md"
                      title="Change thumbnail"
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}