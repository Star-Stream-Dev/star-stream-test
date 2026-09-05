import { useEffect, useState } from 'react';
import { Copy, Check, Plus, Trash2, Ban, RotateCcw, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InviteLink {
  id: string;
  code: string;
  max_uses: number;
  uses: number;
  note: string | null;
  is_active: boolean;
  created_at: string;
  created_by_username: string | null;
  redeemed_usernames: string[] | null;
}

export function InviteManagement() {
  const { sessionToken } = useAuth();
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = async () => {
    if (!sessionToken) return;
    try {
      const { data, error: rpcError } = await supabase.rpc('get_invite_links', {
        p_session_token: sessionToken,
      });
      if (rpcError) throw rpcError;
      setLinks((data as InviteLink[]) || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invite links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    setCreating(true);
    setError('');
    try {
      const { error: rpcError } = await supabase.rpc('create_invite_link', {
        p_session_token: sessionToken,
        p_max_uses: Math.max(1, Math.min(1000, Number(maxUses) || 1)),
        p_note: note.trim() || undefined,
      });
      if (rpcError) throw rpcError;
      setNote('');
      setMaxUses(1);
      await fetchLinks();
    } catch (err: any) {
      setError(err.message || 'Failed to create invite link');
    } finally {
      setCreating(false);
    }
  };

  const inviteUrl = (code: string) =>
    `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/invite/${code}`;

  const handleCopy = async (link: InviteLink) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(link.code));
    } catch {
      /* clipboard unavailable */
    }
    setCopiedId(link.id);
    setTimeout(() => setCopiedId((c) => (c === link.id ? null : c)), 1500);
  };

  const handleToggle = async (link: InviteLink) => {
    if (!sessionToken) return;
    const { error: rpcError } = await supabase.rpc('set_invite_link_active', {
      p_session_token: sessionToken,
      p_invite_id: link.id,
      p_active: !link.is_active,
    });
    if (rpcError) setError(rpcError.message);
    fetchLinks();
  };

  const handleDelete = async (link: InviteLink) => {
    if (!sessionToken) return;
    if (!confirm('Delete this invite link?')) return;
    const { error: rpcError } = await supabase.rpc('delete_invite_link', {
      p_session_token: sessionToken,
      p_invite_id: link.id,
    });
    if (rpcError) setError(rpcError.message);
    fetchLinks();
  };

  return (
    <div>
      {error && (
        <div className="bg-destructive/20 border border-destructive rounded-lg px-4 py-2 text-destructive text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-muted/20 rounded-lg p-3 md:p-4 mb-6 border border-border/20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Max signups</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              className="w-full bg-background/50 border border-border/30 rounded-lg px-3 py-2 text-foreground text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-primary mb-2">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
              placeholder="e.g. Friends from school"
              className="w-full bg-background/50 border border-border/30 rounded-lg px-3 py-2 text-foreground text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="flex items-center gap-2 bg-gradient-primary hover:opacity-90 text-foreground font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50 text-sm"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating…' : 'Create invite link'}
        </button>
      </form>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading invite links…</div>
      ) : links.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">No invite links yet.</div>
      ) : (
        <div className="space-y-3">
          {links.map((l) => {
            const remaining = Math.max(0, l.max_uses - l.uses);
            return (
              <div key={l.id} className="bg-background/30 border border-border/20 rounded-lg p-3 md:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm text-foreground font-mono truncate">
                      <Link2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{inviteUrl(l.code)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {remaining} of {l.max_uses} signup{l.max_uses === 1 ? '' : 's'} remaining
                      {!l.is_active && ' · revoked'}
                      {l.note ? ` · ${l.note}` : ''}
                    </p>
                    {l.redeemed_usernames && l.redeemed_usernames.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Used by: {l.redeemed_usernames.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(l)}
                      title="Copy link"
                      className="p-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {copiedId === l.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleToggle(l)}
                      title={l.is_active ? 'Revoke link' : 'Re-activate link'}
                      className="p-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {l.is_active ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(l)}
                      title="Delete link"
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
