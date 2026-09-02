import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Key, X, Shield, Gamepad2, Joystick, Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GameManagement } from './GameManagement';
import { RomManagement } from './RomManagement';
import { InviteManagement } from './InviteManagement';

interface AppUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
}

type TabType = 'users' | 'games' | 'roms' | 'invites';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const { user, sessionToken } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('users');

  const fetchUsers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_all_users', {
        p_session_token: sessionToken!,
      });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newUsername.trim() || !newPassword.trim()) return;

    setIsCreating(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('auth-hash', {
        body: { action: 'create_user', session_token: sessionToken, username: newUsername.trim(), password: newPassword },
      });

      if (error || data?.error) throw new Error(data?.error || 'Failed to create user');

      setNewUsername('');
      setNewPassword('');
      setShowCreateForm(false);
      fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabase.rpc('delete_app_user', {
        p_session_token: sessionToken!,
        p_user_id: userId,
      });

      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!user) return;
    
    const newPass = prompt('Enter new password for this user:');
    if (!newPass) return;

    try {
      const { data, error } = await supabase.functions.invoke('auth-hash', {
        body: { action: 'update_password', session_token: sessionToken, user_id: userId, new_password: newPass },
      });

      if (error || data?.error) throw new Error(data?.error || 'Failed to update password');
      alert('Password updated successfully');
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || 'Failed to update password');
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4">
      <div className="bg-gradient-card border border-border/30 rounded-xl w-full max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 border-b border-border/30 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Shield className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <h2 className="text-lg md:text-xl font-bold text-foreground">Admin Panel</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-60px)] md:max-h-[calc(80vh-80px)]">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b border-border pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'users' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Users className="w-4 h-4" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('games')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'games' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              Games
            </button>
            <button
              onClick={() => setActiveTab('roms')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'roms' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Joystick className="w-4 h-4" />
              ROMs
            </button>
          </div>

          {activeTab === 'games' ? (
            <GameManagement />
          ) : activeTab === 'roms' ? (
            <RomManagement />
          ) : (
            <>
          {error && (
            <div className="bg-destructive/20 border border-destructive rounded-lg px-3 md:px-4 py-2 md:py-3 text-destructive text-sm mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
              User Management
            </h3>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center justify-center gap-2 bg-gradient-primary hover:opacity-90 text-foreground font-medium py-2 px-4 rounded-lg transition-all text-sm md:text-base"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateUser} className="bg-muted/20 rounded-lg p-3 md:p-4 mb-4 md:mb-6 border border-border/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-background/50 border border-border/30 rounded-lg px-3 md:px-4 py-2 text-foreground text-sm md:text-base"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-background/50 border border-border/30 rounded-lg px-3 md:px-4 py-2 text-foreground text-sm md:text-base"
                    placeholder="Enter password"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-gradient-primary hover:opacity-90 text-foreground font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50 text-sm md:text-base"
                >
                  {isCreating ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-muted hover:bg-muted/80 text-foreground font-medium py-2 px-4 rounded-lg transition-all text-sm md:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between bg-background/30 border border-border/20 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      u.role === 'admin' ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      {u.role === 'admin' ? (
                        <Shield className="w-4 h-4 text-primary" />
                      ) : (
                        <Users className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{u.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                    </div>
                  </div>
                  
                  {u.role !== 'admin' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
