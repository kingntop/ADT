-- 1. Insert Roles (Use ON CONFLICT if your PG version supports it, else standard insert)
-- Using TRUNCATE permissions to start fresh for these roles is getting complicated if we want to keep others.
-- Let's just Insert. assuming fresh or handling constraint.
-- Ideally we check existence.

-- For this task, I will cleanup specific role codes first to ensure clean state.
DELETE FROM role_menu_permissions WHERE role_id IN (SELECT role_id FROM roles WHERE role_code IN ('ROLE_ADMIN', 'ROLE_MANAGER'));
DELETE FROM roles WHERE role_code IN ('ROLE_ADMIN', 'ROLE_MANAGER');

INSERT INTO roles (role_code, role_name, description) VALUES
('ROLE_ADMIN', 'ADMIN', '전체 관리자 (All Permissions)'),
('ROLE_MANAGER', 'MANAGER', '일반 관리자 (No Admin Access)');

-- 2. Grant ADMIN (Full Access)
INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print)
SELECT r.role_id, m.menu_id, true, true, true, true, true
FROM roles r
CROSS JOIN menus m
WHERE r.role_code = 'ROLE_ADMIN';

-- 3. Grant MANAGER (Everything EXCEPT Admin Group)
-- Admin Group has menu_id = 100 (from seed_real_menus.sql) and its children have parent_id = 100.
INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print)
SELECT r.role_id, m.menu_id, true, true, true, true, true
FROM roles r
CROSS JOIN menus m
WHERE r.role_code = 'ROLE_MANAGER'
  AND m.menu_id != 100
  AND (m.parent_id IS NULL OR m.parent_id != 100);
