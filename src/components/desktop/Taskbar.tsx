import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Wifi, Volume2, BatteryFull, ChevronUp, LogOut, Pin, PinOff, Gamepad2, Terminal, Folder, Settings, Music, MessageSquare, X, Eye } from 'lucide-react';
import type { DesktopTheme, DesktopWindow, DesktopApp } from './types';
import { ICON_MAP } from './DesktopIcon';

import starstreamIcon from '@/assets/starstream-icon.png';

interface TaskbarProps {
  theme: DesktopTheme;
  windows: DesktopWindow[];
  pinnedApps: string[];
  allApps: DesktopApp[];
  hiddenApps: string[];
  onWindowClick: (id: string) => void;
  onAppLaunch: (id: string, name: string) => void;
  onUnpin: (id: string) => void;
  onExitDesktop: () => void;
  onUnhideApp: (id: string) => void;
}

const APP_ICONS: Record<string, React.ReactNode> = {
  terminal: <Terminal className="w-4 h-4" />,
  folder: <Folder className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  gamepad: <Gamepad2 className="w-4 h-4" />,
  music: <Music className="w-4 h-4" />,
  chat: <MessageSquare className="w-4 h-4" />,
};

export function Taskbar({ theme, windows, pinnedApps, allApps, hiddenApps, onWindowClick, onAppLaunch, onUnpin, onExitDesktop, onUnhideApp }: TaskbarProps) {
  const [time, setTime] = useState(new Date());
  const [showTray, setShowTray] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; appId: string; appName: string; isPinned: boolean } | null>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [searchOpen]);

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const handleContextMenu = (e: React.MouseEvent, appId: string, appName: string, isPinned: boolean) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY - 60, appId, appName, isPinned });
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allApps;
    const q = searchQuery.toLowerCase();
    return allApps.filter(a => a.name.toLowerCase().includes(q));
  }, [searchQuery, allApps]);

  const pinnedNotOpen = pinnedApps.filter(id => !windows.some(w => w.appId === id));
  const pinnedAppDetails = pinnedNotOpen.map(id => allApps.find(a => a.id === id)).filter(Boolean) as DesktopApp[];
  const hiddenAppDetails = hiddenApps.map(id => allApps.find(a => a.id === id)).filter(Boolean) as DesktopApp[];

  const launchFromSearch = (appId: string, appName: string) => {
    onAppLaunch(appId, appName);
    setSearchOpen(false);
    setSearchQuery('');
  };

  // Search panel content rendered inline (not as a component) to prevent remount on state change
  const windowsSearchContent = (
    <>
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2.5 border border-white/10">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Type here to search"
            className="bg-transparent flex-1 text-sm text-foreground placeholder-muted-foreground outline-none"
          />
          {searchQuery && (
            <button onMouseDown={e => { e.stopPropagation(); setSearchQuery(''); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <div className="p-3">
          {searchQuery.trim() ? (
            <div className="text-xs text-muted-foreground/70 uppercase tracking-wider px-2 mb-2">
              {searchResults.length > 0 ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}` : 'No results'}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground/70 uppercase tracking-wider px-2 mb-2">All Apps</div>
          )}

          <div className="space-y-0.5">
            {searchResults.map(app => {
              const IconComp = ICON_MAP[app.icon] || Settings;
              const isHidden = hiddenApps.includes(app.id);
              return (
                <div key={app.id} className="flex items-center gap-3">
                  <button
                    onMouseDown={e => { e.stopPropagation(); launchFromSearch(app.id, app.name); }}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <IconComp className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate">{app.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{app.type === 'custom' ? 'App' : app.type}</div>
                    </div>
                  </button>
                  {isHidden && (
                    <button
                      onMouseDown={e => { e.stopPropagation(); onUnhideApp(app.id); }}
                      className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                      title="Restore to desktop"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {hiddenAppDetails.length > 0 && !searchQuery.trim() && (
            <>
              <div className="h-px bg-white/10 my-3" />
              <div className="text-xs text-muted-foreground/70 uppercase tracking-wider px-2 mb-2">Hidden from Desktop</div>
              <div className="space-y-0.5">
                {hiddenAppDetails.map(app => {
                  const IconComp = ICON_MAP[app.icon] || Settings;
                  return (
                    <div key={app.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 opacity-50">
                        <IconComp className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="flex-1 text-sm text-muted-foreground truncate">{app.name}</span>
                      <button
                        onMouseDown={e => { e.stopPropagation(); onUnhideApp(app.id); }}
                        className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );

  // macOS Spotlight content (inline, not a component)
  const spotlightContent = (
    <div className="fixed inset-0 z-[600] flex items-start justify-center pt-[20vh]" onMouseDown={() => { setSearchOpen(false); setSearchQuery(''); }}>
      <div className="w-[520px] max-w-[90vw] bg-[hsl(220,15%,15%)]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
          <Search className="w-5 h-5 text-white/40" />
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Spotlight Search"
            className="bg-transparent flex-1 text-lg text-white placeholder-white/30 outline-none"
          />
        </div>
        <div className="h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div className="p-2">
            {searchResults.map(app => {
              const IconComp = ICON_MAP[app.icon] || Settings;
              const isHidden = hiddenApps.includes(app.id);
              return (
                <div key={app.id} className="flex items-center gap-3">
                  <button
                    onMouseDown={e => { e.stopPropagation(); launchFromSearch(app.id, app.name); }}
                    className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/30 transition-colors text-left"
                  >
                    <IconComp className="w-5 h-5 text-white/70" />
                    <span className="text-sm text-white">{app.name}</span>
                    <span className="text-[10px] text-white/40 ml-auto capitalize">{app.type === 'custom' ? 'App' : app.type}</span>
                  </button>
                  {isHidden && (
                    <button
                      onMouseDown={e => { e.stopPropagation(); onUnhideApp(app.id); }}
                      className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                      title="Restore to desktop"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            {searchResults.length === 0 && (
              <div className="text-center text-white/30 py-8 text-sm">No results found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (theme === 'macos') {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 h-7 z-[500] bg-black/50 backdrop-blur-xl flex items-center justify-between px-4 text-[13px] text-white/90 font-medium">
          <div className="flex items-center gap-4">
            <span className="font-bold">☀ Star Stream</span>
            <span className="text-white/60">File</span>
            <span className="text-white/60">Edit</span>
            <span className="text-white/60">View</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(!searchOpen)} className="hover:bg-white/10 rounded px-1">
              <Search className="w-3.5 h-3.5 text-white/70" />
            </button>
            <Wifi className="w-3.5 h-3.5 text-white/70" />
            <Volume2 className="w-3.5 h-3.5 text-white/70" />
            <BatteryFull className="w-3.5 h-3.5 text-white/70" />
            <span>{formatTime(time)}</span>
          </div>
        </div>

        {searchOpen && spotlightContent}

        {/* Hover trigger zone at bottom of screen */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[499] w-[400px] h-2 group">
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[500] flex items-end gap-1 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl translate-y-[calc(100%+8px)] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out pointer-events-none group-hover:pointer-events-auto">
          {pinnedAppDetails.map(app => (
            <button key={app.id} onClick={() => onAppLaunch(app.id, app.name)}
              onContextMenu={(e) => handleContextMenu(e, app.id, app.name, true)}
              className="w-12 h-12 rounded-xl bg-gradient-to-b from-white/20 to-white/5 border border-white/10 flex items-center justify-center hover:scale-110 transition-transform"
              title={app.name}>
              {APP_ICONS[app.icon] || <span className="text-lg">🪟</span>}
            </button>
          ))}
          {pinnedAppDetails.length > 0 && windows.length > 0 && <div className="w-px h-8 bg-white/20 mx-1" />}
          {windows.map(w => (
            <button key={w.id} onClick={() => onWindowClick(w.id)}
              onContextMenu={(e) => handleContextMenu(e, w.appId, w.title, pinnedApps.includes(w.appId))}
              className="w-12 h-12 rounded-xl bg-gradient-to-b from-white/20 to-white/5 border border-white/10 flex items-center justify-center hover:scale-110 transition-transform relative"
              title={w.title}>
              {APP_ICONS[allApps.find(a => a.id === w.appId)?.icon || ''] || <span className="text-lg">🪟</span>}
              <div className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
            </button>
          ))}
          <div className="w-px h-8 bg-white/20 mx-1" />
          <button onClick={onExitDesktop}
            className="w-12 h-12 rounded-xl bg-gradient-to-b from-red-500/30 to-red-600/20 border border-red-400/20 flex items-center justify-center hover:scale-110 transition-transform"
            title="Exit to Star Stream">
            <LogOut className="w-5 h-5 text-red-300" />
          </button>
        </div>
        </div>

        {contextMenu && (
          <div className="fixed z-[600] bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button onClick={() => { onUnpin(contextMenu.appId); setContextMenu(null); }}
              className="w-full px-3 py-1.5 text-left text-sm text-white/90 hover:bg-white/10 flex items-center gap-2">
              {contextMenu.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              {contextMenu.isPinned ? 'Unpin from Dock' : 'Pin to Dock'}
            </button>
          </div>
        )}
      </>
    );
  }

  // Windows 11 style taskbar
  return (
    <>
      {/* Search backdrop - clicks here close the panel */}
      {searchOpen && (
        <div className="fixed inset-0 z-[550]" onMouseDown={() => { setSearchOpen(false); setSearchQuery(''); }} />
      )}

      {/* Search panel - rendered outside taskbar for proper z-index stacking */}
      {searchOpen && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-[560px] max-w-[90vw] bg-[hsl(220,20%,10%)]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[600]"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {windowsSearchContent}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 h-12 z-[500] bg-[hsl(220,20%,10%)]/90 backdrop-blur-xl border-t border-white/10 flex items-center px-3">
        <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 rounded-md hover:bg-white/10 transition-colors">
          <img src={starstreamIcon} alt="" className="w-5 h-5" />
        </button>

        <button onClick={() => setSearchOpen(!searchOpen)}
          className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-muted-foreground w-48 hover:bg-white/10 transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </button>

        <div className="flex-1 flex items-center gap-1 ml-3">
          {pinnedAppDetails.map(app => (
            <button key={app.id} onClick={() => onAppLaunch(app.id, app.name)}
              onContextMenu={(e) => handleContextMenu(e, app.id, app.name, true)}
              className="px-3 py-1.5 rounded-md text-xs bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors flex items-center gap-1.5">
              {APP_ICONS[app.icon] || null}
              {app.name.length > 15 ? app.name.slice(0, 15) + '…' : app.name}
            </button>
          ))}
          {windows.map(w => (
            <button key={w.id} onClick={() => onWindowClick(w.id)}
              onContextMenu={(e) => handleContextMenu(e, w.appId, w.title, pinnedApps.includes(w.appId))}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 ${
                w.isMinimized ? 'bg-white/5 text-muted-foreground' : 'bg-white/10 text-foreground border-b-2 border-primary'
              }`}>
              {APP_ICONS[allApps.find(a => a.id === w.appId)?.icon || ''] || null}
              {w.title.length > 15 ? w.title.slice(0, 15) + '…' : w.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => setShowTray(!showTray)} className="p-1 hover:bg-white/10 rounded">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <Wifi className="w-3.5 h-3.5" />
          <Volume2 className="w-3.5 h-3.5" />
          <BatteryFull className="w-3.5 h-3.5" />
          <div className="text-right pl-2">
            <div className="text-[11px]">{formatTime(time)}</div>
            <div className="text-[10px] text-muted-foreground/70">{formatDate(time)}</div>
          </div>
          <button onClick={onExitDesktop} className="ml-2 p-1.5 hover:bg-destructive/20 rounded transition-colors" title="Exit to Star Stream">
            <LogOut className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>

        {showTray && (
          <div className="absolute bottom-14 right-4 bg-[hsl(220,20%,12%)] border border-white/10 rounded-xl p-4 shadow-2xl w-72">
            <div className="text-sm text-foreground mb-2">Quick Settings</div>
            <div className="grid grid-cols-3 gap-2">
              <button className="p-3 rounded-lg bg-primary/20 text-primary text-xs flex flex-col items-center gap-1"><Wifi className="w-4 h-4" />Connected</button>
              <button className="p-3 rounded-lg bg-white/5 text-muted-foreground text-xs flex flex-col items-center gap-1"><Volume2 className="w-4 h-4" />100%</button>
              <button className="p-3 rounded-lg bg-white/5 text-muted-foreground text-xs flex flex-col items-center gap-1"><BatteryFull className="w-4 h-4" />99%</button>
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <div className="fixed z-[600] bg-[hsl(220,20%,12%)] border border-white/10 rounded-lg shadow-2xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button onClick={() => { onUnpin(contextMenu.appId); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-white/10 flex items-center gap-2">
            {contextMenu.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            {contextMenu.isPinned ? 'Unpin from Taskbar' : 'Pin to Taskbar'}
          </button>
        </div>
      )}
    </>
  );
}
