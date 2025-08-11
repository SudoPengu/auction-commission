-- Step 2: Update the bidder0 user to have bidder role
UPDATE user_profiles 
SET role = 'bidder' 
WHERE email = 'blueskyincbidder.0@outlook.com';

-- Also update any auction-manager users to admin
UPDATE user_profiles SET role = 'admin' WHERE role = 'auction-manager';