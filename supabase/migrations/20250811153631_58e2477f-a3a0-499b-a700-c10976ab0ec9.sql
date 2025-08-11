-- Add 'bidder' to user_role enum
ALTER TYPE user_role ADD VALUE 'bidder';

-- Update any auction-manager users to admin before removing the role
UPDATE user_profiles SET role = 'admin' WHERE role = 'auction-manager';

-- Update the bidder0 user to have bidder role
UPDATE user_profiles 
SET role = 'bidder' 
WHERE email = 'blueskyincbidder.0@outlook.com';

-- Note: auction-manager will remain in enum but won't be used
-- This is safer than recreating the enum which caused the casting error