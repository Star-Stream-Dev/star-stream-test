import { useState } from 'react';
import { Lock, User, ArrowLeft, Terminal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DevModeLoginGateProps {
  onBack: () => void;
}

export function DevModeLoginGate({ onBack }: DevModeLoginGateProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }
    setIsLoading(true);
    setError('');
    const result = await login(username.trim(), password);
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-gradient-to-br from-[hsl(220,50%,8%)] via-[hsl(270,40%,12%)] to-[hsl(220,50%,8%)] flex items-center justify-center">
      <div className="bg-card/60 backdrop-blur-2xl border border-border/50 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Terminal className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Developer Mode</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Login required to access Star Stream
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              autoFocus
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Login & Launch'}
          </button>
        </form>

        <button
          onClick={onBack}
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Go Back
        </button>
      </div>
    </div>
  );
}
