import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Upload, Download, Trash2, Gamepad2, Save, Clock, HardDrive, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SaveFile {
  id: string;
  save_name: string;
  game_name: string;
  console: string;
  file_path: string;
  file_size: number | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

interface RomOption {
  id: string;
  title: string;
  console: string;
  thumbnail_url: string | null;
}

export function SaveManager() {
  const { user, sessionToken } = useAuth();
  const [saves, setSaves] = useState<SaveFile[]>([]);
  const [roms, setRoms] = useState<RomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');

  // Upload form state
  const [saveName, setSaveName] = useState('');
  const [selectedRom, setSelectedRom] = useState<RomOption | null>(null);
  const [customGameName, setCustomGameName] = useState('');
  const [romSearch, setRomSearch] = useState('');
  const [showRomDropdown, setShowRomDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchSaves();
    fetchRoms();
  }, [sessionToken]);

  const fetchSaves = async () => {
    if (!sessionToken) return;
    try {
      const { data, error } = await supabase.rpc('get_my_emulator_saves', { p_session_token: sessionToken });
      if (error) throw error;
      setSaves((data as SaveFile[]) || []);
    } catch (err) {
      console.error('Failed to fetch saves:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoms = async () => {
    try {
      const { data, error } = await supabase.from('rom_library').select('id, title, console, thumbnail_url').order('title');
      if (error) throw error;
      setRoms(data || []);
    } catch (err) {
      console.error('Failed to fetch roms:', err);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!sessionToken || !user || !selectedFile) return;
    const gameName = selectedRom?.title || customGameName;
    if (!gameName.trim() || !saveName.trim()) {
      toast.error('Please enter a save name and select/enter a game');
      return;
    }

    setUploading(true);
    try {
      const ext = selectedFile.name.split('.').pop() || 'sav';
      const path = `${user.id}/${Date.now()}_${saveName.replace(/\s+/g, '_')}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('emulator-saves')
        .upload(path, selectedFile);
      if (uploadError) throw uploadError;

      const { error: rpcError } = await supabase.rpc('upload_emulator_save', {
        p_session_token: sessionToken,
        p_save_name: saveName,
        p_game_name: gameName,
        p_console: selectedRom?.console || '',
        p_file_path: path,
        p_file_size: selectedFile.size,
        p_thumbnail_url: selectedRom?.thumbnail_url || null,
      });
      if (rpcError) throw rpcError;

      toast.success('Save file uploaded!');
      resetUploadForm();
      fetchSaves();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (save: SaveFile) => {
    try {
      const { data, error } = await supabase.storage.from('emulator-saves').download(save.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${save.save_name}.${save.file_path.split('.').pop()}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (save: SaveFile) => {
    if (!sessionToken) return;
    try {
      await supabase.storage.from('emulator-saves').remove([save.file_path]);
      const { error } = await supabase.rpc('delete_emulator_save', {
        p_session_token: sessionToken,
        p_save_id: save.id,
      });
      if (error) throw error;
      toast.success('Save deleted');
      fetchSaves();
    } catch (err: any) {
      toast.error('Delete failed');
    }
  };

  const resetUploadForm = () => {
    setShowUpload(false);
    setSaveName('');
    setSelectedRom(null);
    setCustomGameName('');
    setRomSearch('');
    setSelectedFile(null);
  };

  const filteredRoms = roms.filter(r =>
    r.title.toLowerCase().includes(romSearch.toLowerCase()) ||
    r.console.toLowerCase().includes(romSearch.toLowerCase())
  );

  const filteredSaves = saves.filter(s =>
    s.save_name.toLowerCase().includes(search.toLowerCase()) ||
    s.game_name.toLowerCase().includes(search.toLowerCase())
  );

  const latestSaves = filteredSaves.slice(0, 3);
  const olderSaves = filteredSaves.slice(3);

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Save className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm">Log in to manage your save files</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">My Saves</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{saves.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search saves..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground w-40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button size="sm" onClick={() => setShowUpload(!showUpload)} className="gap-1.5">
            <Upload className="w-4 h-4" />
            Upload Save
          </Button>
        </div>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Upload Save File</h3>
            <button onClick={resetUploadForm} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Save name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Save Name</label>
            <input
              type="text"
              placeholder="e.g. Final Boss Save, 100% Complete"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Game selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Game</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search ROM library or type game name..."
                value={selectedRom ? selectedRom.title : romSearch || customGameName}
                onChange={e => {
                  setSelectedRom(null);
                  setRomSearch(e.target.value);
                  setCustomGameName(e.target.value);
                  setShowRomDropdown(true);
                }}
                onFocus={() => setShowRomDropdown(true)}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {selectedRom && (
                <button
                  onClick={() => { setSelectedRom(null); setRomSearch(''); setCustomGameName(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {showRomDropdown && !selectedRom && filteredRoms.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {filteredRoms.slice(0, 20).map(rom => (
                    <button
                      key={rom.id}
                      onClick={() => {
                        setSelectedRom(rom);
                        setRomSearch('');
                        setCustomGameName('');
                        setShowRomDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                    >
                      {rom.thumbnail_url ? (
                        <img src={rom.thumbnail_url} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{rom.title}</p>
                        <p className="text-xs text-muted-foreground">{rom.console}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedRom?.thumbnail_url && (
              <div className="mt-2 flex items-center gap-3">
                <img src={selectedRom.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedRom.title}</p>
                  <p className="text-xs text-muted-foreground">{selectedRom.console}</p>
                </div>
              </div>
            )}
          </div>

          {/* File picker */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Save File</label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border bg-muted/30 hover:border-primary/50 cursor-pointer transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {selectedFile ? selectedFile.name : 'Click to select a save file (.sav, .srm, .state, etc.)'}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".sav,.srm,.state,.sn1,.sn2,.sn3,.sn4,.sn5,.sn6,.sn7,.sn8,.sn9,.ss0,.ss1,.ss2,.ss3,.ss4,.ss5,.ss6,.ss7,.ss8,.ss9,.oops,.cht,.mcr,.fla,.eep,.mpk,.dat,.dsv"
                onChange={handleFileSelect}
              />
            </label>
          </div>

          <Button onClick={handleUpload} disabled={uploading || !selectedFile || (!selectedRom && !customGameName.trim()) || !saveName.trim()} className="w-full gap-2">
            {uploading ? 'Uploading...' : 'Upload Save'}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : saves.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Save className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">No saves yet</p>
          <p className="text-xs mt-1">Upload your first save file to get started</p>
        </div>
      ) : (
        <>
          {/* Latest saves */}
          {latestSaves.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Latest Saves</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {latestSaves.map(save => (
                  <SaveCard key={save.id} save={save} onDownload={handleDownload} onDelete={handleDelete} formatSize={formatSize} formatDate={formatDate} />
                ))}
              </div>
            </div>
          )}

          {/* Older saves */}
          {olderSaves.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">All Saves</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {olderSaves.map(save => (
                  <SaveCard key={save.id} save={save} onDownload={handleDownload} onDelete={handleDelete} formatSize={formatSize} formatDate={formatDate} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SaveCard({
  save,
  onDownload,
  onDelete,
  formatSize,
  formatDate,
}: {
  save: SaveFile;
  onDownload: (s: SaveFile) => void;
  onDelete: (s: SaveFile) => void;
  formatSize: (n: number | null) => string;
  formatDate: (s: string) => string;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all">
      {/* Thumbnail header */}
      <div className="relative h-24 bg-muted/50 overflow-hidden">
        {save.thumbnail_url ? (
          <img src={save.thumbnail_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-sm font-bold text-foreground truncate">{save.save_name}</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="text-xs font-medium text-foreground truncate">{save.game_name}</p>
        </div>
        {save.console && (
          <span className="inline-block text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {save.console}
          </span>
        )}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{formatDate(save.created_at)}</span>
          <span>{formatSize(save.file_size)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs" onClick={() => onDownload(save)}>
            <Download className="w-3.5 h-3.5" />
            Download
          </Button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <Button size="sm" variant="destructive" className="h-8 text-xs px-2" onClick={() => { onDelete(save); setConfirmDelete(false); }}>
                Yes
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs px-2" onClick={() => setConfirmDelete(false)}>
                No
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
