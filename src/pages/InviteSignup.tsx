import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ShieldCheck, UserPlus, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import starstreamIcon from '@/assets/starstream-icon.png';

export default function InviteSignup() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { signupWithInvite } = useAuth();

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: rpcError } = await supabase.rpc('check_invite_code', { p_code: code });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      setValid(!rpcError && !!row?.valid);
      setRemaining(row?.remaining ?? 0);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.trim().length < 3) return setError('Username must be at least 3 characters');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');

    setSubmitting(true);
    const { error: signupError } = await signupWithInvite(code, username.trim(), password);
    setSubmitting(false);

    if (signupError) {
      setError(signupError);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <main className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md bg-card/60 backdrop-blur-md border border-border/40 rounded-2xl p-6 md:p-8 shadow-glow">
        <div className="flex flex-col items-center text-center mb-6">
          <img src={starstreamIcon} alt="Star Stream logo" className="w-16 h-16 mb-3" />
          <h1 className="text-2xl font-bold tracking-widest text-foreground">Star Stream Invite</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your account to join</p>
        </div>

        {checking ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking invite…
          </div>
        ) : !valid ? (
          <div className="text-center py-8">
            <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <p className="text-foreground font-semibold">This invite link is not valid</p>
            <p className="text-sm text-muted-foreground mt-1">
              It may have been revoked or all of its signups have been used.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-5 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm"
            >
              Back to Star Stream
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
              <ShieldCheck className="w-4 h-4" />
              {remaining} signup{remaining === 1 ? '' : 's'} remaining on this link
            </div>

            {error && (
              <div className="bg-destructive/20 border border-destructive rounded-lg px-3 py-2 text-destructive text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-primary mb-1" htmlFor="invite-username">Username</label>
              <input
                id="invite-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={32}
                autoComplete="username"
                className="w-full bg-background/50 border border-border/30 rounded-lg px-3 py-2 text-foreground"
                placeholder="Choose a username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1" htmlFor="invite-password">Password</label>
              <input
                id="invite-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={200}
                autoComplete="new-password"
                className="w-full bg-background/50 border border-border/30 rounded-lg px-3 py-2 text-foreground"
                placeholder="Choose a password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1" htmlFor="invite-confirm">Confirm password</label>
              <input
                id="invite-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                maxLength={200}
                autoComplete="new-password"
                className="w-full bg-background/50 border border-border/30 rounded-lg px-3 py-2 text-foreground"
                placeholder="Repeat your password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-primary hover:opacity-90 text-foreground font-medium py-2.5 rounded-lg transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
