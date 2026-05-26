import { FolderOpen, FolderMinus } from 'lucide-react';
import { ICON_MAP } from './DesktopIcon';
import { Monitor } from 'lucide-react';

interface FolderContentsProps {
  folderName: string;
  apps: Array<{ id: string; name: string; icon: string; customIcon?: string; customName?: string }>;
  onOpenApp: (id: string, name: string) => void;
  onRemoveApp: (id: string) => void;
  onRenameFolder: (name: string) => void;
  onDeleteFolder: () => void;
}

export function FolderContents({ folderName, apps, onOpenApp, onRemoveApp, onRenameFolder, onDeleteFolder }: FolderContentsProps) {
  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-black/20 shrink-0">
        <FolderOpen className="w-4 h-4 text-primary" />
        <input
          defaultValue={folderName}
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== folderName) onRenameFolder(v); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none focus:bg-white/5 px-1 rounded"
        />
        <button
          onClick={onDeleteFolder}
          className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Delete Folder
        </button>
      </div>

      {apps.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
          <FolderOpen className="w-10 h-10 opacity-40" />
          <p>This folder is empty</p>
          <p className="text-xs opacity-70">Right-click an app on the desktop to move it here</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3">
            {apps.map(app => {
              const Ic = ICON_MAP[app.customIcon || app.icon] || Monitor;
              const name = app.customName || app.name;
              return (
                <div key={app.id} className="group relative">
                  <button
                    onDoubleClick={() => onOpenApp(app.id, name)}
                    onClick={() => onOpenApp(app.id, name)}
                    className="w-full flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-white/20 to-white/5 border border-white/10 flex items-center justify-center">
                      <Ic className="w-7 h-7 text-primary" />
                    </div>
                    <span className="text-[11px] text-foreground text-center leading-tight truncate w-full">{name}</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveApp(app.id); }}
                    title="Remove from folder"
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-black/60 hover:bg-red-500/40"
                  >
                    <FolderMinus className="w-3 h-3 text-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
