
import React, { createContext, useState, useContext, useEffect } from 'react';
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

  // Debug log
  useEffect(() => {
    console.log("Auth state:", { user, profile, isAuthenticated: !!user, isLoading });
  }, [user, profile, isLoading]);

  // Authentication state listener
  useEffect(() => {
    console.log("Setting up auth state listener");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        
        if (session?.user) {
          setUser(session.user);
          
          // Use setTimeout to avoid potential deadlocks with Supabase client
          setTimeout(async () => {
            const userProfile = await fetchUserProfile(session.user.id, session.user.email);
            setProfile(userProfile);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("Initial session check:", session?.user?.id);
      
      if (session?.user) {
        setUser(session.user);
        const userProfile = await fetchUserProfile(session.user.id, session.user.email);
        setProfile(userProfile);
      }
      
      setIsLoading(false);
    });

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
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('supabase.auth.token');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout error",
        description: "An error occurred during logout.",
      });
    }
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
