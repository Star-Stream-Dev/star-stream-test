import { useState, useEffect, ChangeEvent } from 'react';
import { Upload, Download, Trash2, Gamepad2, Save, Clock, HardDrive, Search, X, ChevronRight, Calendar } from 'lucide-react';
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
      const { error: uploadError } = await supabase.storage.from('emulator-saves').upload(path, selectedFile);
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
    } catch {
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
    } catch {
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

  const latestSave = filteredSaves[0] || null;
  const otherSaves = filteredSaves.slice(1);

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
    <div className="space-y-5">
      {/* Hero / Latest Save */}
      {!loading && latestSave && (
        <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
          {/* Background image blur */}
          <div className="absolute inset-0 overflow-hidden">
            {latestSave.thumbnail_url ? (
              <img src={latestSave.thumbnail_url} alt="" className="w-full h-full object-cover opacity-20 blur-2xl scale-125" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/40" />
          </div>

          <div className="relative p-5">
            <div className="flex items-start gap-1 mb-3">
              <Clock className="w-3.5 h-3.5 text-primary mt-0.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Latest Save</span>
            </div>

            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden border border-border/50 shadow-lg">
                {latestSave.thumbnail_url ? (
                  <img src={latestSave.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Gamepad2 className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground truncate">{latestSave.save_name}</h3>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{latestSave.game_name}</p>
                  {latestSave.console && (
                    <span className="inline-block mt-2 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                      {latestSave.console}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(latestSave.created_at)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatSize(latestSave.file_size)}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-4">
              <Button size="sm" className="gap-1.5 flex-1" onClick={() => handleDownload(latestSave)}>
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 px-3" onClick={() => handleDelete(latestSave)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search saves..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button size="sm" onClick={() => setShowUpload(!showUpload)} className="gap-1.5 rounded-xl shrink-0">
          <Upload className="w-4 h-4" />
          Upload
        </Button>
      </div>

      {/* Upload form */}
      {showUpload && <UploadForm
        saveName={saveName}
        setSaveName={setSaveName}
        selectedRom={selectedRom}
        setSelectedRom={setSelectedRom}
        customGameName={customGameName}
        setCustomGameName={setCustomGameName}
        romSearch={romSearch}
        setRomSearch={setRomSearch}
        showRomDropdown={showRomDropdown}
        setShowRomDropdown={setShowRomDropdown}
        selectedFile={selectedFile}
        handleFileSelect={handleFileSelect}
        filteredRoms={filteredRoms}
        uploading={uploading}
        handleUpload={handleUpload}
        resetUploadForm={resetUploadForm}
      />}

      {/* Saves list */}
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
      ) : otherSaves.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">All Saves</h3>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full ml-auto">{filteredSaves.length}</span>
          </div>
          <div className="space-y-1.5">
            {otherSaves.map(save => (
              <SaveRow key={save.id} save={save} onDownload={handleDownload} onDelete={handleDelete} formatSize={formatSize} formatDate={formatDate} formatTime={formatTime} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Compact save row ─── */
function SaveRow({
  save, onDownload, onDelete, formatSize, formatDate, formatTime,
}: {
  save: SaveFile;
  onDownload: (s: SaveFile) => void;
  onDelete: (s: SaveFile) => void;
  formatSize: (n: number | null) => string;
  formatDate: (s: string) => string;
  formatTime: (s: string) => string;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all group">
      {/* Thumbnail */}
      <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-border/30">
        {save.thumbnail_url ? (
          <img src={save.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{save.save_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">{save.game_name}</span>
          {save.console && (
            <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-px rounded shrink-0">
              {save.console}
            </span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="hidden sm:flex flex-col items-end text-[10px] text-muted-foreground shrink-0">
        <span>{formatDate(save.created_at)}</span>
        <span>{formatSize(save.file_size)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {confirmDelete ? (
          <>
            <Button size="sm" variant="destructive" className="h-7 text-[10px] px-2" onClick={() => { onDelete(save); setConfirmDelete(false); }}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <button onClick={() => onDownload(save)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Upload form ─── */
function UploadForm({
  saveName, setSaveName, selectedRom, setSelectedRom, customGameName, setCustomGameName,
  romSearch, setRomSearch, showRomDropdown, setShowRomDropdown, selectedFile, handleFileSelect,
  filteredRoms, uploading, handleUpload, resetUploadForm,
}: {
  saveName: string; setSaveName: (v: string) => void;
  selectedRom: RomOption | null; setSelectedRom: (v: RomOption | null) => void;
  customGameName: string; setCustomGameName: (v: string) => void;
  romSearch: string; setRomSearch: (v: string) => void;
  showRomDropdown: boolean; setShowRomDropdown: (v: boolean) => void;
  selectedFile: File | null; handleFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  filteredRoms: RomOption[]; uploading: boolean;
  handleUpload: () => void; resetUploadForm: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Upload Save File</h3>
        <button onClick={resetUploadForm} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected game preview */}
      {selectedRom?.thumbnail_url && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
          <img src={selectedRom.thumbnail_url} alt="" className="w-14 h-14 rounded-lg object-cover border border-border/30" />
          <div>
            <p className="text-sm font-semibold text-foreground">{selectedRom.title}</p>
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">{selectedRom.console}</span>
          </div>
          <button onClick={() => { setSelectedRom(null); setRomSearch(''); setCustomGameName(''); }} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Save Name</label>
        <input type="text" placeholder="e.g. Final Boss Save, 100% Complete" value={saveName} onChange={e => setSaveName(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      {!selectedRom && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Game</label>
          <div className="relative">
            <input type="text" placeholder="Search ROM library or type game name..."
              value={romSearch || customGameName}
              onChange={e => { setSelectedRom(null); setRomSearch(e.target.value); setCustomGameName(e.target.value); setShowRomDropdown(true); }}
              onFocus={() => setShowRomDropdown(true)}
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            {showRomDropdown && filteredRoms.length > 0 && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                {filteredRoms.slice(0, 20).map(rom => (
                  <button key={rom.id}
                    onClick={() => { setSelectedRom(rom); setRomSearch(''); setCustomGameName(''); setShowRomDropdown(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors">
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
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Save File</label>
        <label className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-border bg-muted/20 hover:border-primary/40 cursor-pointer transition-colors">
          <Upload className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {selectedFile ? selectedFile.name : 'Click to select a save file (.sav, .srm, .state, etc.)'}
          </span>
          <input type="file" className="hidden"
            accept=".sav,.srm,.state,.sn1,.sn2,.sn3,.sn4,.sn5,.sn6,.sn7,.sn8,.sn9,.ss0,.ss1,.ss2,.ss3,.ss4,.ss5,.ss6,.ss7,.ss8,.ss9,.oops,.cht,.mcr,.fla,.eep,.mpk,.dat,.dsv"
            onChange={handleFileSelect} />
        </label>
      </div>

      <Button onClick={handleUpload} disabled={uploading || !selectedFile || (!selectedRom && !customGameName.trim()) || !saveName.trim()} className="w-full gap-2 rounded-xl">
        {uploading ? 'Uploading...' : 'Upload Save'}
      </Button>
    </div>
  );
}

