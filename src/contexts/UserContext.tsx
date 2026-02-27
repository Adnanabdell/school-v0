// src/contexts/UserContext.tsx
// ✅ FIX: Centralized user role context — eliminates duplicate DB calls in ProtectedRoute & Navbar
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';

interface UserContextType {
  role: string | null;
  isAdmin: boolean;
  loadingRole: boolean;
  session: Session | null;
}

const UserContext = createContext<UserContextType>({
  role: null,
  isAdmin: false,
  loadingRole: true,
  session: null,
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchRole(session.user.id);
      else setLoadingRole(false);
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setLoadingRole(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    setLoadingRole(true);
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    setRole(data?.role || 'teacher');
    setLoadingRole(false);
  };

  return (
    <UserContext.Provider value={{ role, isAdmin: role === 'admin', loadingRole, session }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
