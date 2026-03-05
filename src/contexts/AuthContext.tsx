
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { UserProfile, AuthContextType } from '@/types/auth';
import { fetchUserProfile, getRoleBasedLandingPage, logLoginActivity } from '@/utils/authHelpers';

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);
  const profileRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Debug log (development only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("Auth state:", { user, profile, isAuthenticated: !!user, isLoading });
    }
  }, [user, profile, isLoading]);

  // Authentication state listener with performance optimization
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("Setting up auth state listener");
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        
        if (session?.user) {
          const isSameUser = userIdRef.current === session.user.id;
          const hasProfile = !!profileRef.current;

          // Keep user in sync, but avoid showing full-page loading
          // on tab focus/token refresh when nothing really changed.
          setUser(session.user);

          if (event === 'TOKEN_REFRESHED' && isSameUser && hasProfile) {
            return;
          }

          const shouldShowLoading = event === 'SIGNED_IN' || !isSameUser || !hasProfile;
          if (shouldShowLoading) {
            setIsLoading(true);
          }

          // Defer Supabase calls to prevent deadlocks
          setTimeout(() => {
            fetchUserProfile(session.user.id, session.user.email)
              .then(userProfile => {
                setProfile(userProfile);
                setIsLoading(false);
              })
              .catch(error => {
                console.error("Profile fetch failed:", error);
                setProfile(null);
                setIsLoading(false);
              });
          }, 0);
        } else {
          // For non-signout events, verify session first to avoid transient
          // auth drops on tab minimize/focus or token refresh races.
          if (event !== 'SIGNED_OUT') {
            setTimeout(async () => {
              try {
                const { data: { session: verifiedSession } } = await supabase.auth.getSession();
                if (verifiedSession?.user) {
                  setUser(verifiedSession.user);
                  if (!profileRef.current) {
                    const verifiedProfile = await fetchUserProfile(verifiedSession.user.id, verifiedSession.user.email);
                    setProfile(verifiedProfile);
                  }
                  setIsLoading(false);
                  return;
                }
              } catch (verifyError) {
                console.warn("Session re-check failed:", verifyError);
              }

              setUser(null);
              setProfile(null);
              setIsLoading(false);
            }, 150);
            return;
          }

          setUser(null);
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session with improved error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log("Initial session check:", session?.user?.id);
        
        if (error) {
          console.error("Session check error:", error);
          setIsLoading(false);
          return;
        }
        
        if (session?.user) {
          setUser(session.user);
          try {
            const userProfile = await fetchUserProfile(session.user.id, session.user.email);
            setProfile(userProfile);
          } catch (profileError) {
            console.error("Initial profile fetch failed:", profileError);
            setProfile(null);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    console.log("Login attempt for:", email);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Login error:", error);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message,
        });
        return false;
      }

      if (data.user) {
        console.log("Authenticated user:", data.user.id);
        await logLoginActivity();
        
        // Fetch user profile
        const userProfile = await fetchUserProfile(data.user.id);
        setProfile(userProfile);
        
        if (!userProfile) {
          console.warn("Authentication successful but using fallback profile");
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login error",
        description: "An unexpected error occurred. Please try again.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    console.log("Logout initiated");
    
    // Force state reset immediately - don't wait for Supabase
    setUser(null);
    setProfile(null);
    setIsLoading(false);
    
    try {
      // Clear all possible auth tokens from localStorage
      localStorage.removeItem('supabase.auth.token');
      // Clear Supabase auth tokens for any project
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      
      // Check if session exists before attempting signOut
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("Active session found, signing out...");
        await supabase.auth.signOut();
      } else {
        console.log("No active session, forcing local logout");
      }
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Still show success message since we forced state reset
      toast({
        title: "Logged out",
        description: "You have been logged out locally.",
      });
    }
    
    console.log("Logout completed, state reset");
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        profile, 
        isAuthenticated: !!user, 
        isLoading, 
        login, 
        logout,
        getRoleBasedLandingPage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
