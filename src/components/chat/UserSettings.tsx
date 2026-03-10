import { useState, useEffect, useRef } from 'react';
import { Settings, User, Camera, Save, X, Edit2, Snowflake, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSnowfall } from '@/contexts/SnowfallContext';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface FriendNickname {
  id: string;
  user_id: string;
  friend_id: string;
  nickname: string;
}

interface AppUser {
  id: string;
  username: string;
}

interface UserSettingsProps {
  onClose: () => void;
  friends: AppUser[];
  nicknames: FriendNickname[];
  onNicknamesChange: () => void;
  onProfileChange: () => void;
}

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Bella',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Chester',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Dusty',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Emma',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=George',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Hannah',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot4',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel1',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel2',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel3',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel4',
];

export function UserSettings({ onClose, friends, nicknames, onNicknamesChange, onProfileChange }: UserSettingsProps) {
  const { user, sessionToken } = useAuth();
  const { snowfallEnabled, setSnowfallEnabled } = useSnowfall();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editingNickname, setEditingNickname] = useState<string | null>(null);
  const [nicknameValue, setNicknameValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setSelectedAvatar(publicUrl);
      setShowAvatarPicker(false);
      toast.success('Photo uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || '');
      setSelectedAvatar(data.avatar_url);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    await supabase.rpc('upsert_my_profile', {
      p_session_token: sessionToken!,
      p_display_name: displayName.trim() || null,
      p_avatar_url: selectedAvatar,
    });

    toast.success('Profile saved!');
    setIsSaving(false);
    onProfileChange();
    fetchProfile();
  };

  const getNickname = (friendId: string) => {
    const nickname = nicknames.find(n => n.friend_id === friendId);
    return nickname?.nickname || '';
  };

  const saveNickname = async (friendId: string) => {
    if (!user) return;
    
    const existing = nicknames.find(n => n.friend_id === friendId);
    
    if (nicknameValue.trim()) {
      if (existing) {
        await supabase
          .from('friend_nicknames')
          .update({ nickname: nicknameValue.trim(), updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('friend_nicknames')
          .insert({
            user_id: user.id,
            friend_id: friendId,
            nickname: nicknameValue.trim(),
          });
      }
      toast.success('Nickname saved!');
    } else if (existing) {
      await supabase
        .from('friend_nicknames')
        .delete()
        .eq('id', existing.id);
      toast.success('Nickname removed!');
    }
    
    setEditingNickname(null);
    setNicknameValue('');
    onNicknamesChange();
  };

  const startEditNickname = (friendId: string) => {
    setEditingNickname(friendId);
    setNicknameValue(getNickname(friendId));
  };

  return (
    <div className="flex flex-col h-full bg-card/50">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg text-foreground">Settings</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Appearance Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Appearance</h3>
          
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Snowflake className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Snowfall Effect</p>
                <p className="text-xs text-muted-foreground">Animated snow on the website</p>
              </div>
            </div>
            <Switch
              checked={snowfallEnabled}
              onCheckedChange={setSnowfallEnabled}
            />
          </div>
        </div>

        {/* Profile Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Profile</h3>
          
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-muted overflow-hidden border-2 border-primary/20">
                {selectedAvatar ? (
                  <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/80 transition-colors"
              >
                <Camera className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="font-semibold text-foreground">{user?.username}</p>
            </div>
          </div>

          {/* Avatar Picker */}
          {showAvatarPicker && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              {/* Upload Photo Button */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-1 py-2 px-4 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center">Or choose an avatar below</p>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_OPTIONS.map((avatar, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedAvatar(avatar);
                      setShowAvatarPicker(false);
                    }}
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                      selectedAvatar === avatar ? 'border-primary scale-110' : 'border-transparent hover:border-primary/50'
                    }`}
                  >
                    <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={user?.username || 'Enter display name...'}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              maxLength={32}
            />
            <p className="text-xs text-muted-foreground">This is how others will see you in chat</p>
          </div>

          <button
            onClick={saveProfile}
            disabled={isSaving}
            className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Friend Nicknames Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Friend Nicknames</h3>
          <p className="text-xs text-muted-foreground">Set nicknames for friends that only you can see</p>
          
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No friends yet</p>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{friend.username}</p>
                    {getNickname(friend.id) && editingNickname !== friend.id && (
                      <p className="text-xs text-primary">Nickname: {getNickname(friend.id)}</p>
                    )}
                  </div>
                  {editingNickname === friend.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nicknameValue}
                        onChange={(e) => setNicknameValue(e.target.value)}
                        placeholder="Nickname..."
                        className="w-24 px-2 py-1 text-sm bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        maxLength={20}
                        autoFocus
                      />
                      <button
                        onClick={() => saveNickname(friend.id)}
                        className="p-1 text-green-500 hover:bg-green-500/20 rounded"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingNickname(null);
                          setNicknameValue('');
                        }}
                        className="p-1 text-muted-foreground hover:bg-muted rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditNickname(friend.id)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
