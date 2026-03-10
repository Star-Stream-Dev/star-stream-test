import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Upload, X, Save, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Game {
  id: string;
  title: string;
  description: string;
  url: string;
  preview: string;
  embed: boolean;
  is_tab: string | null;
  category: string;
  thumbnail_url: string | null;
  display_order: number;
}

const categories = ['fnf', 'rhythm', 'arcade', 'utility', 'racing'];

export function GameManagement() {
  const { user, sessionToken } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    preview: '',
    embed: true,
    is_tab: '',
    category: 'arcade',
    thumbnail_url: '',
    display_order: 0,
  });

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingThumbnail(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('game-thumbnails')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('game-thumbnails')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
      toast.success('Thumbnail uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleCreate = async () => {
    if (!user?.id || !formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_game', {
        p_session_token: sessionToken!,
        p_title: formData.title,
        p_description: formData.description,
        p_url: formData.url,
        p_preview: formData.preview,
        p_embed: formData.embed,
        p_is_tab: formData.is_tab || null,
        p_category: formData.category,
        p_thumbnail_url: formData.thumbnail_url || null,
        p_display_order: formData.display_order,
      });

      if (error) throw error;
      
      toast.success('Game created!');
      setIsCreating(false);
      resetForm();
      fetchGames();
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
    }
  };

  const handleUpdate = async () => {
    if (!user?.id || !editingGame) return;

    try {
      const { error } = await supabase.rpc('update_game', {
        p_admin_id: user.id,
        p_game_id: editingGame.id,
        p_title: formData.title,
        p_description: formData.description,
        p_url: formData.url,
        p_preview: formData.preview,
        p_embed: formData.embed,
        p_is_tab: formData.is_tab || null,
        p_category: formData.category,
        p_thumbnail_url: formData.thumbnail_url || null,
        p_display_order: formData.display_order,
      });

      if (error) throw error;
      
      toast.success('Game updated!');
      setEditingGame(null);
      resetForm();
      fetchGames();
    } catch (error) {
      console.error('Error updating game:', error);
      toast.error('Failed to update game');
    }
  };

  const handleDelete = async (gameId: string) => {
    if (!user?.id) return;
    if (!confirm('Are you sure you want to delete this game?')) return;

    try {
      const { error } = await supabase.rpc('delete_game', {
        p_admin_id: user.id,
        p_game_id: gameId,
      });

      if (error) throw error;
      
      toast.success('Game deleted!');
      fetchGames();
    } catch (error) {
      console.error('Error deleting game:', error);
      toast.error('Failed to delete game');
    }
  };

  const startEdit = (game: Game) => {
    setEditingGame(game);
    setFormData({
      title: game.title,
      description: game.description,
      url: game.url,
      preview: game.preview,
      embed: game.embed,
      is_tab: game.is_tab || '',
      category: game.category,
      thumbnail_url: game.thumbnail_url || '',
      display_order: game.display_order,
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      url: '',
      preview: '',
      embed: true,
      is_tab: '',
      category: 'arcade',
      thumbnail_url: '',
      display_order: games.length,
    });
  };

  const startCreate = () => {
    setIsCreating(true);
    resetForm();
    setFormData(prev => ({ ...prev, display_order: games.length }));
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading games...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground">Game Management</h3>
        {!isCreating && !editingGame && (
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Game
          </button>
        )}
      </div>

      {/* Form for creating/editing */}
      {(isCreating || editingGame) && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">
              {isCreating ? 'Add New Game' : 'Edit Game'}
            </h4>
            <button
              onClick={() => { setIsCreating(false); setEditingGame(null); resetForm(); }}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="Game title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="Game description"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">URL</label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Preview Text</label>
              <input
                type="text"
                value={formData.preview}
                onChange={(e) => setFormData(prev => ({ ...prev, preview: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="Short preview text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Tab Name (optional)</label>
              <input
                type="text"
                value={formData.is_tab}
                onChange={(e) => setFormData(prev => ({ ...prev, is_tab: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="e.g., music (opens internal tab)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="embed"
                checked={formData.embed}
                onChange={(e) => setFormData(prev => ({ ...prev, embed: e.target.checked }))}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="embed" className="text-sm text-muted-foreground">Embed in iframe</label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Thumbnail</label>
              <div className="flex items-start gap-4">
                {formData.thumbnail_url && (
                  <img 
                    src={formData.thumbnail_url} 
                    alt="Thumbnail preview" 
                    className="w-24 h-16 object-cover rounded-lg border border-border"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">{uploadingThumbnail ? 'Uploading...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                        disabled={uploadingThumbnail}
                      />
                    </label>
                    {formData.thumbnail_url && (
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, thumbnail_url: '' }))}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
                    placeholder="Or paste image URL"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              onClick={() => { setIsCreating(false); setEditingGame(null); resetForm(); }}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={isCreating ? handleCreate : handleUpdate}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isCreating ? 'Create Game' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Games list */}
      <div className="space-y-2">
        {games.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No games yet. Add your first game!</p>
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game.id}
              className="flex items-center gap-4 bg-card border border-border rounded-lg p-3 hover:border-border/80 transition-colors"
            >
              {game.thumbnail_url ? (
                <img 
                  src={game.thumbnail_url} 
                  alt={game.title}
                  className="w-16 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                  <Image className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{game.title}</h4>
                <p className="text-sm text-muted-foreground truncate">{game.description}</p>
              </div>
              
              <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                {game.category}
              </span>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(game)}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(game.id)}
                  className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}