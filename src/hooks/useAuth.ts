import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('useAuth: Fetching user session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('useAuth: Error fetching session:', error);
          setUser(null);
          setLoading(false);
          return;
        }

        console.log('useAuth: Session data:', session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('useAuth: Caught error fetching session:', error);
        setUser(null);
        setLoading(false);
      }
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAuth: Auth state changed:', event, session?.user?.id);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          phone: phone || ''
        }
      }
    });
    
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  };

  const signInWithGoogle = async () => {
    // Get the current domain dynamically
    const currentOrigin = window.location.origin;
    console.log('Current origin:', currentOrigin); // Debug log
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${currentOrigin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    
    if (error) {
      console.error('Google OAuth error:', error); // Debug log
    }
    
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    return { error };
  };

  const signOut = async () => {
    // Sign out globally (revokes refresh token on server) and clear local session
    const { error } = await supabase.auth.signOut({ scope: 'global' });

    // Hard-clean any lingering Supabase session keys in localStorage (sb-*)
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-'))
        .forEach((k) => localStorage.removeItem(k));
    } catch (error) {
      console.error('Error cleaning localStorage:', error);
    }

    // Force reload to ensure all state is reset across the app
    try {
      window.location.replace('/');
    } catch (error) {
      console.error('Error reloading page:', error);
    }

    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    resetPassword,
    signOut
  };
};