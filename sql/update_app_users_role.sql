-- Add role_id column
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role_id INTEGER;

-- Add foreign key constraint
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_id_fkey;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(role_id);

-- Migrate existing data
-- ADMIN -> ROLE_SUPER (Most powerful)
UPDATE app_users 
SET role_id = (SELECT role_id FROM roles WHERE role_code = 'ROLE_SUPER') 
WHERE role = 'ADMIN';

-- MANAGER -> ROLE_OPERATOR
UPDATE app_users 
SET role_id = (SELECT role_id FROM roles WHERE role_code = 'ROLE_OPERATOR') 
WHERE role = 'MANAGER';

-- USER -> ROLE_CS (Default/Lowest) or NULL if no direct map, but let's map to CS for safety or maybe create a new mapping? 
-- Let's assume USER maps to a general viewer role, keeping it safe.
-- If roles table only has ROLE_SUPER, ROLE_OPERATOR, ROLE_CS..
-- Let's map USER to ROLE_CS for now, or leave null if they need reassignment.
-- Given the requirement "Existing users will need to have their roles re-assigned", maybe best to migrate what we can.
UPDATE app_users 
SET role_id = (SELECT role_id FROM roles WHERE role_code = 'ROLE_CS') 
WHERE role = 'USER';
