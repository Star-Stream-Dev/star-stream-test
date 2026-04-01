import { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, X, Save, Gamepad2, Image, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Rom {
  id: string;
  title: string;
  console: string;
  thumbnail_url: string | null;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

const CONSOLES = [
  'NES', 'SNES', 'Game Boy', 'Game Boy Advance', 'Nintendo 64',
  'Nintendo DS', 'Sega Genesis', 'Sega Master System', 'PlayStation',
  'Atari 2600', 'Arcade',
];

export function RomManagement() {
  const { sessionToken } = useAuth();
  const [roms, setRoms] = useState<Rom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [editingRom, setEditingRom] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: '', console: '', thumbnail_url: '' });
  const [editUploadingThumb, setEditUploadingThumb] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    console: 'NES',
    thumbnail_url: '',
    file_path: '',
    file_size: 0,
  });

  useEffect(() => { fetchRoms(); }, []);

  const fetchRoms = async () => {
    try {
      const { data, error } = await supabase
        .from('rom_library')
        .select('*')
        .order('console')
        .order('title');
      if (error) throw error;
      setRoms(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load ROMs');
    } finally {
      setLoading(false);
    }
  };

  const handleRomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
      const { error } = await supabase.storage.from('rom-files').upload(fileName, file);
      if (error) throw error;

      setFormData(prev => ({
        ...prev,
        file_path: fileName,
        file_size: file.size,
        title: prev.title || file.name.replace(/\.[^.]+$/, ''),
      }));
      toast.success('ROM file uploaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload ROM file');
    } finally {
      setUploading(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please upload an image');
      return;
    }

    setUploadingThumb(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `thumb-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('game-thumbnails').upload(fileName, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('game-thumbnails').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
      toast.success('Thumbnail uploaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.file_path) {
      toast.error('Title and ROM file are required');
      return;
    }

    try {
      const { error } = await supabase.rpc('create_rom', {
        p_session_token: sessionToken!,
        p_title: formData.title,
        p_console: formData.console,
        p_thumbnail_url: formData.thumbnail_url || null,
        p_file_path: formData.file_path,
        p_file_size: formData.file_size || null,
      });
      if (error) throw error;

      toast.success('ROM added!');
      setIsCreating(false);
      resetForm();
      fetchRoms();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add ROM');
    }
  };

  const handleDelete = async (romId: string) => {
    if (!confirm('Delete this ROM?')) return;
    try {
      const { error } = await supabase.rpc('delete_rom', {
        p_session_token: sessionToken!,
        p_rom_id: romId,
      });
      if (error) throw error;
      toast.success('ROM deleted');
      fetchRoms();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete ROM');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', console: 'NES', thumbnail_url: '', file_path: '', file_size: 0 });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <div className="text-muted-foreground">Loading ROMs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground">ROM Library</h3>
        {!isCreating && (
          <button
            onClick={() => { setIsCreating(true); resetForm(); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add ROM
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">Upload ROM</h4>
            <button onClick={() => { setIsCreating(false); resetForm(); }} className="p-1 hover:bg-muted rounded">
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
              <label className="block text-sm font-medium text-muted-foreground mb-1">Console *</label>
              <select
                value={formData.console}
                onChange={(e) => setFormData(prev => ({ ...prev, console: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
              >
                {CONSOLES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">ROM File *</label>
              {formData.file_path ? (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground truncate flex-1">{formData.file_path}</span>
                  <span className="text-xs text-muted-foreground">{formatSize(formData.file_size)}</span>
                  <button onClick={() => setFormData(prev => ({ ...prev, file_path: '', file_size: 0 }))} className="text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border bg-card hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Click to upload ROM file'}
                  </span>
                  <input type="file" className="hidden" onChange={handleRomUpload} disabled={uploading} />
                </label>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Thumbnail</label>
              <div className="flex items-start gap-4">
                {formData.thumbnail_url && (
                  <img src={formData.thumbnail_url} alt="Thumb" className="w-24 h-16 object-cover rounded-lg border border-border" />
                )}
                <div className="flex-1 space-y-2">
                  <label className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{uploadingThumb ? 'Uploading...' : 'Upload Thumbnail'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} disabled={uploadingThumb} />
                  </label>
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
            <button onClick={() => { setIsCreating(false); resetForm(); }} className="px-4 py-2 text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!formData.title.trim() || !formData.file_path}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Add ROM
            </button>
          </div>
        </div>
      )}

      {/* ROM list */}
      <div className="space-y-2">
        {roms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No ROMs uploaded yet.</p>
          </div>
        ) : (
          roms.map(rom => (
            <div key={rom.id} className="flex items-center gap-4 bg-card border border-border rounded-lg p-3 hover:border-border/80 transition-colors">
              {rom.thumbnail_url ? (
                <img src={rom.thumbnail_url} alt={rom.title} className="w-16 h-12 object-cover rounded" />
              ) : (
                <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{rom.title}</h4>
                <p className="text-sm text-muted-foreground">{rom.console} {rom.file_size ? `• ${formatSize(rom.file_size)}` : ''}</p>
              </div>
              <button
                onClick={() => handleDelete(rom.id)}
                className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
