import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Play, Mic2, ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const STATS_KEY = 'solarnova_user_stats';
const GAMES_HISTORY_KEY = 'solarnova_games_history';

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

interface FNFSectionProps {
  onGameClick: (url: string, title: string, embed?: boolean, isTab?: string) => void;
  onBack?: () => void;
}

// Default FNF games
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

export function FNFSection({ onGameClick, onBack }: FNFSectionProps) {
  const { user, isAdmin, sessionToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [games, setGames] = useState<Game[]>(defaultFNFGames);
  const [loading, setLoading] = useState(true);
  const [uploadingGameId, setUploadingGameId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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
          embed: g.embed ?? true, // Default to true if not set
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

  const handleThumbnailUpload = async (gameId: string, file: File) => {
    if (!user || !isAdmin) return;
    
    setUploadingGameId(gameId);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${gameId}-${Date.now()}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('game-thumbnails')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('game-thumbnails')
        .getPublicUrl(filePath);

      const game = games.find(g => g.id === gameId);
      if (!game) throw new Error('Game not found');

      const { error: updateError } = await supabase.rpc('update_game', {
        p_session_token: sessionToken!,
        p_game_id: gameId,
        p_title: game.title,
        p_description: game.description,
        p_url: game.url,
        p_preview: game.preview,
        p_embed: game.embed ?? true,
        p_is_tab: game.isTab || '',
        p_category: game.category,
        p_thumbnail_url: publicUrl,
        p_display_order: 0,
      });

      if (updateError) throw updateError;

      toast.success('Thumbnail updated!');
      fetchFNFGames();
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingGameId(null);
    }
  };

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      return game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             game.description.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [games, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-2 md:px-0">
      {/* Header */}
      <div className="text-center mb-6 md:mb-10">
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
            {/* FNF Logo with microphone icon */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Mic2 className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-lg" />
            </div>
            {/* Music notes decoration */}
            <span className="absolute -top-2 -right-2 text-2xl animate-bounce">🎵</span>
            <span className="absolute -bottom-1 -left-2 text-xl animate-bounce" style={{ animationDelay: '0.3s' }}>🎶</span>
          </div>
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Friday Night Funkin'
          </span>
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          {games.length} mods available • Get funky! 🎤
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto mb-6 md:mb-8 px-2 md:px-0">
        <Search className="absolute left-6 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search FNF mods..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border/50 rounded-full pl-11 md:pl-12 pr-4 py-2.5 md:py-3 text-sm md:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Games Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading FNF mods...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-12 md:py-16">
          <Mic2 className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground text-base md:text-lg">No FNF mods found</p>
          <p className="text-muted-foreground/70 text-xs md:text-sm mt-1">Try a different search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-2 md:px-0">
          {filteredGames.map((game) => {
            const isUploading = uploadingGameId === game.id;
            return (
              <div key={game.id || game.title} className="relative">
                <button
                  onClick={() => {
                    // Save game to history
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
                    // Always embed FNF games by default
                    onGameClick(game.url, game.title, game.embed ?? true, game.isTab);
                  }}
                  className="group relative w-full bg-card border border-border/40 rounded-xl md:rounded-2xl overflow-hidden text-left hover:border-primary/60 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]"
                >
                  {/* Thumbnail Image */}
                  <div className="relative w-full h-36 md:h-44 overflow-hidden">
                    {game.thumbnail ? (
                      <img 
                        src={game.thumbnail} 
                        alt={game.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center">
                        <Mic2 className="w-12 h-12 text-primary" />
                      </div>
                    )}
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
                        <Play className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground fill-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    
                    {/* FNF Badge */}
                    <div className="absolute top-2 md:top-3 right-2 md:right-3">
                      <span className="text-[9px] md:text-[10px] uppercase tracking-wider bg-primary px-2 py-1 rounded-full text-primary-foreground font-bold shadow-lg">
                        FNF
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🎤</span>
                      <h3 className="font-bold text-foreground text-base md:text-lg truncate group-hover:text-primary transition-colors">
                        {game.title}
                      </h3>
                    </div>
                    <p className="text-[11px] md:text-xs text-primary/80 font-medium mb-1">{game.preview}</p>
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
                      className="absolute top-2 left-2 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background transition-all z-10"
                      title="Upload thumbnail"
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

      {/* Info footer */}
      <div className="mt-8 md:mt-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 text-muted-foreground text-sm">
          <span>💡</span>
          <span>Use arrow keys + space to hit the notes!</span>
        </div>
      </div>
    </div>
  );
}
