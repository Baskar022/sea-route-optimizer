import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isNetworkFetchError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("failed to fetch") || message.includes("networkerror") || message.includes("load failed");
};

const authNetworkErrorMessage =
  "Unable to reach Supabase Auth. Check internet, Supabase URL/key in .env, then hard refresh and try again.";

const buildUserFromSession = (authUser: SupabaseUser, profile?: { full_name?: string | null; email?: string | null; role?: string | null }): User => {
  const email = profile?.email || authUser.email || "";
  const role = profile?.role === "admin" || profile?.role === "client"
    ? profile.role
    : authUser.user_metadata?.role === "admin" || authUser.user_metadata?.role === "client"
      ? authUser.user_metadata.role
      : "client";

  return {
    id: authUser.id,
    name: profile?.full_name || authUser.user_metadata?.full_name || email,
    email,
    role,
  };
};

const hydrateUserProfile = async (authUser: SupabaseUser, setUser: (user: User) => void) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error) {
    console.warn('Could not fetch profile (RLS may not be applied yet):', error.message);
    // Use basic user info if profile fetch fails
    setUser(buildUserFromSession(authUser, undefined));
    return;
  }

  setUser(buildUserFromSession(authUser, profile || undefined));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          setUser(buildUserFromSession(session.user));
          setTimeout(() => {
            hydrateUserProfile(session.user, setUser).catch(() => {
              setUser(buildUserFromSession(session.user));
            });
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        setUser(buildUserFromSession(session.user));
        hydrateUserProfile(session.user, setUser)
          .catch(() => {
            setUser(buildUserFromSession(session.user));
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const attemptSignIn = () =>
        supabase.auth.signInWithPassword({
          email,
          password,
        });

      let result = await attemptSignIn();

      if (result.error && result.error.message.toLowerCase().includes("failed to fetch")) {
        // Retry once for transient browser/network hiccups.
        result = await attemptSignIn();
      }

      const { data, error } = result;

      if (error) {
        if (error.message.toLowerCase().includes("failed to fetch")) {
          return { success: false, error: authNetworkErrorMessage };
        }
        return { success: false, error: error.message };
      }

      if (data.session?.user) {
        setSession(data.session);
        setUser(buildUserFromSession(data.session.user));
        hydrateUserProfile(data.session.user, setUser).catch(() => {
          setUser(buildUserFromSession(data.session.user));
        });
      }

      return { success: true };
    } catch (error) {
      if (isNetworkFetchError(error)) {
        return { success: false, error: authNetworkErrorMessage };
      }
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const register = async (name: string, email: string, password: string, role = 'client'): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: name,
            role: role
          }
        }
      });

      if (error) {
        if (error.message.toLowerCase().includes("failed to fetch")) {
          return { success: false, error: authNetworkErrorMessage };
        }
        return { success: false, error: error.message };
      }

      // Update profile with full name and role
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ full_name: name, role })
          .eq('id', data.user.id);

        setSession(data.session);
        setUser({
          id: data.user.id,
          name,
          email,
          role: role === 'admin' ? 'admin' : 'client',
        });
      }

      return { success: true };
    } catch (error) {
      if (isNetworkFetchError(error)) {
        return { success: false, error: authNetworkErrorMessage };
      }
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      login,
      register,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};