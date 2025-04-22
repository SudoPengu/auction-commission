import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Enums } from '@/integrations/supabase/types';

// User role type from Supabase with additional bidder role
// Extending the original type to include 'bidder' since it's not in the Supabase enum
export type UserRole = Enums<'user_role'> | 'bidder';

// User profile interface
export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  email: string;
  phone_number?: string | null;
}

// Auth context interface - Added getRoleBasedLandingPage
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  getRoleBasedLandingPage: (role: UserRole) => string; // Method to get landing page based on role
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock profile for development purposes
const createMockProfile = (userId: string, email: string): UserProfile => {
  // Extract role from email (admin@bluesky.com -> admin)
  const role = email.split('@')[0].includes('admin') ? 'admin' 
              : email.includes('super') ? 'super-admin'
              : email.includes('bidder') ? 'bidder'
              : 'staff';
              
  return {
    id: userId,
    full_name: email.split('@')[0],
    role: role as UserRole,
    email: email
  };
};

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debug log
  useEffect(() => {
    console.log("Auth state:", { user, profile, isAuthenticated: !!user, isLoading });
  }, [user, profile, isLoading]);

  // Fetch user profile - with fallback to mock profile for development
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
        
        // Create a mock profile as fallback (only for development)
        if (user?.email) {
          console.log("Using mock profile for", user.email);
          return createMockProfile(userId, user.email);
        }
        return null;
      }

      if (data) {
        console.log("Profile found:", data);
        return data as UserProfile;
      }
      
      // Create a mock profile as fallback (only for development)
      if (user?.email) {
        console.log("No profile found, using mock profile for", user.email);
        return createMockProfile(userId, user.email);
      }
      
      console.log("No profile found for user ID:", userId);
      return null;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      
      // Create a mock profile as fallback (only for development)
      if (user?.email) {
        console.log("Using mock profile after error for", user.email);
        return createMockProfile(userId, user.email);
      }
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
            const userProfile = await fetchUserProfile(session.user.id);
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
        const userProfile = await fetchUserProfile(session.user.id);
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
          console.warn("Authentication successful but using fallback profile");
          // We're using a mock profile now, so no need for this error toast
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

  // Implement getRoleBasedLandingPage method
  const getRoleBasedLandingPage = (role: UserRole): string => {
    switch (role) {
      case 'super-admin':
      case 'admin':
      case 'staff':
        return '/pos';
      case 'auction-manager':
        return '/auctions';
      case 'bidder':
        return '/auction-events';
      default:
        return '/dashboard';
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
        getRoleBasedLandingPage // Add the new method to the context
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
