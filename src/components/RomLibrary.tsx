import { useState, useEffect } from 'react';
import { Download, Gamepad2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Rom {
  id: string;
  title: string;
  console: string;
  thumbnail_url: string | null;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

const CONSOLE_LIST = [
  'All', 'NES', 'SNES', 'Game Boy', 'Game Boy Advance', 'Nintendo 64',
  'Nintendo DS', 'Sega Genesis', 'Sega Master System', 'PlayStation',
  'Atari 2600', 'Arcade',
];

export function RomLibrary() {
  const [roms, setRoms] = useState<Rom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsole, setSelectedConsole] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRoms();
  }, []);

  const fetchRoms = async () => {
    try {
      const { data, error } = await supabase
        .from('rom_library')
        .select('*')
        .order('console', { ascending: true })
        .order('title', { ascending: true });
      if (error) throw error;
      setRoms(data || []);
    } catch (err) {
      console.error('Error fetching ROMs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from('rom-files').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = roms.filter(r => {
    const matchConsole = selectedConsole === 'All' || r.console === selectedConsole;
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    return matchConsole && matchSearch;
  });

  // Group by console
  const grouped = filtered.reduce<Record<string, Rom[]>>((acc, rom) => {
    if (!acc[rom.console]) acc[rom.console] = [];
    acc[rom.console].push(rom);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Loading ROM library...</div>
      </div>
    );
  }

  if (roms.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground">No ROMs available yet.</p>
        <p className="text-sm text-muted-foreground/60">Check back later — admins can upload ROM files for you to download.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ROMs..."
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* Console tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CONSOLE_LIST.filter(c => c === 'All' || roms.some(r => r.console === c)).map(console => (
          <button
            key={console}
            onClick={() => setSelectedConsole(console)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedConsole === console
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {console}
          </button>
        ))}
      </div>

      {/* ROM grid grouped by console */}
      {Object.entries(grouped).map(([consoleName, consoleRoms]) => (
        <div key={consoleName} className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-primary" />
            {consoleName}
            <span className="text-xs text-muted-foreground font-normal">({consoleRoms.length})</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {consoleRoms.map(rom => (
              <div
                key={rom.id}
                className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all"
              >
                {rom.thumbnail_url ? (
                  <img
                    src={rom.thumbnail_url}
                    alt={rom.title}
                    className="w-full aspect-[4/3] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
                    <Gamepad2 className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <h4 className="text-sm font-medium text-foreground truncate" title={rom.title}>
                    {rom.title}
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatSize(rom.file_size)}</span>
                    <a
                      href={getDownloadUrl(rom.file_path)}
                      download={rom.title}
                      className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
