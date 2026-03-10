import { useState, useEffect } from 'react';
import { 
  Search, Music, Heart, ListMusic, Plus, Upload, Loader2, 
  ChevronLeft, Play, MoreHorizontal, Trash2, Archive, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMusicPlayer } from '../PersistentMusicPlayer';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface Track {
  id: string;
  name: string;
  artist_name: string;
  album_name: string;
  image: string;
  audio: string;
  duration: number;
  isUploaded?: boolean;
  genre?: string;
}

interface Playlist {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

interface UploadedMusic {
  id: string;
  title: string;
  artist: string;
  file_path: string;
  created_at: string;
  genre: string;
  cover_url: string | null;
}

const GENRES = ['Favorites', 'All', 'Hip-Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Country', 'Latin', 'Other'];

export function SpotifyMusicPlayer() {
  const { user, isAdmin, sessionToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState('All');
  const [uploadedTracks, setUploadedTracks] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeView, setActiveView] = useState<'browse' | 'playlist' | 'upload'>('browse');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isZipUploading, setIsZipUploading] = useState(false);
  const [isMp3Uploading, setIsMp3Uploading] = useState(false);
  const [isRefetchingCovers, setIsRefetchingCovers] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const { currentTrack, playTrack, setTracks } = useMusicPlayer();

  // Fetch all data on mount
  useEffect(() => {
    fetchUploadedMusic();
    if (user) {
      fetchFavorites();
      fetchPlaylists();
    }
  }, [user]);

  const fetchUploadedMusic = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('uploaded_music')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching uploaded music:', error);
        return;
      }

      const formattedTracks: Track[] = (data as UploadedMusic[]).map((item) => {
        const { data: urlData } = supabase.storage.from('music').getPublicUrl(item.file_path);
        return {
          id: item.id,
          name: item.title,
          artist_name: item.artist,
          album_name: 'Uploaded',
          image: item.cover_url || '',
          audio: urlData.publicUrl,
          duration: 0,
          isUploaded: true,
          genre: item.genre || 'Other',
        };
      });

      setUploadedTracks(formattedTracks);
      setTracks(formattedTracks);
    } catch (error) {
      console.error('Error:', error);
    }
    setIsLoading(false);
  };

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('favorite_songs')
        .select('music_id')
        .eq('user_id', user.id);

      if (!error && data) {
        setFavorites(new Set(data.map(f => f.music_id)));
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchPlaylists = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPlaylists(data);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const fetchPlaylistTracks = async (playlistId: string) => {
    try {
      const { data, error } = await supabase
        .from('playlist_songs')
        .select('music_id')
        .eq('playlist_id', playlistId);

      if (!error && data) {
        const musicIds = data.map(ps => ps.music_id);
        const tracks = uploadedTracks.filter(t => musicIds.includes(t.id));
        setPlaylistTracks(tracks);
      }
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
    }
  };

  const toggleFavorite = async (trackId: string) => {
    if (!user) {
      toast.error('Please login to favorite songs');
      return;
    }

    const isFavorited = favorites.has(trackId);
    
    if (isFavorited) {
      const { error } = await supabase
        .from('favorite_songs')
        .delete()
        .eq('user_id', user.id)
        .eq('music_id', trackId);

      if (!error) {
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(trackId);
          return next;
        });
        toast.success('Removed from favorites');
      }
    } else {
      const { error } = await supabase
        .from('favorite_songs')
        .insert({ user_id: user.id, music_id: trackId });

      if (!error) {
        setFavorites(prev => new Set([...prev, trackId]));
        toast.success('Added to favorites');
      }
    }
  };

  const createPlaylist = async () => {
    if (!user || !newPlaylistName.trim()) return;

    const { data, error } = await supabase
      .from('user_playlists')
      .insert({ user_id: user.id, name: newPlaylistName.trim() })
      .select()
      .single();

    if (!error && data) {
      setPlaylists(prev => [data, ...prev]);
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
      toast.success('Playlist created');
    }
  };

  const addToPlaylist = async (playlistId: string, trackId: string) => {
    const { error } = await supabase
      .from('playlist_songs')
      .insert({ playlist_id: playlistId, music_id: trackId });

    if (error) {
      if (error.code === '23505') {
        toast.error('Song already in playlist');
      } else {
        toast.error('Failed to add song');
      }
    } else {
      toast.success('Added to playlist');
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    const { error } = await supabase
      .from('user_playlists')
      .delete()
      .eq('id', playlistId);

    if (!error) {
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
        setActiveView('browse');
      }
      toast.success('Playlist deleted');
    }
  };

  const handleMp3Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    // Filter for MP3 files only
    const mp3Files = Array.from(files).filter(file => 
      file.name.toLowerCase().endsWith('.mp3') || file.type === 'audio/mpeg'
    );

    if (mp3Files.length === 0) {
      toast.error('Please select MP3 files');
      return;
    }

    if (mp3Files.length !== files.length) {
      toast.warning(`${files.length - mp3Files.length} non-MP3 files were skipped`);
    }

    setIsMp3Uploading(true);
    setUploadProgress({ current: 0, total: mp3Files.length });
    
    let uploadedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < mp3Files.length; i++) {
      const file = mp3Files[i];
      setUploadProgress({ current: i + 1, total: mp3Files.length });
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('adminId', user.id);
        formData.append('genre', activeGenre === 'All' || activeGenre === 'Favorites' ? '' : activeGenre);

        const { data, error } = await supabase.functions.invoke('upload-music', {
          body: formData,
        });

        if (error) {
          console.error('Upload error for', file.name, ':', error);
          errorCount++;
        } else if (data.success) {
          uploadedCount++;
        }
      } catch (err) {
        console.error('Error uploading', file.name, ':', err);
        errorCount++;
      }
    }

    if (uploadedCount > 0) {
      toast.success(`Uploaded ${uploadedCount} track${uploadedCount > 1 ? 's' : ''}`);
      fetchUploadedMusic();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload`);
    }

    setIsMp3Uploading(false);
    setUploadProgress({ current: 0, total: 0 });
    e.target.value = '';
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Please select a ZIP file');
      return;
    }

    setIsZipUploading(true);
    setUploadProgress({ current: 0, total: 0 });
    let uploadedCount = 0;
    let errorCount = 0;

    try {
      // Extract ZIP client-side to avoid edge function memory limits
      const zip = await JSZip.loadAsync(file);
      const mp3Files: { name: string; blob: Blob }[] = [];

      // Collect all MP3 files
      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        if (!filename.toLowerCase().endsWith('.mp3')) continue;
        
        const content = await zipEntry.async('blob');
        const cleanName = filename.split('/').pop() || filename;
        mp3Files.push({ name: cleanName, blob: content });
      }

      if (mp3Files.length === 0) {
        toast.error('No MP3 files found in ZIP');
        setIsZipUploading(false);
        setUploadProgress({ current: 0, total: 0 });
        e.target.value = '';
        return;
      }

      setUploadProgress({ current: 0, total: mp3Files.length });

      // Upload each file individually to the upload-music endpoint
      for (let i = 0; i < mp3Files.length; i++) {
        const { name, blob } = mp3Files[i];
        setUploadProgress({ current: i + 1, total: mp3Files.length });
        
        try {
          const mp3File = new File([blob], name, { type: 'audio/mpeg' });
          const formData = new FormData();
          formData.append('file', mp3File);
          formData.append('adminId', user.id);
          formData.append('genre', activeGenre === 'All' || activeGenre === 'Favorites' ? '' : activeGenre);

          const { data, error } = await supabase.functions.invoke('upload-music', {
            body: formData,
          });

          if (error) {
            console.error('Upload error for', name, ':', error);
            errorCount++;
          } else if (data.success) {
            uploadedCount++;
          }
        } catch (err) {
          console.error('Error uploading', name, ':', err);
          errorCount++;
        }
      }

      if (uploadedCount > 0) {
        toast.success(`Uploaded ${uploadedCount} tracks`);
        fetchUploadedMusic();
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} files had errors`);
      }
    } catch (error) {
      console.error('Zip processing error:', error);
      toast.error('Failed to process ZIP file');
    }
    setIsZipUploading(false);
    setUploadProgress({ current: 0, total: 0 });
    e.target.value = '';
  };

  const handleRefetchCovers = async () => {
    if (!user || !isAdmin) return;
    setIsRefetchingCovers(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('refetch-covers', {
        body: { adminId: user.id },
      });
      
      if (error) throw error;
      
      toast.success(`Updated ${data.updated} of ${data.total} covers`);
      fetchUploadedMusic();
    } catch (err) {
      console.error('Refetch covers error:', err);
      toast.error('Failed to refetch covers');
    }
    
    setIsRefetchingCovers(false);
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!user || !isAdmin) return;

    try {
      const { error } = await supabase.rpc('delete_uploaded_music', {
        p_session_token: sessionToken!,
        p_music_id: trackId,
      });

      if (!error) {
        toast.success('Track deleted');
        fetchUploadedMusic();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Filter tracks
  const filteredTracks = uploadedTracks.filter(track => {
    const matchesSearch = track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeGenre === 'Favorites') {
      return matchesSearch && favorites.has(track.id);
    }
    if (activeGenre === 'All') {
      return matchesSearch;
    }
    return matchesSearch && track.genre === activeGenre;
  });

  const displayTracks = activeView === 'playlist' && selectedPlaylist ? playlistTracks : filteredTracks;

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  return (
    <div className="flex h-full bg-background">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setShowMobileSidebar(!showMobileSidebar)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border/30 rounded-lg"
      >
        <ListMusic className="w-5 h-5" />
      </button>

      {/* Sidebar overlay for mobile */}
      {showMobileSidebar && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 z-40"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-50 md:z-auto
        w-64 bg-card/95 md:bg-card/50 border-r border-border/30 flex flex-col
        transform transition-transform duration-300
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Music className="w-6 h-6 text-primary" />
            Music
          </h2>
          <button
            onClick={() => setShowMobileSidebar(false)}
            className="md:hidden p-1 text-muted-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-2 space-y-1">
          <button
            onClick={() => { setActiveView('browse'); setSelectedPlaylist(null); setShowMobileSidebar(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              activeView === 'browse' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <Music className="w-5 h-5" />
            Browse
          </button>
        </nav>

        {/* Playlists */}
        <div className="mt-6 flex-1 overflow-hidden flex flex-col">
          <div className="px-4 flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Playlists</h3>
            {user && (
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {showCreatePlaylist && (
            <div className="px-2 mb-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name"
                className="w-full bg-muted/30 border border-border/30 rounded px-2 py-1 text-sm text-foreground"
                onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {playlists.map(playlist => (
              <div
                key={playlist.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  selectedPlaylist?.id === playlist.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
                onClick={() => {
                  setSelectedPlaylist(playlist);
                  setActiveView('playlist');
                  fetchPlaylistTracks(playlist.id);
                }}
              >
                <ListMusic className="w-4 h-4" />
                <span className="flex-1 truncate text-sm">{playlist.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deletePlaylist(playlist.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Upload */}
        {isAdmin && (
          <div className="p-4 border-t border-border/30 space-y-2">
            <label className="flex flex-col gap-1 px-3 py-2 bg-primary/20 text-primary rounded-lg cursor-pointer hover:bg-primary/30 transition-colors">
              <div className="flex items-center gap-2">
                {isMp3Uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {isMp3Uploading 
                    ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` 
                    : 'Upload MP3s'}
                </span>
              </div>
              {isMp3Uploading && uploadProgress.total > 0 && (
                <div className="w-full bg-primary/30 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-primary-foreground h-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              )}
              <input
                type="file"
                accept=".mp3,audio/mpeg"
                multiple
                onChange={handleMp3Upload}
                className="hidden"
                disabled={isMp3Uploading}
              />
            </label>
            <label className="flex flex-col gap-1 px-3 py-2 bg-muted/30 text-muted-foreground rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                {isZipUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {isZipUploading 
                    ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` 
                    : 'Upload ZIP'}
                </span>
              </div>
              {isZipUploading && uploadProgress.total > 0 && (
                <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              )}
              <input
                type="file"
                accept=".zip"
                onChange={handleZipUpload}
                className="hidden"
                disabled={isZipUploading}
              />
            </label>
            <button
              onClick={handleRefetchCovers}
              disabled={isRefetchingCovers}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary/20 text-secondary-foreground rounded-lg hover:bg-secondary/30 transition-colors disabled:opacity-50"
            >
              {isRefetchingCovers ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {isRefetchingCovers ? 'Fetching covers...' : 'Refetch Missing Covers'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-primary/10 to-transparent">
          {activeView === 'playlist' && selectedPlaylist ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setActiveView('browse'); setSelectedPlaylist(null); }}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Playlist</p>
                <h1 className="text-3xl font-bold text-foreground">{selectedPlaylist.name}</h1>
                <p className="text-sm text-muted-foreground">{playlistTracks.length} songs</p>
              </div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative max-w-md mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search songs or artists..."
                  className="w-full bg-background/50 border border-border/30 rounded-full pl-10 pr-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Genres */}
              <div className="flex gap-2 flex-wrap">
                {GENRES.map(genre => (
                  <button
                    key={genre}
                    onClick={() => setActiveGenre(genre)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeGenre === genre
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {genre === 'Favorites' && <Heart className="w-3 h-3 inline mr-1" />}
                    {genre}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Track Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : displayTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Music className="w-16 h-16 mb-4 opacity-50" />
              <p>
                {activeGenre === 'Favorites' ? 'No favorite songs yet' : 'No tracks found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayTracks.map(track => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isPlaying={currentTrack?.id === track.id}
                  isFavorited={favorites.has(track.id)}
                  onPlay={() => playTrack(track)}
                  onFavorite={() => toggleFavorite(track.id)}
                  onAddToPlaylist={(playlistId) => addToPlaylist(playlistId, track.id)}
                  onDelete={isAdmin ? () => handleDeleteTrack(track.id) : undefined}
                  playlists={playlists}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TrackCardProps {
  track: Track;
  isPlaying: boolean;
  isFavorited: boolean;
  onPlay: () => void;
  onFavorite: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onDelete?: () => void;
  playlists: Playlist[];
}

function TrackCard({ track, isPlaying, isFavorited, onPlay, onFavorite, onAddToPlaylist, onDelete, playlists }: TrackCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group relative">
      <div
        className={`relative aspect-square rounded-lg overflow-hidden bg-muted/30 cursor-pointer ${
          isPlaying ? 'ring-2 ring-primary' : ''
        }`}
        onClick={onPlay}
      >
        {track.image ? (
          <img src={track.image} alt={track.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <Music className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
          </div>
        </div>

        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute bottom-2 right-2">
            <div className="flex items-end gap-0.5">
              <div className="w-1 h-3 bg-primary rounded-full animate-pulse" />
              <div className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
              <div className="w-1 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2">
        <p className="text-foreground font-medium text-sm truncate">{track.name}</p>
        <p className="text-muted-foreground text-xs truncate">{track.artist_name}</p>
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          className={`p-1.5 rounded-full bg-black/60 transition-colors ${
            isFavorited ? 'text-red-500' : 'text-white hover:text-red-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 rounded-full bg-black/60 text-white hover:text-primary"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-10 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {playlists.map(playlist => (
                <button
                  key={playlist.id}
                  onClick={() => { onAddToPlaylist(playlist.id); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted/30 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add to {playlist.name}
                </button>
              ))}
              {onDelete && (
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-muted/30 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
