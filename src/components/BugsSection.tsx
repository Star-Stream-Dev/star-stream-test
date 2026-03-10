import { useState, useEffect } from 'react';
import { AlertCircle, XCircle, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Bug {
  id: string;
  category: string;
  title: string;
  status: 'down' | 'issue';
  created_at: string;
}

interface BugCategory {
  category: string;
  items: Bug[];
}

export function BugsSection() {
  const { user, isAdmin, sessionToken } = useAuth();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form states
  const [newCategory, setNewCategory] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newStatus, setNewStatus] = useState<'down' | 'issue'>('issue');

  useEffect(() => {
    fetchBugs();
  }, []);

  const fetchBugs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('bugs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bugs:', error);
      setError('Failed to load bugs');
    } else {
      setBugs(data as Bug[] || []);
    }
    setIsLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCategory.trim() || !newTitle.trim()) return;

    const { error } = await supabase.rpc('create_bug', {
      p_session_token: sessionToken!,
      p_category: newCategory.trim(),
      p_title: newTitle.trim(),
      p_status: newStatus
    });

    if (error) {
      setError('Failed to create bug');
      console.error(error);
    } else {
      setNewCategory('');
      setNewTitle('');
      setNewStatus('issue');
      setShowCreateForm(false);
      fetchBugs();
    }
  };

  const handleDelete = async (bugId: string) => {
    if (!user || !confirm('Are you sure you want to remove this bug?')) return;

    const { error } = await supabase.rpc('delete_bug', {
      p_admin_id: user.id,
      p_bug_id: bugId
    });

    if (error) {
      setError('Failed to delete bug');
      console.error(error);
    } else {
      fetchBugs();
    }
  };

  // Group bugs by category
  const groupedBugs: BugCategory[] = bugs.reduce((acc: BugCategory[], bug) => {
    const existing = acc.find(c => c.category === bug.category);
    if (existing) {
      existing.items.push(bug);
    } else {
      acc.push({ category: bug.category, items: [bug] });
    }
    return acc;
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading bugs...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">
          Known Issues
        </h2>
        <p className="text-muted-foreground text-lg">
          Current system status and known problems
        </p>
      </div>

      {error && (
        <div className="bg-destructive/20 border border-destructive rounded-lg px-4 py-2 text-destructive text-sm mb-6">
          {error}
        </div>
      )}

      {/* Admin Create Button */}
      {isAdmin && !showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="mb-6 flex items-center gap-2 bg-gradient-primary hover:opacity-90 text-foreground font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-glow"
        >
          <Plus className="w-5 h-5" />
          Add Bug
        </button>
      )}

      {/* Create Form */}
      {isAdmin && showCreateForm && (
        <div className="bg-gradient-card border border-border/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-foreground">Add New Bug</h3>
            <button onClick={() => setShowCreateForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., Games, FNF"
                  className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'down' | 'issue')}
                  className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="issue">Issue</option>
                  <option value="down">Down</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Describe the bug"
                className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-primary hover:opacity-90 text-foreground font-bold py-2 px-6 rounded-lg transition-all duration-300"
            >
              Add Bug
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-6">
        {groupedBugs.length === 0 ? (
          <div className="bg-gradient-card border border-border/30 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No known issues at this time</p>
          </div>
        ) : (
          groupedBugs.map((category) => (
            <div
              key={category.category}
              className="bg-gradient-card border border-border/30 rounded-xl p-6"
            >
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-primary" />
                {category.category}
              </h3>

              <div className="space-y-3">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-background/30 rounded-lg px-4 py-3 border border-border/20"
                  >
                    <span className="text-foreground/80 font-medium">{item.title}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                          item.status === 'down'
                            ? 'bg-destructive/20 text-destructive border border-destructive/50'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                        }`}
                      >
                        {item.status === 'down' ? (
                          <>
                            <XCircle className="w-4 h-4" />
                            Down
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            Issue
                          </>
                        )}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-destructive hover:opacity-80 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {bugs.some(b => b.status === 'down') && (
          <div className="bg-gradient-to-br from-destructive/10 to-background border border-destructive/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-destructive mb-3">
              Some services are currently down
            </h3>
            <p className="text-muted-foreground">
              We're working on resolving these issues as quickly as possible.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
