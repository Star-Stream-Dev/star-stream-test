import React, { useState } from 'react';
import { Search, Globe, Gamepad2, BookOpen, Newspaper, Star, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProxy, SearchEngine } from '@/contexts/ProxyContext';
import starstreamIcon from '@/assets/starstream-icon.png';

// Sites that are known to work well with the proxy
const workingSites = [
  { name: 'KBH Games', url: 'https://kbhgames.com', icon: Gamepad2, description: 'Flash & HTML5 games', category: 'games' },
  { name: 'Poki', url: 'https://poki.com', icon: Gamepad2, description: 'Online games', category: 'games' },
  { name: 'CrazyGames', url: 'https://www.crazygames.com', icon: Gamepad2, description: 'Browser games', category: 'games' },
  { name: 'Armor Games', url: 'https://armorgames.com', icon: Gamepad2, description: 'Free games', category: 'games' },
  { name: 'Y8', url: 'https://www.y8.com', icon: Gamepad2, description: 'Online games', category: 'games' },
  { name: 'Kongregate', url: 'https://www.kongregate.com', icon: Gamepad2, description: 'Gaming platform', category: 'games' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org', icon: BookOpen, description: 'Encyclopedia', category: 'reference' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', icon: Newspaper, description: 'Tech news', category: 'news' },
];

const searchEngines: { id: SearchEngine; name: string; placeholder: string }[] = [
  { id: 'google', name: 'Google', placeholder: 'Search Google or type a URL' },
  { id: 'bing', name: 'Bing', placeholder: 'Search Bing or type a URL' },
  { id: 'duckduckgo', name: 'DuckDuckGo', placeholder: 'Search DuckDuckGo or type a URL' },
];

export function ProxyStartPage() {
  const { navigate, searchEngine, setSearchEngine } = useProxy();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    let url = searchQuery.trim();
    
    // Check if it looks like a URL
    if (url.includes('.') && !url.includes(' ')) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
    } else {
      // Convert to search URL
      switch (searchEngine) {
        case 'bing':
          url = `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`;
          break;
        case 'duckduckgo':
          url = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`;
          break;
        default:
          url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      }
    }

    navigate(url);
  };

  const currentEngine = searchEngines.find(e => e.id === searchEngine) || searchEngines[0];
  const gameSites = workingSites.filter(s => s.category === 'games');
  const otherSites = workingSites.filter(s => s.category !== 'games');

  return (
    <div className="flex flex-col items-center min-h-full p-8 bg-gradient-to-b from-background to-muted/20 overflow-auto">
      {/* Logo and Title */}
      <div className="flex flex-col items-center gap-4 mb-8 animate-fade-in">
        <img 
          src={starstreamIcon} 
          alt="Star Stream Proxy" 
          className="w-20 h-20 drop-shadow-2xl"
        />
        <h1 className="text-3xl font-bold text-gradient">Star Stream Proxy</h1>
        <p className="text-muted-foreground text-center max-w-md text-sm">
          Browse the web through Star Stream's built-in proxy browser
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="w-full max-w-2xl mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={currentEngine.placeholder}
            className="pl-12 pr-4 py-6 text-lg bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 rounded-full shadow-lg"
            autoFocus
          />
        </div>
      </form>

      {/* Search Engine Selector */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-sm text-muted-foreground">Search with:</span>
        <div className="flex gap-2">
          {searchEngines.map((engine) => (
            <Button
              key={engine.id}
              variant={searchEngine === engine.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSearchEngine(engine.id)}
              className="rounded-full"
            >
              {engine.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Working Game Sites */}
      <div className="w-full max-w-4xl mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium text-foreground">Working Game Sites</h2>
          <span className="text-xs text-muted-foreground">(verified to work)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {gameSites.map((site) => (
            <Button
              key={site.name}
              variant="ghost"
              onClick={() => navigate(site.url)}
              className="flex flex-col items-center gap-2 p-3 h-auto rounded-xl bg-background/60 backdrop-blur-sm border border-border/30 hover:border-primary/50 hover:bg-primary/10 transition-all group"
            >
              <div className="p-2 rounded-lg bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <site.icon className="w-5 h-5" />
              </div>
              <div className="text-center">
                <span className="text-xs font-medium block">{site.name}</span>
                <span className="text-[10px] text-muted-foreground">{site.description}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Other Working Sites */}
      <div className="w-full max-w-4xl mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">Other Working Sites</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {otherSites.map((site) => (
            <Button
              key={site.name}
              variant="ghost"
              onClick={() => navigate(site.url)}
              className="flex items-center gap-3 p-3 h-auto rounded-xl bg-background/60 backdrop-blur-sm border border-border/30 hover:border-primary/50 hover:bg-primary/10 transition-all group justify-start"
            >
              <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                <site.icon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-medium block">{site.name}</span>
                <span className="text-[10px] text-muted-foreground">{site.description}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-auto pt-6 text-center text-xs text-muted-foreground/60 max-w-md border-t border-border/30">
        <p className="mb-2">💡 <strong>Tip:</strong> Sites like Google, YouTube, Reddit, and social media often block proxy requests.</p>
        <p>Try the game sites above - they're verified to work with the proxy!</p>
      </div>
    </div>
  );
}
