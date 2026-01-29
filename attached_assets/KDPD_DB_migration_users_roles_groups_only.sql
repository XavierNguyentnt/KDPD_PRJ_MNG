-- =============================================================================
-- KDPD: Migration – users.role và users.employee_group → chỉ dùng user_roles, user_groups
-- Nguyên tắc đơn nhất: vai trò và nhóm của user lấy từ bảng trung gian (user_roles, user_groups).
-- Chạy SAU khi bảng roles, user_roles, groups, user_groups đã tồn tại.
-- =============================================================================

-- Bước 1: Migrate dữ liệu từ users.role sang user_roles (tránh trùng: ON CONFLICT DO NOTHING)
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM public.users u
JOIN public.roles r ON (r.code = LOWER(TRIM(u.role)) OR r.name = TRIM(u.role))
WHERE u.role IS NOT NULL AND TRIM(u.role) <> ''
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Bước 2: Migrate dữ liệu từ users.employee_group sang user_groups (code: thong_thuong, bien_tap, ...)
INSERT INTO public.user_groups (user_id, group_id)
SELECT u.id, g.id
FROM public.users u
JOIN public.groups g ON g.code = TRIM(u.employee_group)
WHERE u.employee_group IS NOT NULL AND TRIM(u.employee_group) <> ''
ON CONFLICT (user_id, group_id) DO NOTHING;

-- Bước 3: Bỏ ràng buộc CHECK trên employee_group
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_employee_group_check;

-- Bước 4: Xóa cột role và employee_group – nguồn dữ liệu duy nhất là user_roles, user_groups
ALTER TABLE public.users DROP COLUMN IF EXISTS role;
ALTER TABLE public.users DROP COLUMN IF EXISTS employee_group;

COMMENT ON TABLE public.users IS 'Nhân sự. Vai trò: bảng user_roles. Nhóm: bảng user_groups.';
