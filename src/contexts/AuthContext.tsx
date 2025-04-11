
import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Enums } from '@/integrations/supabase/types';

// User role type from Supabase
export type UserRole = Enums<'user_role'>;

// User profile interface
export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  email: string;
  phone_number?: string | null;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debug log
  useEffect(() => {
    console.log("Auth state:", { user, profile, isAuthenticated: !!user && !!profile, isLoading });
  }, [user, profile, isLoading]);

  // Fetch user profile
  const fetchUserProfile = async (userId: string) => {
    console.log("Fetching profile for user ID:", userId);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (data) {
        console.log("Profile found:", data);
        return data as UserProfile;
      }
      
      console.log("No profile found for user ID:", userId);
      return null;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return null;
    }
  };

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
            const profile = await fetchUserProfile(session.user.id);
            setProfile(profile);
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
        const profile = await fetchUserProfile(session.user.id);
        setProfile(profile);
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
        setIsLoading(false);
        return false;
      }

      if (data.user) {
        console.log("Authenticated user:", data.user.id);
        try {
          // Log activity
          await supabase.rpc('log_activity', {
            action: 'login',
            resource: 'auth',
            details: { method: 'email' }
          });
        } catch (err) {
          console.error("Error logging activity:", err);
          // Don't block login if activity logging fails
        }
        
        // Fetch user profile
        const userProfile = await fetchUserProfile(data.user.id);
        setProfile(userProfile);
        
        if (!userProfile) {
          console.error("Authentication successful but no user profile found");
          toast({
            variant: "destructive",
            title: "Profile not found",
            description: "Your account exists but no profile is associated with it. Please contact an administrator.",
          });
          // Still return true since authentication succeeded
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
        isAuthenticated: !!user && !!profile, 
        isLoading, 
        login, 
        logout 
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
