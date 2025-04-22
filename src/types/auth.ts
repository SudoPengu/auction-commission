
import { User } from '@supabase/supabase-js';
import { Enums } from '@/integrations/supabase/types';

// User role type from Supabase with additional bidder role
export type UserRole = Enums<'user_role'> | 'bidder';

// User profile interface
export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  email: string;
  phone_number?: string | null;
}

// Auth context interface
export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  getRoleBasedLandingPage: (role: UserRole) => string;
}
