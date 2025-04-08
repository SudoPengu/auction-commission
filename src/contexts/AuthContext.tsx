import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from "../components/ui/use-toast";

// User roles
export type UserRole = 'staff' | 'admin' | 'super-admin';

// User interface
export interface User {
  id: string;
  name: string;
  role: UserRole;
  code?: string; // Quick login code
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (code: string) => Promise<boolean>;
  logout: () => void;
}

// Mock users for demonstration
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    role: 'admin',
    code: 'admin123'
  },
  {
    id: '2',
    name: 'Staff Member',
    role: 'staff',
    code: 'staff123'
  },
  {
    id: '3',
    name: 'Super Admin',
    role: 'super-admin',
    code: 'super123'
  }
];

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('bluesky_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Mock login function
  const login = async (code: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const foundUser = mockUsers.find(u => u.code === code);
      
      if (foundUser) {
        // Store user in local storage
        localStorage.setItem('bluesky_user', JSON.stringify(foundUser));
        setUser(foundUser);
        
        // Show success toast
        toast({
          title: "Login successful",
          description: `Welcome back, ${foundUser.name}!`,
        });
        
        // Simulate sending notification (would be server-side in production)
        console.log(`Notification sent to ${foundUser.name} about new login`);
        
        setIsLoading(false);
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "Invalid access code. Please try again.",
        });
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login error",
        description: "An unexpected error occurred. Please try again.",
      });
      setIsLoading(false);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('bluesky_user');
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
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
