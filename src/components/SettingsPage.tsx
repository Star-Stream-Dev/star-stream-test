import { useState, useRef, useEffect } from 'react';
import { Settings, Snowflake, Palette, Image, Video, Monitor, X, Upload, Trash2, Sparkles, User, Camera, Save, Edit2, LayoutGrid, Gamepad2, BellOff, Zap } from 'lucide-react';
import { useSnowfall } from '@/contexts/SnowfallContext';
import { useTheme, ThemePreset } from '@/contexts/ThemeContext';
import { useGameLayout } from '@/contexts/GameLayoutContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

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

interface SettingsPageProps {
  friends?: AppUser[];
  nicknames?: FriendNickname[];
  onNicknamesChange?: () => void;
  onProfileChange?: () => void;
}

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Bella',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Chester',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Dusty',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Emma',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot2',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel1',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel2',
];

const THEME_OPTIONS: { id: ThemePreset; name: string; color: string }[] = [
  { id: 'purple', name: 'Purple', color: 'hsl(270, 70%, 50%)' },
  { id: 'blue', name: 'Blue', color: 'hsl(220, 70%, 50%)' },
  { id: 'green', name: 'Green', color: 'hsl(150, 70%, 40%)' },
  { id: 'red', name: 'Red', color: 'hsl(0, 70%, 50%)' },
  { id: 'orange', name: 'Orange', color: 'hsl(25, 95%, 53%)' },
  { id: 'pink', name: 'Pink', color: 'hsl(330, 70%, 55%)' },
  { id: 'cyan', name: 'Cyan', color: 'hsl(185, 70%, 45%)' },
  { id: 'midnight', name: 'Midnight', color: 'hsl(240, 50%, 45%)' },
];

export function SettingsPage({ friends: propFriends, nicknames: propNicknames, onNicknamesChange, onProfileChange }: SettingsPageProps) {
  const { user } = useAuth();
  const { snowfallEnabled, setSnowfallEnabled } = useSnowfall();
  const { currentTheme, setCurrentTheme, customBackground, setCustomBackground, glassEnabled, setGlassEnabled } = useTheme();
  const { layoutMode, setLayoutMode } = useGameLayout();
  const { popupsDisabled, setPopupsDisabled, transitionsDisabled, setTransitionsDisabled } = useUserPreferences();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const bgVideoInputRef = useRef<HTMLInputElement>(null);

  // Nickname state
  const [editingNickname, setEditingNickname] = useState<string | null>(null);
  const [nicknameValue, setNicknameValue] = useState('');

  // Background URL input
  const [bgUrlInput, setBgUrlInput] = useState('');
  const [bgType, setBgType] = useState<'image' | 'video'>('image');

  // Active settings tab
  const [activeTab, setActiveTab] = useState<'appearance' | 'profile' | 'friends'>('appearance');

  // Internal friends & nicknames state (fetched if not provided via props)
  const [internalFriends, setInternalFriends] = useState<AppUser[]>([]);
  const [internalNicknames, setInternalNicknames] = useState<FriendNickname[]>([]);

  const friends = propFriends ?? internalFriends;
  const nicknames = propNicknames ?? internalNicknames;

  // Fetch friends list
  const fetchFriends = async () => {
    if (!user) return;
    const { data: friendships } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);

    if (friendships && friendships.length > 0) {
      const { data: users } = await supabase.rpc('get_all_app_users');
      if (users) {
        const friendIds = new Set(friendships.map(f => f.friend_id));
        setInternalFriends(users.filter((u: AppUser) => friendIds.has(u.id)));
      }
    }
  };

  // Fetch nicknames
  const fetchNicknames = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friend_nicknames')
      .select('*')
      .eq('user_id', user.id);
    if (data) {
      setInternalNicknames(data as FriendNickname[]);
    }
  };

  // Fetch profile, friends, nicknames on mount
  useEffect(() => {
    if (user) {
      fetchProfile();
      if (!propFriends) fetchFriends();
      if (!propNicknames) fetchNicknames();
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

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
    onProfileChange?.();
    fetchProfile();
  };

  const handleBgFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const maxSize = type === 'image' ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File must be less than ${type === 'image' ? '5MB' : '50MB'}`);
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-bg-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filePath);

      setCustomBackground({ type, url: publicUrl });
      toast.success(`${type === 'image' ? 'Image' : 'Video'} background saved to profile!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload background');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBgUrlSet = () => {
    if (!bgUrlInput.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    setCustomBackground({ type: bgType, url: bgUrlInput.trim() });
    setBgUrlInput('');
    toast.success('Background set from URL!');
  };

  const clearBackground = () => {
    setCustomBackground({ type: 'none', url: '' });
    toast.success('Background cleared');
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
    onNicknamesChange?.();
    if (!propNicknames) fetchNicknames();
  };

  const startEditNickname = (friendId: string) => {
    setEditingNickname(friendId);
    setNicknameValue(getNickname(friendId));
  };

  const glassStyle = glassEnabled ? {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  } : {};

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-primary/20">
            <Settings className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Settings</h1>
            <p className="text-muted-foreground">Customize your Solarnova experience</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl" style={glassStyle}>
          {[
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'friends', label: 'Friends', icon: User },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            {/* Theme Selection */}
            <div className="rounded-2xl p-6" style={glassStyle}>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Theme Colors
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {THEME_OPTIONS.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setCurrentTheme(theme.id)}
                    className={`aspect-square rounded-xl transition-all flex items-center justify-center ${
                      currentTheme === theme.id 
                        ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: theme.color }}
                    title={theme.name}
                  >
                    {currentTheme === theme.id && (
                      <Sparkles className="w-5 h-5 text-white drop-shadow-lg" />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Current: {THEME_OPTIONS.find(t => t.id === currentTheme)?.name}
              </p>
            </div>

            {/* Visual Effects */}
            <div className="rounded-2xl p-6" style={glassStyle}>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Visual Effects
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Snowflake className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Snowfall Effect</p>
                      <p className="text-xs text-muted-foreground">Animated snow on the website</p>
                    </div>
                  </div>
                  <Switch checked={snowfallEnabled} onCheckedChange={setSnowfallEnabled} />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Glass Effect</p>
                      <p className="text-xs text-muted-foreground">iOS-style translucent panels</p>
                    </div>
                  </div>
                  <Switch checked={glassEnabled} onCheckedChange={setGlassEnabled} />
                </div>
              </div>
            </div>

            {/* Game Layout */}
            <div className="rounded-2xl p-6" style={glassStyle}>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-primary" />
                Game Browser Layout
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Carousel View</p>
                  <p className="text-xs text-muted-foreground">Swipe through games instead of a grid</p>
                </div>
                <Switch
                  checked={layoutMode === 'carousel'}
                  onCheckedChange={(checked) => setLayoutMode(checked ? 'carousel' : 'grid')}
                />
              </div>
            </div>

            {/* Popups Toggle */}
            <div className="rounded-2xl p-6" style={glassStyle}>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BellOff className="w-5 h-5 text-primary" />
                Popups
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Disable Popups</p>
                  <p className="text-xs text-muted-foreground">Hide tutorial, changelog, and disclaimer on launch</p>
                </div>
                <Switch
                  checked={popupsDisabled}
                  onCheckedChange={setPopupsDisabled}
                />
              </div>
            </div>

            {/* Transitions Toggle */}
            <div className="rounded-2xl p-6" style={glassStyle}>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Performance
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Disable Transitions</p>
                  <p className="text-xs text-muted-foreground">Turn off animations for better performance</p>
                </div>
                <Switch
                  checked={transitionsDisabled}
                  onCheckedChange={setTransitionsDisabled}
                />
              </div>
            </div>

            {/* Custom Background */}
            <div className="rounded-2xl p-6" style={glassStyle}>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                Custom Background
              </h3>
              
              {/* Current background preview */}
              {customBackground.type !== 'none' && (
                <div className="mb-4 relative rounded-xl overflow-hidden h-32">
                  {customBackground.type === 'image' ? (
                    <img 
                      src={customBackground.url} 
                      alt="Current background" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video 
                      src={customBackground.url} 
                      autoPlay 
                      loop 
                      muted 
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <button
                    onClick={clearBackground}
                    className="absolute top-2 right-2 p-2 bg-destructive/80 hover:bg-destructive rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <p className="absolute bottom-2 left-3 text-sm text-foreground font-medium">
                    Current: {customBackground.type === 'image' ? 'Image' : 'Video'}
                  </p>
                </div>
              )}

              {/* Upload buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <input
                  type="file"
                  ref={bgFileInputRef}
                  onChange={(e) => handleBgFileUpload(e, 'image')}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => bgFileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-4 bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors border border-dashed border-border"
                >
                  <Image className="w-5 h-5 text-primary" />
                  <span>Upload Image</span>
                </button>

                <input
                  type="file"
                  ref={bgVideoInputRef}
                  onChange={(e) => handleBgFileUpload(e, 'video')}
                  accept="video/*"
                  className="hidden"
                />
                <button
                  onClick={() => bgVideoInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-4 bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors border border-dashed border-border"
                >
                  <Video className="w-5 h-5 text-primary" />
                  <span>Upload Video</span>
                </button>
              </div>

              {/* URL input */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Or enter a URL:</p>
                <div className="flex gap-2">
                  <select
                    value={bgType}
                    onChange={(e) => setBgType(e.target.value as 'image' | 'video')}
                    className="px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                  <input
                    type="url"
                    value={bgUrlInput}
                    onChange={(e) => setBgUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleBgUrlSet}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="rounded-2xl p-6" style={glassStyle}>
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Your Profile
            </h3>

            {/* Avatar */}
            <div className="flex items-center gap-6 mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-muted overflow-hidden border-2 border-primary/20">
                  {selectedAvatar ? (
                    <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="absolute -bottom-1 -right-1 w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:bg-primary/80 transition-colors"
                >
                  <Camera className="w-5 h-5 text-primary-foreground" />
                </button>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="text-xl font-semibold text-foreground">{user?.username}</p>
              </div>
            </div>

            {/* Avatar Picker */}
            {showAvatarPicker && (
              <div className="mb-6 p-4 bg-muted/30 rounded-xl space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full py-3 px-4 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Uploading...' : 'Upload Photo'}
                </button>
                <p className="text-xs text-muted-foreground text-center">Or choose an avatar:</p>
                <div className="grid grid-cols-5 gap-2">
                  {AVATAR_OPTIONS.map((avatar, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedAvatar(avatar);
                        setShowAvatarPicker(false);
                      }}
                      className={`aspect-square rounded-full overflow-hidden border-2 transition-all ${
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
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={user?.username || 'Enter display name...'}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground">This is how others will see you in chat</p>
            </div>

            <button
              onClick={saveProfile}
              disabled={isSaving}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="rounded-2xl p-6" style={glassStyle}>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Friend Nicknames
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Set nicknames for friends that only you can see</p>
            
            {friends.length === 0 ? (
              <p className="text-muted-foreground italic text-center py-8">No friends yet. Add some from the chatroom!</p>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3 p-4 bg-muted/20 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
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
                          className="w-28 px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                          maxLength={20}
                          autoFocus
                        />
                        <button
                          onClick={() => saveNickname(friend.id)}
                          className="p-2 text-green-500 hover:bg-green-500/20 rounded-lg"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingNickname(null);
                            setNicknameValue('');
                          }}
                          className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
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
        )}
      </div>
    </div>
  );
}
