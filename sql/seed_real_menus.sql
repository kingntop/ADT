-- Clear existing menus and related permissions
TRUNCATE TABLE menus CASCADE;
ALTER SEQUENCE menus_menu_id_seq RESTART WITH 1;

-- 1. Root Level Items
INSERT INTO menus (menu_id, parent_id, menu_name, url, sort_order, is_use) VALUES
(1, NULL, '대시보드', '/dashboard', 10, true),
(2, NULL, '직원 관리', '/employees', 20, true),
(3, NULL, '부서 관리', '/departments', 30, true),
(4, NULL, '다면 검색', '/search', 40, true),
(5, NULL, '조직도', '/tree', 50, true),
(6, NULL, '이미지 관리', '/images', 60, true),
(7, NULL, '할 일 목록', '/tasks', 70, true);

-- 2. Admin Group (Group Header)
INSERT INTO menus (menu_id, parent_id, menu_name, url, sort_order, is_use) VALUES
(100, NULL, '행정 및 관리', NULL, 900, true);

-- 3. Admin Sub-items
INSERT INTO menus (parent_id, menu_name, url, sort_order, is_use) VALUES
(100, '메뉴 설정', '/system/menus', 10, true),
(100, '권한 설정', '/system/roles', 20, true),
(100, 'API 키 관리', '/apikeys', 30, true),
(100, 'API 엔드포인트 관리', '/api_endpoints', 40, true),
(100, '앱 사용자 관리', '/app_users', 50, true);

-- Restore Super User Permissions for new Menus
-- (Give Role ID 1 full access to all new menus)
INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print)
SELECT 1, menu_id, true, true, true, true, true FROM menus;
