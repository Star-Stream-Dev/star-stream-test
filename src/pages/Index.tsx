import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingDock } from '@/components/FloatingDock';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

// TEMP: Bypass login gate for AdSense crawler verification
const BYPASS_AUTH = false;
import { Home, Gamepad2, MessageSquare, LayoutGrid, X, Bug, Music, LogOut, Shield, Megaphone, Youtube, Eye, EyeOff, Globe, Spade, Sparkles, Settings, Mic2, Paintbrush, Joystick, Monitor } from 'lucide-react';
import { DiscordChat } from '@/components/DiscordChat';
import { CloudDesktop } from '@/components/CloudDesktop';
import { BootScreen } from '@/components/BootScreen';
import { StarStreamBackground } from '@/components/StarStreamBackground';
import { SolarTerminal } from '@/components/SolarTerminal';
import { DesktopEnvironment } from '@/components/desktop/DesktopEnvironment';
import { DevModeLoginGate } from '@/components/DevModeLoginGate';
import { GamesGrid } from '@/components/GamesGrid';
import { GamesCarousel } from '@/components/GamesCarousel';
import { FNFSection } from '@/components/FNFSection';
import { FNFCarousel } from '@/components/FNFCarousel';
import { BugsSection } from '@/components/BugsSection';
import { Announcements } from '@/components/Announcements';
import { YouTubeMusicPlayer } from '@/components/music/YouTubeMusicPlayer';
import { PersistentYouTubeMiniPlayer } from '@/components/music/PersistentYouTubeMiniPlayer';
import { YouTubeMusicProvider } from '@/contexts/YouTubeMusicContext';
import { GameEmbed } from '@/components/GameEmbed';
import { PipProvider, FloatingPipPlayer } from '@/components/YouTubePlayer';
import { YouTubeApp } from '@/components/youtube/YouTubeApp';
import { UnoGame } from '@/components/UnoGame';
import { StudyHelper } from '@/components/StudyHelper';
import { SettingsPage } from '@/components/SettingsPage';
import { ProxyBrowser } from '@/components/proxy/ProxyBrowser';
import { WhiteboardPage } from '@/components/whiteboard/WhiteboardPage';
import { RetroArchPlayer } from '@/components/RetroArchPlayer';
import { ProxyProvider } from '@/contexts/ProxyContext';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/LoginPage';
import { AdminPanel } from '@/components/AdminPanel';
import { CloakLauncher } from '@/components/CloakLauncher';
import { Snowfall } from '@/components/Snowfall';
import { SnowfallProvider, useSnowfall } from '@/contexts/SnowfallContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { HomeDashboard } from '@/components/HomeDashboard';
import { DisclaimerModal, useDisclaimer } from '@/components/DisclaimerModal';
import { ProxyDisclaimerModal, useProxyDisclaimer } from '@/components/proxy/ProxyDisclaimerModal';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ChangelogModal } from '@/components/ChangelogModal';
import { TutorialProvider, useTutorial } from '@/contexts/TutorialContext';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { useAutoFriendAdmin } from '@/hooks/useAutoFriendAdmin';
import starstreamIcon from '@/assets/starstream-icon.png';
import { useGameLayout } from '@/contexts/GameLayoutContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';

type Section = 'home' | 'games' | 'chatroom' | 'bugs' | 'music' | 'announcements' | 'youtube' | 'uno' | 'solar' | 'settings' | 'proxy' | 'fnf' | 'whiteboard' | 'emulator' | 'desktop';


const Index = () => {
  const { user, isLoading, logout, isAdmin } = useAuth();
  const { layoutMode } = useGameLayout();
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [embeddedGame, setEmbeddedGame] = useState<{ url: string; title: string } | null>(null);
  const [showBootScreen, setShowBootScreen] = useState(true);
  const [showDevMode, setShowDevMode] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [hasChosenLaunchMethod, setHasChosenLaunchMethod] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');

  const fullText = 'STAR STREAM V3';

  // Typewriter effect for home
  useEffect(() => {
    if (activeSection !== 'home') return;
    setTypewriterText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setTypewriterText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [activeSection]);

  // Keybinds - disabled when in chatroom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (activeSection === 'chatroom') {
        return;
      }

      // Panic button - R
      if (e.key === 'r' || e.key === 'R') {
        window.location.href = 'https://www.google.com';
      }

      // Exit fullscreen - F11 or G
      if (e.key === 'F11' || e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection]);

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'games' as const, label: 'Games', icon: Gamepad2 },
    { id: 'youtube' as const, label: 'YouTube', icon: Youtube },
    { id: 'music' as const, label: 'Music', icon: Music },
    { id: 'announcements' as const, label: 'Announcements', icon: Megaphone },
    { id: 'chatroom' as const, label: 'Chatroom', icon: MessageSquare },
    { id: 'bugs' as const, label: 'Bugs', icon: Bug },
  ];

  const handleGameClick = (url: string, title: string, embed?: boolean, isTab?: string) => {
    if (isTab) {
      setActiveSection(isTab as Section);
    } else if (embed) {
      setEmbeddedGame({ url, title });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="fixed inset-0 bg-gradient-bg pointer-events-none" />
        <div className="relative z-10 text-foreground">Loading...</div>
      </div>
    );
  }

  // Show dev mode desktop environment (requires login)
  if (showDevMode) {
    if (!user) {
      return (
        <ThemeProvider>
          <DevModeLoginGate onBack={() => setShowDevMode(false)} />
        </ThemeProvider>
      );
    }
    return (
      <ThemeProvider>
        <DesktopEnvironment onExit={() => setShowDevMode(false)} />
      </ThemeProvider>
    );
  }

  // Show boot screen
  if (showBootScreen && !hasChosenLaunchMethod) {
    return (
      <BootScreen 
        onComplete={() => setShowBootScreen(false)} 
        onDevMode={() => { setShowBootScreen(false); setShowDevMode(true); }}
      />
    );
  }

  // Show cloak launcher AFTER boot
  if (!hasChosenLaunchMethod) {
    return (
      <CloakLauncher 
        onContinue={() => setHasChosenLaunchMethod(true)} 
        onDevMode={() => { setHasChosenLaunchMethod(true); setShowDevMode(true); }}
      />
    );
  }

  // Show login if not authenticated (bypassed for AdSense crawler)
  if (!user && !BYPASS_AUTH) {
    return <LoginPage />;
  }

  // Show disclaimer after login (handled in IndexInner)

  return (
    <ThemeProvider>
      <SnowfallProvider>
        <PipProvider>
          <YouTubeMusicProvider>
            <ProxyProvider>
              <TutorialProvider>
                <IndexContent onDevMode={() => setShowDevMode(true)} />
              </TutorialProvider>
            </ProxyProvider>
          </YouTubeMusicProvider>
        </PipProvider>
      </SnowfallProvider>
    </ThemeProvider>
  );
};

function IndexContent({ onDevMode }: { onDevMode: () => void }) {
  const { snowfallEnabled } = useSnowfall();
  const { customBackground } = useTheme();
  
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Custom Background */}
      {customBackground.type !== 'none' && (
        <div className="fixed inset-0 z-0">
          {customBackground.type === 'image' ? (
            <img 
              src={customBackground.url} 
              alt="" 
              className="w-full h-full object-cover"
            />
          ) : (
            <video 
              src={customBackground.url} 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-background/70" />
        </div>
      )}

      {/* Snowfall effect */}
      {snowfallEnabled && <Snowfall />}
      
      {/* Default animated star-stream background */}
      {customBackground.type === 'none' && <StarStreamBackground />}
      
      <IndexInner onDevMode={onDevMode} />
    </div>
  );
}

function IndexInner({ onDevMode }: { onDevMode: () => void }) {
  const { user, isLoading, logout, isAdmin } = useAuth();
  const { layoutMode } = useGameLayout();
  const { popupsDisabled } = useUserPreferences();
  const [activeSectionState, setActiveSectionState] = useState<Section>('home');
  const [embeddedGame, setEmbeddedGame] = useState<{ url: string; title: string } | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showNavState, setShowNavState] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [userViewMode, setUserViewMode] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const { hasAccepted, handleAccept, handleDeny } = useDisclaimer();
  const { hasAccepted: proxyAccepted, handleAccept: acceptProxy, reset: resetProxyDisclaimer } = useProxyDisclaimer();
  const [showProxyDisclaimer, setShowProxyDisclaimer] = useState(false);
  
  // Tutorial integration
  const { 
    showTutorial, 
    setActiveSection: setTutorialActiveSection, 
    setSidebarOpen: setTutorialSidebarOpen,
    activeSection: tutorialActiveSection 
  } = useTutorial();

  // Auto-friend with admin account for new users
  useAutoFriendAdmin();

  // Use tutorial's active section when tutorial is active
  const activeSection = showTutorial ? tutorialActiveSection as Section : activeSectionState;
  const setActiveSection = (section: Section) => {
    setActiveSectionState(section);
    if (showTutorial) {
      setTutorialActiveSection(section);
    }
  };

  // Sync sidebar state with tutorial
  const showNav = showNavState;
  const setShowNav = (open: boolean) => {
    setShowNavState(open);
    if (showTutorial) {
      setTutorialSidebarOpen(open);
    }
  };

  // Effective admin status (false when in user view mode)
  const effectiveIsAdmin = isAdmin && !userViewMode;
  const fullText = 'STAR STREAM';

  // Typewriter effect for home
  useEffect(() => {
    if (activeSection !== 'home') return;
    setTypewriterText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setTypewriterText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [activeSection]);

  // Keybinds - disabled when in chatroom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (activeSection === 'chatroom') {
        return;
      }

      // Panic button - R
      if (e.key === 'r' || e.key === 'R') {
        window.location.href = 'https://www.google.com';
      }

      // Exit fullscreen - F11 or G
      if (e.key === 'F11' || e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection]);

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home, disabled: false },
    { id: 'games' as const, label: 'Games', icon: Gamepad2, disabled: false },
    { id: 'fnf' as const, label: 'FNF Mods', icon: Mic2, disabled: false },
    { id: 'youtube' as const, label: 'YouTube', icon: Youtube, disabled: false },
    { id: 'music' as const, label: 'Music', icon: Music, disabled: false },
    { id: 'solar' as const, label: 'Solar AI', icon: Sparkles, disabled: false },
    { id: 'announcements' as const, label: 'Announce', icon: Megaphone, disabled: false },
    { id: 'chatroom' as const, label: 'Chat', icon: MessageSquare, disabled: false },
    { id: 'uno' as const, label: 'UNO', icon: Spade, disabled: false },
    { id: 'whiteboard' as const, label: 'Whiteboard', icon: Paintbrush, disabled: false },
    { id: 'emulator' as const, label: 'Emulator', icon: Joystick, disabled: false },
    { id: 'settings' as const, label: 'Settings', icon: Settings, disabled: false },
    { id: 'proxy' as const, label: 'Proxy (beta)', icon: Globe, disabled: false },
    { id: 'bugs' as const, label: 'Bugs', icon: Bug, disabled: false },
    { id: 'desktop' as const, label: 'Desktop', icon: Monitor, disabled: false },
  ];

  const handleNavClick = (id: string, disabled?: boolean) => {
    if (disabled) return;
    
    if (id === 'proxy') {
      // Check if proxy disclaimer has been accepted
      if (proxyAccepted) {
        setActiveSection('proxy');
      } else {
        setShowProxyDisclaimer(true);
      }
    } else {
      setActiveSection(id as Section);
    }
    setShowNav(false);
  };

  const handleProxyAccept = () => {
    acceptProxy();
    setShowProxyDisclaimer(false);
    setActiveSection('proxy');
  };

  const handleProxyDeny = () => {
    setShowProxyDisclaimer(false);
  };

  const handleGameClick = (url: string, title: string, embed?: boolean, isTab?: string) => {
    if (isTab) {
      setActiveSection(isTab as Section);
    } else if (embed) {
      setEmbeddedGame({ url, title });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  // Show login if not authenticated (bypassed for AdSense crawler)
  if (!user && !BYPASS_AUTH) {
    return <LoginPage />;
  }

  // Show loading screen after login, before disclaimer
  if (showLoading && !popupsDisabled) {
    return <LoadingScreen onComplete={() => setShowLoading(false)} />;
  }

  // Show disclaimer if not accepted
  if (hasAccepted === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!hasAccepted && !popupsDisabled) {
    return <DisclaimerModal onAccept={handleAccept} onDeny={handleDeny} />;
  }

  return (
    <div className="relative z-10">
      {/* Proxy Disclaimer Modal */}
      {showProxyDisclaimer && (
        <ProxyDisclaimerModal onAccept={handleProxyAccept} onDeny={handleProxyDeny} />
      )}
      {/* Tutorial Overlay */}
      {!popupsDisabled && <TutorialOverlay />}
      {/* Changelog Modal */}
      {!popupsDisabled && <ChangelogModal />}
      <FloatingDock
        items={['home', 'games', 'chatroom', 'music', 'youtube', 'desktop', 'settings'].flatMap(id => navItems.filter(item => item.id === id))}
        activeSection={activeSection} menuOpen={showNav}
        onNavigate={handleNavClick} onMore={() => setShowNav(!showNav)}
      />

      <Dialog open={showNav} onOpenChange={setShowNav}>
          <DialogContent id="app-menu" aria-describedby={undefined}
            className="top-auto bottom-0 translate-y-0 p-0 gap-0 max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border/40 rounded-t-[2rem] safe-area-pb [&>button]:hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/30">
              <div className="flex items-center gap-3"><img src={starstreamIcon} alt="" className="w-8 h-8" /><div><DialogTitle>Star Stream</DialogTitle><p className="text-xs text-muted-foreground">@{user.username}</p></div></div>
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setShowNav(false)}><X /></Button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-4">
              {navItems.map(item => (
                <Button key={item.id} variant="ghost" onClick={() => handleNavClick(item.id, item.disabled)} disabled={item.disabled}
                  className={`tutorial-${item.id}-nav h-20 flex-col gap-2 whitespace-normal text-xs rounded-2xl ${activeSection === item.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  <item.icon className="!w-6 !h-6" />{item.label}
                </Button>
              ))}
              {isAdmin && <Button variant="ghost" className="h-20 flex-col text-xs text-primary rounded-2xl" onClick={() => { setShowAdminPanel(true); setShowNav(false); }}><Shield className="!w-6 !h-6" />Admin</Button>}
            </div>
            <div className="p-4 border-t border-border/30"><Button variant="ghost" className="w-full text-destructive rounded-full" onClick={logout}><LogOut />Log out</Button></div>
          </DialogContent>
      </Dialog>

      {/* Fullscreen sections - kept mounted to avoid re-loading */}
      <div className={`fixed inset-0 app-fullscreen z-40 bg-background ${activeSection === 'chatroom' ? 'animate-fade-in' : 'pointer-events-none invisible'}`}
        style={activeSection !== 'chatroom' ? { display: 'none' } : undefined}
        key="chatroom-persistent"
      >
        <DiscordChat onClose={() => setActiveSection('home')} />
      </div>

      <div className={`fixed inset-0 app-fullscreen z-40 bg-background ${activeSection === 'music' ? 'animate-fade-in' : 'pointer-events-none invisible'}`}
        style={activeSection !== 'music' ? { display: 'none' } : undefined}
        key="music-persistent"
      >
        <YouTubeMusicPlayer />
      </div>

      {activeSection === 'youtube' && (
        <div className="fixed inset-0 app-fullscreen z-40 bg-background animate-fade-in">
          <YouTubeApp />
        </div>
      )}

      {/* Proxy Browser - fullscreen */}
      {activeSection === 'proxy' && (
        <div className="fixed inset-0 app-fullscreen z-40 bg-background animate-fade-in">
          <ProxyBrowser onClose={() => setActiveSection('home')} />
        </div>
      )}

      {/* Emulator - fullscreen */}
      {activeSection === 'emulator' && (
        <RetroArchPlayer onClose={() => setActiveSection('home')} />
      )}

      {/* Main content - only show for non-fullscreen sections */}
      {!['chatroom', 'music', 'youtube', 'proxy', 'emulator'].includes(activeSection) && (
        <main className="relative app-content">
          <div key={activeSection} className="animate-fade-in">
            {activeSection === 'home' && (
              <HomeDashboard 
                typewriterText={typewriterText} 
                onNavigate={(section) => setActiveSection(section as Section)}
                onDevMode={onDevMode}
              />
            )}

            {activeSection === 'games' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                {layoutMode === 'carousel' ? (
                  <GamesCarousel onGameClick={handleGameClick} />
                ) : (
                  <GamesGrid onGameClick={handleGameClick} />
                )}
              </section>
            )}

            {activeSection === 'fnf' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                {layoutMode === 'carousel' ? (
                  <FNFCarousel onGameClick={handleGameClick} />
                ) : (
                  <FNFSection onGameClick={handleGameClick} />
                )}
              </section>
            )}

            {activeSection === 'desktop' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                <CloudDesktop />
              </section>
            )}

            {activeSection === 'bugs' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                <BugsSection />
              </section>
            )}

            {activeSection === 'announcements' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                <Announcements />
              </section>
            )}

            {activeSection === 'uno' && (
              <section className="py-8 md:py-16 px-4 sm:px-6 lg:px-8">
                <UnoGame />
              </section>
            )}

            {activeSection === 'solar' && (
              <section className="h-[calc(100vh-80px)]">
                <StudyHelper onClose={() => setActiveSection('home')} />
              </section>
            )}

            {activeSection === 'whiteboard' && (
              <section className="py-0">
                <WhiteboardPage />
              </section>
            )}

            {activeSection === 'settings' && (
              <section className="py-8 md:py-16 pb-32 md:pb-16">
                <SettingsPage />
              </section>
            )}
          </div>
        </main>
      )}


      {/* Persistent YouTube Music Mini Player - shows when not in music tab */}
      {activeSection !== 'music' && (
        <PersistentYouTubeMiniPlayer onExpand={() => setActiveSection('music')} />
      )}

      {/* Floating YouTube PiP Player */}
      <FloatingPipPlayer />

      {/* Fullscreen Game Embed */}
      {embeddedGame && (
        <GameEmbed
          url={embeddedGame.url}
          title={embeddedGame.title}
          onClose={() => setEmbeddedGame(null)}
        />
      )}

      {/* Admin Panel */}
      {showAdminPanel && isAdmin && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}

export default Index;