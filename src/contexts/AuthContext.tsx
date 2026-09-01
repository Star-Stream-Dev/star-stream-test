import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ error: string | null }>;
  signupWithInvite: (inviteCode: string, username: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
  isAdmin: boolean;
  sessionToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('starstream_user');
    const storedToken = localStorage.getItem('starstream_session_token');
    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser);
        // Re-verify role from server on load
        verifyUserRole(parsed).then(verified => {
          if (verified) {
            setUser(verified);
            setSessionToken(storedToken);
            localStorage.setItem('starstream_user', JSON.stringify(verified));
          } else {
            localStorage.removeItem('starstream_user');
            localStorage.removeItem('starstream_session_token');
          }
          setIsLoading(false);
        });
        return;
      } catch {
        localStorage.removeItem('starstream_user');
        localStorage.removeItem('starstream_session_token');
      }
    }
    setIsLoading(false);
  }, []);

  const verifyUserRole = async (parsed: { id: string; username: string }): Promise<User | null> => {
    try {
      const { data } = await supabase.rpc('has_role', { _user_id: parsed.id, _role: 'admin' });
      return {
        id: parsed.id,
        username: parsed.username,
        role: data ? 'admin' : 'user',
      };
    } catch {
      return null;
    }
  };

  const login = async (username: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-hash', {
        body: { action: 'login', username, password },
      });

      if (error) {
        // Non-2xx responses throw; read the JSON body for the real message
        let message = 'Invalid username or password';
        const res = (error as { context?: Response }).context;
        if (res && typeof res.json === 'function') {
          try {
            const body = await res.json();
            if (body?.error) message = body.error;
          } catch { /* ignore */ }
        }
        return { error: message };
      }

      if (data?.error) {
        return { error: data.error };
      }


      const userData: User = {
        id: data.user_id,
        username: data.username,
        role: data.role || 'user',
      };

      setUser(userData);
      setSessionToken(data.session_token);
      localStorage.setItem('starstream_user', JSON.stringify(userData));
      localStorage.setItem('starstream_session_token', data.session_token);
      return { error: null };
    } catch (err) {
      console.error('Login error:', err);
      return { error: 'An error occurred during login' };
    }
  };

  const signupWithInvite = async (
    inviteCode: string,
    username: string,
    password: string,
  ): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-hash', {
        body: { action: 'signup_with_invite', invite_code: inviteCode, username, password },
      });

      if (error) {
        let message = 'Could not create your account';
        const res = (error as { context?: Response }).context;
        if (res && typeof res.json === 'function') {
          try {
            const body = await res.json();
            if (body?.error) message = body.error;
          } catch { /* ignore */ }
        }
        return { error: message };
      }

      if (data?.error) return { error: data.error };

      const userData: User = {
        id: data.user_id,
        username: data.username,
        role: data.role || 'user',
      };
      setUser(userData);
      setSessionToken(data.session_token);
      localStorage.setItem('starstream_user', JSON.stringify(userData));
      localStorage.setItem('starstream_session_token', data.session_token);
      return { error: null };
    } catch (err) {
      console.error('Signup error:', err);
      return { error: 'An error occurred during signup' };
    }
  };

  const logout = () => {
    // Invalidate session on server
    if (sessionToken) {
      supabase.functions.invoke('auth-hash', {
        body: { action: 'logout', session_token: sessionToken },
      }).catch(() => {});
    }
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem('starstream_user');
    localStorage.removeItem('starstream_session_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signupWithInvite,
        logout,
        isAdmin: user?.role === 'admin',
        sessionToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
