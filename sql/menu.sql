-- 1. 메뉴 테이블 (계층형 구조)
CREATE TABLE menus (
    menu_id      SERIAL PRIMARY KEY,
    parent_id    INTEGER REFERENCES menus(menu_id) ON DELETE CASCADE,
    menu_name    VARCHAR(100) NOT NULL,
    url          VARCHAR(255),
    sort_order   INTEGER DEFAULT 0,
    is_use       BOOLEAN DEFAULT true,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 역할(Role) 테이블
CREATE TABLE roles (
    role_id      SERIAL PRIMARY KEY,
    role_code    VARCHAR(50) UNIQUE NOT NULL, -- 예: 'ROLE_ADMIN', 'ROLE_MANAGER'
    role_name    VARCHAR(100) NOT NULL,
    description  TEXT,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 메뉴별 권한 매핑 테이블 (핵심 ACL)
CREATE TABLE role_menu_permissions (
    role_id      INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
    menu_id      INTEGER REFERENCES menus(menu_id) ON DELETE CASCADE,
    can_view     BOOLEAN DEFAULT false, -- 조회
    can_create   BOOLEAN DEFAULT false, -- 등록
    can_update   BOOLEAN DEFAULT false, -- 수정
    can_delete   BOOLEAN DEFAULT false, -- 삭제
    can_print    BOOLEAN DEFAULT false, -- 출력/엑셀
    PRIMARY KEY (role_id, menu_id)
);

-- 4. 관리자-역할 매핑 테이블 (N:N 관계 방지용)
CREATE TABLE admin_users (
    admin_id     SERIAL PRIMARY KEY,
    login_id     VARCHAR(50) UNIQUE NOT NULL,
    password     VARCHAR(255) NOT NULL,
    admin_name   VARCHAR(50) NOT NULL,
    role_id      INTEGER REFERENCES roles(role_id),
    last_login   TIMESTAMP WITH TIME ZONE
);

INSERT INTO roles (role_code, role_name, description) VALUES
('ROLE_SUPER', '슈퍼 관리자', '시스템 전체 제어 및 모든 권한 보유'),
('ROLE_OPERATOR', '운영 관리자', '콘텐츠 및 회원 관리 가능, 삭제 권한 제한'),
('ROLE_CS', 'CS 담당자', '문의 응대 및 조회 전용 권한');

-- 대분류
INSERT INTO menus (menu_id, parent_id, menu_name, url, sort_order) VALUES
(1, NULL, '시스템 관리', '/system', 1),
(2, NULL, '회원 관리', '/users', 2),
(3, NULL, '콘텐츠 관리', '/contents', 3);

-- 소분류 (시스템 관리 하위)
INSERT INTO menus (menu_id, parent_id, menu_name, url, sort_order) VALUES
(4, 1, '메뉴 설정', '/system/menus', 1),
(5, 1, '권한 설정', '/system/roles', 2);

-- 소분류 (회원 관리 하위)
INSERT INTO menus (menu_id, parent_id, menu_name, url, sort_order) VALUES
(6, 2, '회원 목록', '/users/list', 1),
(7, 2, '탈퇴 내역', '/users/withdraw', 2);

-- 1. 슈퍼 관리자 (모든 메뉴에 모든 권한 부여)
INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print)
SELECT 1, menu_id, true, true, true, true, true FROM menus;

-- 2. 운영 관리자 (회원/콘텐츠 조회 및 수정 가능, 시스템 설정 불가, 삭제 불가)
INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print) VALUES
(2, 2, true, true, true, false, true), -- 회원 관리(대)
(2, 6, true, true, true, false, true), -- 회원 목록
(2, 7, true, false, false, false, true), -- 탈퇴 내역
(2, 3, true, true, true, true, true);  -- 콘텐츠 관리(대)

-- 3. CS 담당자 (조회 및 엑셀 출력만 가능)
INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print) VALUES
(3, 2, true, false, false, false, true), -- 회원 관리(대)
(3, 6, true, false, false, false, true), -- 회원 목록
(3, 3, true, false, false, false, false); -- 콘텐츠 관리(대)

INSERT INTO admin_users (login_id, password, admin_name, role_id) VALUES
('KING', 'hash_pwd_1', '최고관리자', 1),
('manager01', 'hash_pwd_2', '운영자김씨', 2),
('cs_staff', 'hash_pwd_3', '상담원이씨', 3);


SELECT 
    r.role_name, 
    m.menu_name, 
    p.can_view, p.can_create, p.can_update, p.can_delete
FROM role_menu_permissions p
JOIN roles r ON p.role_id = r.role_id
JOIN menus m ON p.menu_id = m.menu_id
ORDER BY r.role_id, m.sort_order;