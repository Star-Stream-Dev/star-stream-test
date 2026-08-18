import { useState, useEffect } from 'react';
import { Lock, User, Shield, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import starstreamIcon from '@/assets/starstream-icon.png';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Google Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Microsoft Edge';
  return 'Unknown';
}

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startTime] = useState(Date.now());
  const [uptime, setUptime] = useState('0m');
  const { login } = useAuth();

  useEffect(() => {
    checkAdminExists();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      const elapsed = Math.floor((Date.now() - startTime) / 60000);
      setUptime(`${elapsed}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const checkAdminExists = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_exists');
      if (error) throw error;
      setNeedsSetup(!data);
    } catch (err) {
      console.error('Error checking admin:', err);
      setNeedsSetup(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-hash', {
        body: { action: 'setup_admin', username: username.trim(), password },
      });
      if (error || data?.error) throw new Error(data?.error || 'Failed to create admin');
      setNeedsSetup(false);
      const result = await login(username.trim(), password);
      if (result.error) setError(result.error);
    } catch (err: any) {
      setError(err.message || 'Failed to create admin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }
    setIsLoading(true);
    const result = await login(username.trim(), password);
    setIsLoading(false);
    if (result.error) setError(result.error);
  };

  if (needsSetup === null) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,10%)] flex items-center justify-center">
        <div className="text-foreground font-mono">Loading...</div>
      </div>
    );
  }

  // First time setup
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,10%)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="border border-primary/30 rounded-xl p-8 bg-[hsl(220,20%,12%)]">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <Shield className="text-primary w-8 h-8" />
              </div>
              <h1 className="text-2xl font-mono font-bold text-foreground">Initial Setup</h1>
              <p className="text-muted-foreground mt-2 text-sm">Create the admin account</p>
            </div>
            <form onSubmit={handleSetup} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Admin Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full bg-[hsl(220,20%,8%)] border border-primary/30 rounded-lg pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                    placeholder="Enter admin username" disabled={isLoading} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Admin Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[hsl(220,20%,8%)] border border-primary/30 rounded-lg pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                    placeholder="Enter admin password" disabled={isLoading} />
                </div>
              </div>
              {error && (
                <div className="bg-destructive/20 border border-destructive rounded-lg px-4 py-3 text-destructive text-sm">{error}</div>
              )}
              <button type="submit" disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 font-mono">
                {isLoading ? 'Creating...' : 'Create Admin Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(220,20%,10%)] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
        {/* Left side - Clock & System Info */}
        <div className="flex flex-col items-center md:items-start gap-6 md:gap-8 flex-1">
          {/* Clock */}
          <div className="text-center md:text-left">
            <h1 className="text-6xl md:text-8xl font-bold text-foreground tracking-tight font-mono">
              {formatTime(currentTime)}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mt-2">
              {formatDate(currentTime)}
            </p>
          </div>

          {/* System Info Card */}
          <div className="border border-primary/30 rounded-xl p-5 bg-[hsl(220,20%,12%)] w-full max-w-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-primary font-bold text-sm">System Information</span>
            </div>
            <div className="space-y-3 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">OS</span>
                <span className="text-foreground">Star Stream</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="text-foreground">3.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Browser</span>
                <span className="text-foreground">{getBrowserName()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uptime</span>
                <span className="text-foreground">{uptime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Card */}
        <div className="w-full max-w-sm">
          <div className="border border-primary/30 rounded-xl p-8 bg-[hsl(220,20%,12%)]">
            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <img src={starstreamIcon} alt="Star Stream" className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-foreground font-mono">
                {username ? `${getGreeting()}, ${username}` : getGreeting()}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-[hsl(220,20%,8%)] border border-primary/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                  placeholder="Username"
                  disabled={isLoading}
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[hsl(220,20%,8%)] border border-primary/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                  placeholder="Password"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-destructive/20 border border-destructive rounded-lg px-4 py-2 text-destructive text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 font-mono text-lg"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-muted-foreground/60 text-xs text-center mt-4">
              Contact admin for an account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
