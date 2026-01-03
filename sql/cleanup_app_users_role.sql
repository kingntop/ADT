-- Fix specific user '왕' (ADMIN) -> ROLE_SUPER
-- Assuming ROLE_SUPER is role_id 1 (based on menu.sql insertion order)
-- Better to lookup by code
UPDATE app_users 
SET role_id = (SELECT role_id FROM roles WHERE role_code = 'ROLE_SUPER') 
WHERE username = '왕' AND role_id IS NULL;

-- Safety check: Ensure no nulls (Assign to default CS role if any remains)
UPDATE app_users 
SET role_id = (SELECT role_id FROM roles WHERE role_code = 'ROLE_CS') 
WHERE role_id IS NULL;

-- Drop the column
ALTER TABLE app_users DROP COLUMN role;
