
import { UserRole } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';

export const fetchUserProfile = async (userId: string, userEmail?: string) => {
  console.log("Fetching profile for user ID:", userId);
  try {
    // First try to get from user_profiles (for staff, admin, etc.)
    const { data: staffData, error: staffError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (staffData) {
      console.log("Staff profile found:", staffData);
      return staffData;
    }

    // If not found in user_profiles, check bidders table
    if (staffError) {
      console.log("No staff profile, checking bidder profile");
      const { data: bidderData, error: bidderError } = await supabase
        .from('bidders')
        .select('id, full_name, email, phone_number')
        .eq('id', userId)
        .maybeSingle();

      if (bidderData) {
        console.log("Bidder profile found:", bidderData);
        return {
          id: bidderData.id,
          full_name: bidderData.full_name,
          email: bidderData.email,
          phone_number: bidderData.phone_number,
          role: 'bidder' as UserRole
        };
      }
    }
    
    // Create a mock profile as fallback (only for development)
    if (userEmail) {
      console.log("No profile found, using mock profile for", userEmail);
      return createMockProfile(userId, userEmail);
    }
    
    console.log("No profile found for user ID:", userId);
    return null;
  } catch (error) {
    console.error('Unexpected error fetching profile:', error);
    
    // Create a mock profile as fallback (only for development)
    if (userEmail) {
      console.log("Using mock profile after error for", userEmail);
      return createMockProfile(userId, userEmail);
    }
    return null;
  }
};

export const getRoleBasedLandingPage = (role: UserRole): string => {
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

export const logLoginActivity = async () => {
  try {
    await supabase.rpc('log_activity', {
      action: 'login',
      resource: 'auth',
      details: { method: 'email' }
    });
  } catch (err) {
    console.error("Error logging activity:", err);
    // Don't block login if activity logging fails
  }
};
