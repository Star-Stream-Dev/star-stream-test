import { useState, useRef } from 'react';
import { Gamepad2, Terminal, Settings, FolderOpen, Globe, Music, MessageSquare, Sparkles, Youtube, Paintbrush, Monitor, Pin, PinOff, EyeOff, Palette, Pencil, FolderPlus, FolderMinus } from 'lucide-react';
import type { DesktopTheme } from './types';

interface DesktopIconProps {
  name: string;
  icon: string;
  theme: DesktopTheme;
  onDoubleClick: () => void;
  onPin?: () => void;
  isPinned?: boolean;
  onHide?: () => void;
  onChangeIcon?: (newIcon: string) => void;
  onRename?: (newName: string) => void;
  customIcon?: string;
  customName?: string;
  position?: { x: number; y: number };
  onPositionChange?: (x: number, y: number) => void;
  folders?: Array<{ id: string; name: string }>;
  currentFolderId?: string | null;
  onMoveToFolder?: (folderId: string) => void;
  onRemoveFromFolder?: () => void;
  onCreateFolderHere?: () => void;
}

export const ICON_MAP: Record<string, any> = {
  gamepad: Gamepad2,
  terminal: Terminal,
  settings: Settings,
  folder: FolderOpen,
  globe: Globe,
  browser: Globe,
  music: Music,
  chat: MessageSquare,
  sparkles: Sparkles,
  youtube: Youtube,
  paintbrush: Paintbrush,
  monitor: Monitor,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export function DesktopIcon({ name, icon, theme, onDoubleClick, onPin, isPinned, onHide, onChangeIcon, onRename, customIcon, customName, position, onPositionChange, folders, currentFolderId, onMoveToFolder, onRemoveFromFolder, onCreateFolderHere }: DesktopIconProps) {
  const displayIcon = customIcon || icon;
  const displayName = customName || name;
  const IconComponent = ICON_MAP[displayIcon] || Monitor;
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(displayName);
  const renameRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; iconX: number; iconY: number } | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
    const close = () => { setShowMenu(false); setShowIconPicker(false); window.removeEventListener('click', close); };
    setTimeout(() => window.addEventListener('click', close), 0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isRenaming) return;
    if (!position || !onPositionChange) return;
    
    isDraggingRef.current = false;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      iconX: position.x,
      iconY: position.y,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (!isDraggingRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        isDraggingRef.current = true;
      }
      if (isDraggingRef.current) {
        const newX = Math.max(0, Math.min(window.innerWidth - 80, dragRef.current.iconX + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.iconY + dy));
        onPositionChange(newX, newY);
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current) return;
    onDoubleClick();
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim() && onRename) {
      onRename(renameValue.trim());
    }
    setIsRenaming(false);
  };

  const nameEl = isRenaming ? (
    <input
      ref={renameRef}
      autoFocus
      value={renameValue}
      onChange={e => setRenameValue(e.target.value)}
      onBlur={handleRenameSubmit}
      onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setIsRenaming(false); }}
      className="text-[11px] text-center bg-black/50 border border-primary rounded px-1 w-full outline-none text-foreground"
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
    />
  ) : null;

  const iconContent = theme === 'macos' ? (
    <div
      ref={iconRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 transition-colors select-none w-20 cursor-default"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg">
        <IconComponent className="w-7 h-7 text-white" />
      </div>
      {isRenaming ? nameEl : (
        <span className="text-[11px] text-white font-medium text-center leading-tight drop-shadow-md truncate w-full">
          {displayName}
        </span>
      )}
    </div>
  ) : (
    <div
      ref={iconRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-white/10 transition-colors select-none w-20 cursor-default"
    >
      <div className="w-12 h-12 flex items-center justify-center">
        <IconComponent className="w-8 h-8 text-primary" />
      </div>
      {isRenaming ? nameEl : (
        <span className="text-[11px] text-foreground font-normal text-center leading-tight truncate w-full">
          {displayName}
        </span>
      )}
    </div>
  );

  return (
    <>
      {iconContent}
      {showMenu && (
        <div
          className="fixed z-[700] bg-[hsl(220,20%,12%)] border border-white/10 rounded-lg shadow-2xl py-1 min-w-[170px]"
          style={{ left: menuPos.x, top: menuPos.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { onDoubleClick(); setShowMenu(false); }}
            className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-white/10 flex items-center gap-2"
          >
            <Globe className="w-3.5 h-3.5" />
            Open
          </button>

          <div className="h-px bg-white/10 mx-2 my-1" />

          {onPin && (
            <button
              onClick={() => { onPin(); setShowMenu(false); }}
              className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-white/10 flex items-center gap-2"
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              {isPinned ? 'Unpin from Taskbar' : 'Pin to Taskbar'}
            </button>
          )}

          {onRename && (
            <button
              onClick={() => { setRenameValue(displayName); setIsRenaming(true); setShowMenu(false); }}
              className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-white/10 flex items-center gap-2"
            >
              <Pencil className="w-3.5 h-3.5" />
              Rename
            </button>
          )}

          {onChangeIcon && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowIconPicker(!showIconPicker); }}
                className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-white/10 flex items-center gap-2"
              >
                <Palette className="w-3.5 h-3.5" />
                Change Icon
              </button>
              {showIconPicker && (
                <div className="absolute left-full top-0 ml-1 bg-[hsl(220,20%,12%)] border border-white/10 rounded-lg shadow-2xl p-2 grid grid-cols-4 gap-1 min-w-[140px]"
                  onClick={e => e.stopPropagation()}
                >
                  {AVAILABLE_ICONS.map(iconKey => {
                    const Ic = ICON_MAP[iconKey];
                    return (
                      <button
                        key={iconKey}
                        onClick={() => { onChangeIcon(iconKey); setShowMenu(false); setShowIconPicker(false); }}
                        className={`p-2 rounded-md hover:bg-white/20 transition-colors ${displayIcon === iconKey ? 'bg-primary/30 ring-1 ring-primary' : 'bg-white/5'}`}
                        title={iconKey}
                      >
                        <Ic className="w-4 h-4 text-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="h-px bg-white/10 mx-2 my-1" />

          {onHide && (
            <button
              onClick={() => { onHide(); setShowMenu(false); }}
              className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Remove from Desktop
            </button>
          )}
        </div>
      )}
    </>
  );
}
