
import { UserProfile, UserRole } from '@/types/auth';

export const createMockProfile = (userId: string, email: string): UserProfile => {
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
