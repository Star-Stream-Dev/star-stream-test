import { useState, useCallback, ChangeEvent } from 'react';
import { EmulatorJS } from 'react-emulatorjs';
import { ArrowLeft, Upload, Gamepad2, Info, Library, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RomLibrary } from '@/components/RomLibrary';
import { SaveManager } from '@/components/emulator/SaveManager';

interface RetroArchPlayerProps {
  onClose: () => void;
}

const CORES = [
  { id: 'nes', label: 'NES', extensions: ['.nes', '.zip'] },
  { id: 'snes', label: 'SNES', extensions: ['.smc', '.sfc', '.zip'] },
  { id: 'gba', label: 'Game Boy Advance', extensions: ['.gba', '.zip'] },
  { id: 'gb', label: 'Game Boy', extensions: ['.gb', '.gbc', '.zip'] },
  { id: 'n64', label: 'Nintendo 64', extensions: ['.n64', '.z64', '.v64', '.zip'] },
  { id: 'nds', label: 'Nintendo DS', extensions: ['.nds', '.zip'] },
  { id: 'segaMD', label: 'Sega Genesis / Mega Drive', extensions: ['.md', '.gen', '.bin', '.zip'] },
  { id: 'segaMS', label: 'Sega Master System', extensions: ['.sms', '.zip'] },
  { id: 'psx', label: 'PlayStation', extensions: ['.bin', '.cue', '.iso', '.pbp', '.chd', '.zip'] },
  { id: 'atari2600', label: 'Atari 2600', extensions: ['.a26', '.zip'] },
  { id: 'arcade', label: 'Arcade (MAME)', extensions: ['.zip'] },
  { id: 'dos', label: 'DOS-Box', extensions: ['.exe', '.com', '.zip', '.iso'] },
] as const;

type CoreId = typeof CORES[number]['id'];

export function RetroArchPlayer({ onClose }: RetroArchPlayerProps) {
  const [selectedCore, setSelectedCore] = useState<CoreId | null>(null);
  const [romUrl, setRomUrl] = useState<string | null>(null);
  const [romName, setRomName] = useState<string>('');
  const [showInfo, setShowInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<'play' | 'library' | 'saves'>('library');

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRomUrl(url);
    setRomName(file.name);
  }, []);

  const handleReset = useCallback(() => {
    if (romUrl) URL.revokeObjectURL(romUrl);
    setRomUrl(null);
    setRomName('');
    setSelectedCore(null);
  }, [romUrl]);

  // Playing state — show the emulator
  if (selectedCore && romUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Gamepad2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground truncate">{romName}</span>
            <span className="text-xs text-muted-foreground">
              ({CORES.find(c => c.id === selectedCore)?.label})
            </span>
          </div>
        </div>
        {/* Emulator */}
        <div className="flex-1 min-h-0">
          <EmulatorJS
            EJS_core={selectedCore as any}
            EJS_gameUrl={romUrl}
            EJS_pathtodata="https://cdn.emulatorjs.org/stable/data/"
            EJS_startOnLoaded={true}
            EJS_thread={true}
          />
        </div>
      </div>
    );
  }

  // Selection screen
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Gamepad2 className="w-6 h-6 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Emulator</h1>
        <div className="flex-1" />
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'library' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Library className="w-4 h-4" />
            ROM Library
          </button>
          <button
            onClick={() => setActiveTab('play')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'play' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="w-4 h-4" />
            Load ROM
          </button>
          <button
            onClick={() => setActiveTab('saves')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'saves' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Save className="w-4 h-4" />
            Saves
          </button>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowInfo(!showInfo)}>
          <Info className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-8">
        {showInfo && (
          <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">How it works</p>
            <p>Browse the ROM Library to download games, or use "Load ROM" to play a ROM file from your device directly in the browser.</p>
            <p>Save states and settings are stored locally in your browser via IndexedDB.</p>
            <p className="text-xs">Powered by EmulatorJS. Only use ROM files you legally own.</p>
          </div>
        )}

        {activeTab === 'library' ? (
          <RomLibrary />
        ) : activeTab === 'saves' ? (
          <SaveManager />
        ) : (
          <>
            {/* Step 1: Select Console */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">1. Select Console</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CORES.map(core => (
                  <button
                    key={core.id}
                    onClick={() => setSelectedCore(core.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left ${
                      selectedCore === core.id
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">{core.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Load ROM */}
            {selectedCore && (
              <div className="space-y-3 animate-fade-in">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">2. Load ROM File</h2>
                <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed border-border bg-card hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to select a ROM file
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    Supported: {CORES.find(c => c.id === selectedCore)?.extensions.join(', ')}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept={CORES.find(c => c.id === selectedCore)?.extensions.join(',')}
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
