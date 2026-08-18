import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const AUTO_FRIEND_ADMIN_KEY = 'starstream_auto_friend_admin';
const ADMIN_BEFRIEND_ALL_KEY = 'starstream_admin_befriend_all_v2';

export function useAutoFriendAdmin() {
  const { user, sessionToken } = useAuth();

  useEffect(() => {
    if (!user || !sessionToken) return;

    if (user.role === 'admin') {
      const befriendAllUsers = async () => {
        const alreadyRan = localStorage.getItem(ADMIN_BEFRIEND_ALL_KEY);
        if (alreadyRan) return;

        try {
          const { data: allUsers } = await supabase
            .from('app_users')
            .select('id')
            .neq('id', user.id);

          if (!allUsers || allUsers.length === 0) return;

          const { data: existingFriendships } = await supabase
            .from('friendships')
            .select('friend_id')
            .eq('user_id', user.id);

          const existingFriendIds = new Set(existingFriendships?.map(f => f.friend_id) || []);
          const usersToFriend = allUsers.filter(u => !existingFriendIds.has(u.id));

          if (usersToFriend.length === 0) {
            localStorage.setItem(ADMIN_BEFRIEND_ALL_KEY, 'true');
            return;
          }

          for (const targetUser of usersToFriend) {
            await supabase.rpc('add_friendship', {
              p_session_token: sessionToken,
              p_friend_id: targetUser.id,
            });
          }

          localStorage.setItem(ADMIN_BEFRIEND_ALL_KEY, 'true');
          console.log(`Admin auto-friended ${usersToFriend.length} users`);
        } catch (error) {
          console.error('Error befriending all users:', error);
        }
      };

      befriendAllUsers();
      return;
    }

    const processedUsers = JSON.parse(localStorage.getItem(AUTO_FRIEND_ADMIN_KEY) || '[]');
    if (processedUsers.includes(user.id)) return;

    const autoFriendWithAdmin = async () => {
      try {
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (!adminRole) return;

        const adminId = adminRole.user_id;
        
        const { data: existingFriendship } = await supabase
          .from('friendships')
          .select('id')
          .or(`and(user_id.eq.${user.id},friend_id.eq.${adminId}),and(user_id.eq.${adminId},friend_id.eq.${user.id})`)
          .limit(1);

        if (existingFriendship && existingFriendship.length > 0) {
          processedUsers.push(user.id);
          localStorage.setItem(AUTO_FRIEND_ADMIN_KEY, JSON.stringify(processedUsers));
          return;
        }

        await supabase.rpc('add_friendship', {
          p_session_token: sessionToken,
          p_friend_id: adminId,
        });

        processedUsers.push(user.id);
        localStorage.setItem(AUTO_FRIEND_ADMIN_KEY, JSON.stringify(processedUsers));
        console.log('Auto-friended with admin account');
      } catch (error) {
        console.error('Error auto-friending with admin:', error);
      }
    };

    autoFriendWithAdmin();
  }, [user, sessionToken]);
}
