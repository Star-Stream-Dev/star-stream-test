import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { DesktopIcon } from './DesktopIcon';
import { Taskbar } from './Taskbar';
import { DesktopWindowComponent } from './DesktopWindow';
import { DesktopTerminal } from './DesktopTerminal';
import { FileManager } from './FileManager';
import { SettingsApp } from './SettingsApp';
import { DesktopChat } from './DesktopChat';
import { DesktopMusic } from './DesktopMusic';
import { CodeEditor } from './CodeEditor';
import { YouTubeMusicProvider } from '@/contexts/YouTubeMusicContext';
import { YouTubeMusicPlayer } from '@/components/music/YouTubeMusicPlayer';
import type { DesktopTheme, DesktopApp, DesktopWindow, FileSystemNode } from './types';
import { DEFAULT_FILE_SYSTEM } from './types';

interface DesktopEnvironmentProps {
  onExit: () => void;
}

const DESKTOP_APPS: DesktopApp[] = [
  { id: 'terminal', name: 'Terminal', icon: 'terminal', type: 'terminal' },
  { id: 'code-editor', name: 'SolarCode', icon: 'code', type: 'custom' },
  { id: 'files', name: 'Files', icon: 'folder', type: 'filemanager' },
  { id: 'chat', name: 'Chat', icon: 'chat', type: 'custom' },
  { id: 'music', name: 'Music', icon: 'music', type: 'custom' },
  { id: 'settings', name: 'Settings', icon: 'settings', type: 'settings' },
];

// Generate default grid positions for icons
function generateDefaultPositions(ids: string[], theme: string): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const cols = Math.floor((window.innerHeight - 100) / 90);
  ids.forEach((id, i) => {
    const col = Math.floor(i / cols);
    const row = i % cols;
    if (theme === 'macos') {
      positions[id] = { x: window.innerWidth - 100 - col * 90, y: 40 + row * 90 };
    } else {
      positions[id] = { x: 20 + col * 90, y: 20 + row * 90 };
    }
  });
  return positions;
}

export function DesktopEnvironment({ onExit }: DesktopEnvironmentProps) {
  const { user, sessionToken } = useAuth();
  const { customBackground } = useTheme();
  const [theme, setTheme] = useState<DesktopTheme>(() => {
    return (localStorage.getItem('solarnova-desktop-theme') as DesktopTheme) || 'windows';
  });
  const [windows, setWindows] = useState<DesktopWindow[]>([]);
  const [nextZIndex, setNextZIndex] = useState(100);
  const [fileSystem, setFileSystemState] = useState<Record<string, FileSystemNode>>(() => {
    try {
      const saved = localStorage.getItem('solarnova-desktop-fs');
      return saved ? JSON.parse(saved) : DEFAULT_FILE_SYSTEM;
    } catch { return DEFAULT_FILE_SYSTEM; }
  });

  const [musicActivated, setMusicActivated] = useState(false);

  // Desktop customization state
  const [hiddenApps, setHiddenApps] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('solarnova-desktop-hidden') || '[]'); } catch { return []; }
  });
  const [customIcons, setCustomIcons] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('solarnova-desktop-icons') || '{}'); } catch { return {}; }
  });
  const [customNames, setCustomNames] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('solarnova-desktop-names') || '{}'); } catch { return {}; }
  });
  const [iconPositions, setIconPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try { return JSON.parse(localStorage.getItem('solarnova-desktop-positions') || '{}'); } catch { return {}; }
  });

  const fsSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setFileSystem = useCallback((fs: Record<string, FileSystemNode>) => {
    setFileSystemState(fs);
    try { localStorage.setItem('solarnova-desktop-fs', JSON.stringify(fs)); } catch {}
    if (user) {
      if (fsSaveTimeout.current) clearTimeout(fsSaveTimeout.current);
      fsSaveTimeout.current = setTimeout(() => {
        supabase.rpc('upsert_my_file_system', {
          p_session_token: sessionToken!,
          p_file_system: fs as any,
        }).then(() => {});
      }, 1500);
    }
  }, [user]);

  const [games, setGames] = useState<any[]>([]);
  const [pinnedApps, setPinnedAppsState] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('solarnova-desktop-pinned') || '[]');
    } catch { return []; }
  });

  const setPinnedApps = useCallback((updater: (prev: string[]) => string[]) => {
    setPinnedAppsState(prev => {
      const next = updater(prev);
      localStorage.setItem('solarnova-desktop-pinned', JSON.stringify(next));
      if (user) {
        if (pinSaveTimeout.current) clearTimeout(pinSaveTimeout.current);
        pinSaveTimeout.current = setTimeout(() => {
          supabase.rpc('upsert_my_pinned_apps', {
            p_caller_id: user.id,
            p_pinned_apps: next as any,
          }).then(() => {});
        }, 500);
      }
      return next;
    });
  }, [user]);

  const saveCustomizations = useCallback((updates: { hidden_apps?: string[]; custom_icons?: Record<string, string>; custom_names?: Record<string, string>; icon_positions?: Record<string, { x: number; y: number }> }) => {
    if (!user) return;
    if (customSaveTimeout.current) clearTimeout(customSaveTimeout.current);
    customSaveTimeout.current = setTimeout(() => {
      supabase.rpc('upsert_my_desktop_customizations', {
        p_caller_id: user.id,
        p_hidden_apps: (updates.hidden_apps || []) as any,
        p_custom_icons: (updates.custom_icons || {}) as any,
        p_custom_names: (updates.custom_names || {}) as any,
        p_icon_positions: (updates.icon_positions || {}) as any,
      }).then(() => {});
    }, 1000);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('desktop_file_systems').select('file_system').eq('user_id', user.id).maybeSingle(),
      supabase.from('desktop_pinned_apps').select('pinned_apps').eq('user_id', user.id).maybeSingle(),
      supabase.from('desktop_customizations').select('*').eq('user_id', user.id).maybeSingle(),
    ]).then(([fsResult, pinsResult, customResult]) => {
      if (fsResult.data?.file_system) {
        const dbFs = fsResult.data.file_system as unknown as Record<string, FileSystemNode>;
        setFileSystemState(dbFs);
        try { localStorage.setItem('solarnova-desktop-fs', JSON.stringify(dbFs)); } catch {}
      }
      if (pinsResult.data?.pinned_apps) {
        const dbPins = pinsResult.data.pinned_apps as string[];
        setPinnedAppsState(dbPins);
        localStorage.setItem('solarnova-desktop-pinned', JSON.stringify(dbPins));
      }
      if (customResult.data) {
        const c = customResult.data;
        if (c.hidden_apps) { const h = c.hidden_apps as string[]; setHiddenApps(h); localStorage.setItem('solarnova-desktop-hidden', JSON.stringify(h)); }
        if (c.custom_icons) { const i = c.custom_icons as Record<string, string>; setCustomIcons(i); localStorage.setItem('solarnova-desktop-icons', JSON.stringify(i)); }
        if (c.custom_names) { const n = c.custom_names as Record<string, string>; setCustomNames(n); localStorage.setItem('solarnova-desktop-names', JSON.stringify(n)); }
        if (c.icon_positions) { const p = c.icon_positions as Record<string, { x: number; y: number }>; setIconPositions(p); localStorage.setItem('solarnova-desktop-positions', JSON.stringify(p)); }
      }
    });
  }, [user]);

  useEffect(() => {
    supabase.from('games').select('id, title, url, embed, category').order('display_order').then(({ data }) => {
      if (data) setGames(data);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('solarnova-desktop-theme', theme);
  }, [theme]);

  const updateIconPosition = useCallback((appId: string, x: number, y: number) => {
    setIconPositions(prev => {
      const next = { ...prev, [appId]: { x, y } };
      localStorage.setItem('solarnova-desktop-positions', JSON.stringify(next));
      saveCustomizations({ icon_positions: next });
      return next;
    });
  }, [saveCustomizations]);

  const togglePin = useCallback((appId: string) => {
    setPinnedApps(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  }, [setPinnedApps]);

  const hideApp = useCallback((appId: string) => {
    setHiddenApps(prev => {
      const next = [...prev, appId];
      localStorage.setItem('solarnova-desktop-hidden', JSON.stringify(next));
      saveCustomizations({ hidden_apps: next });
      return next;
    });
  }, [saveCustomizations]);

  const unhideApp = useCallback((appId: string) => {
    setHiddenApps(prev => {
      const next = prev.filter(id => id !== appId);
      localStorage.setItem('solarnova-desktop-hidden', JSON.stringify(next));
      saveCustomizations({ hidden_apps: next });
      return next;
    });
  }, [saveCustomizations]);

  const changeIcon = useCallback((appId: string, newIcon: string) => {
    setCustomIcons(prev => {
      const next = { ...prev, [appId]: newIcon };
      localStorage.setItem('solarnova-desktop-icons', JSON.stringify(next));
      saveCustomizations({ custom_icons: next });
      return next;
    });
  }, [saveCustomizations]);

  const renameApp = useCallback((appId: string, newName: string) => {
    setCustomNames(prev => {
      const next = { ...prev, [appId]: newName };
      localStorage.setItem('solarnova-desktop-names', JSON.stringify(next));
      saveCustomizations({ custom_names: next });
      return next;
    });
  }, [saveCustomizations]);

  const openWindow = useCallback((appId: string, title: string) => {
    if (appId === 'music') setMusicActivated(true);
    const existing = windows.find(w => w.appId === appId);
    if (existing) {
      setWindows(prev => prev.map(w => w.id === existing.id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w));
      setNextZIndex(prev => prev + 1);
      return;
    }
    const offsetCount = windows.length;
    const isGame = games.find(g => g.id === appId);
    const isCodeEditor = appId === 'code-editor';
    const newWindow: DesktopWindow = {
      id: `${appId}-${Date.now()}`,
      appId,
      title,
      isMinimized: false,
      isMaximized: !!isGame,
      zIndex: nextZIndex,
      x: 100 + offsetCount * 30,
      y: 60 + offsetCount * 30,
      width: isGame ? window.innerWidth : isCodeEditor ? 1000 : 700,
      height: isGame ? window.innerHeight - 48 : isCodeEditor ? 600 : 450,
    };
    setWindows(prev => [...prev, newWindow]);
    setNextZIndex(prev => prev + 1);
  }, [windows, nextZIndex, games]);

  const closeWindow = (id: string) => setWindows(prev => prev.filter(w => w.id !== id));
  const minimizeWindow = (id: string) => setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  const maximizeWindow = (id: string) => setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  const focusWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w));
    setNextZIndex(prev => prev + 1);
  };
  const moveWindow = (id: string, x: number, y: number) => setWindows(prev => prev.map(w => w.id === id ? { ...w, x, y } : w));
  const resizeWindow = (id: string, w: number, h: number, x?: number, y?: number) => setWindows(prev => prev.map(win => win.id === id ? { ...win, width: w, height: h, ...(x !== undefined ? { x } : {}), ...(y !== undefined ? { y } : {}) } : win));

  const handleWindowClick = (id: string) => {
    const win = windows.find(w => w.id === id);
    if (win?.isMinimized) minimizeWindow(id);
    else focusWindow(id);
  };

  const renderWindowContent = (win: DesktopWindow) => {
    if (win.appId === 'terminal') return <DesktopTerminal fileSystem={fileSystem} onFileSystemChange={setFileSystem} />;
    if (win.appId === 'code-editor') return <CodeEditor fileSystem={fileSystem} onFileSystemChange={setFileSystem} onOpenTerminal={() => openWindow('terminal', 'Terminal')} onClose={() => closeWindow(win.id)} onMinimize={() => minimizeWindow(win.id)} onMaximize={() => maximizeWindow(win.id)} isMaximized={win.isMaximized} />;
    if (win.appId === 'files') return <FileManager fileSystem={fileSystem} onFileSystemChange={setFileSystem} />;
    if (win.appId === 'settings') return <SettingsApp theme={theme} onThemeChange={setTheme} />;
    if (win.appId === 'chat') return <DesktopChat />;
    if (win.appId === 'music') return <DesktopMusic />;
    const game = games.find(g => g.id === win.appId);
    if (game && game.embed) {
      return (
        <iframe src={game.url} title={game.title} className="w-full h-full border-0"
          allow="fullscreen; autoplay; encrypted-media" allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals" />
      );
    }
    if (game) {
      return (
        <div className="p-6 flex flex-col items-center justify-center h-full gap-4">
          <h3 className="text-lg font-bold text-foreground">{game.title}</h3>
          <p className="text-sm text-muted-foreground">[{game.category}]</p>
          <button onClick={() => window.open(game.url, '_blank')}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors">
            Open in New Tab
          </button>
        </div>
      );
    }
    return <div className="p-4 text-muted-foreground">Unknown app</div>;
  };

  const hasCustomBg = customBackground.type !== 'none' && customBackground.url;
  const wallpaper = theme === 'macos'
    ? 'bg-gradient-to-br from-[hsl(270,60%,30%)] via-[hsl(300,50%,25%)] to-[hsl(330,60%,30%)]'
    : 'bg-gradient-to-br from-[hsl(220,50%,15%)] via-[hsl(270,40%,20%)] to-[hsl(220,50%,15%)]';

  // Build all icon entries
  const allIcons = [
    ...DESKTOP_APPS.map(app => ({ id: app.id, name: app.name, icon: app.icon })),
    ...games.slice(0, 12).map(g => ({ id: g.id, name: g.title, icon: 'gamepad' })),
  ];
  const visibleIcons = allIcons.filter(app => !hiddenApps.includes(app.id));

  // Ensure all visible icons have positions
  const needsDefaults = visibleIcons.some(ic => !iconPositions[ic.id]);
  const rawPositions = needsDefaults
    ? { ...generateDefaultPositions(visibleIcons.map(i => i.id), theme), ...iconPositions }
    : iconPositions;

  // Clamp positions to current viewport so icons never go off-screen
  const [viewportSize, setViewportSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const ICON_SIZE = 80; // approximate icon box size
  const TASKBAR_HEIGHT = 48;
  const effectivePositions = useMemo(() => {
    const clamped: Record<string, { x: number; y: number }> = {};
    for (const [id, pos] of Object.entries(rawPositions)) {
      clamped[id] = {
        x: Math.max(0, Math.min(pos.x, viewportSize.w - ICON_SIZE)),
        y: Math.max(0, Math.min(pos.y, viewportSize.h - TASKBAR_HEIGHT - ICON_SIZE)),
      };
    }
    return clamped;
  }, [rawPositions, viewportSize]);

  return (
    <div className={`fixed inset-0 z-[300] overflow-hidden select-none ${!hasCustomBg ? wallpaper : 'bg-black'}`}>
      {hasCustomBg && customBackground.type === 'video' && (
        <video src={customBackground.url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" />
      )}
      {hasCustomBg && customBackground.type === 'image' && (
        <img src={customBackground.url} alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
      )}

      {/* Desktop Icons - absolute positioned freely */}
      {visibleIcons.map(app => {
        const pos = effectivePositions[app.id] || { x: 20, y: 20 };
        return (
          <div key={app.id} className="absolute z-10" style={{ left: pos.x, top: pos.y }}>
            <DesktopIcon
              name={app.name}
              icon={app.icon}
              theme={theme}
              customIcon={customIcons[app.id]}
              customName={customNames[app.id]}
              position={pos}
              onPositionChange={(x, y) => updateIconPosition(app.id, x, y)}
              onDoubleClick={() => openWindow(app.id, customNames[app.id] || app.name)}
              onPin={() => togglePin(app.id)}
              isPinned={pinnedApps.includes(app.id)}
              onHide={() => hideApp(app.id)}
              onChangeIcon={(newIcon) => changeIcon(app.id, newIcon)}
              onRename={(newName) => renameApp(app.id, newName)}
            />
          </div>
        );
      })}

      {/* Windows */}
      {windows.map(win => (
        <DesktopWindowComponent key={win.id} window={win} theme={theme}
          onClose={closeWindow} onMinimize={minimizeWindow} onMaximize={maximizeWindow}
          onFocus={focusWindow} onMove={moveWindow} onResize={resizeWindow}>
          {renderWindowContent(win)}
        </DesktopWindowComponent>
      ))}

      {musicActivated && (
        <div className="hidden">
          <YouTubeMusicProvider><YouTubeMusicPlayer /></YouTubeMusicProvider>
        </div>
      )}

      <Taskbar
        theme={theme} windows={windows} pinnedApps={pinnedApps} hiddenApps={hiddenApps}
        allApps={[...DESKTOP_APPS, ...games.slice(0, 12).map(g => ({ id: g.id, name: g.title, icon: 'gamepad', type: 'game' as const }))]}
        onWindowClick={handleWindowClick}
        onAppLaunch={(id, name) => openWindow(id, name)}
        onUnpin={(id) => togglePin(id)}
        onExitDesktop={onExit}
        onUnhideApp={unhideApp}
      />
    </div>
  );
}
