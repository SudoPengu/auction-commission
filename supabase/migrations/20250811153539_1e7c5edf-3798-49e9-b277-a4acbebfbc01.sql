-- Add 'bidder' to user_role enum and remove 'auction-manager'
ALTER TYPE user_role ADD VALUE 'bidder';

-- Remove 'auction-manager' from the enum by creating a new enum without it
-- First create the new enum
CREATE TYPE user_role_new AS ENUM ('super-admin', 'admin', 'staff', 'bidder');

-- Update the user_profiles table to use the new enum
-- First, update any auction-manager users to admin (if any exist)
UPDATE user_profiles SET role = 'admin' WHERE role = 'auction-manager';

-- Now alter the table to use the new enum
ALTER TABLE user_profiles ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new;

-- Drop the old enum and rename the new one
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Update the bidder0 user to have bidder role
UPDATE user_profiles 
SET role = 'bidder' 
WHERE email = 'blueskyincbidder.0@outlook.com';

-- Also update the default for new users to be staff (not auction-manager)
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'staff';