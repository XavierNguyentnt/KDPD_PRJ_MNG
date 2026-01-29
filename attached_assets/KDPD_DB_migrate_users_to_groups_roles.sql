-- =============================================================================
-- KDPD: Migration dữ liệu – Từ users.employee_group / users.role sang user_groups / user_roles
-- Chạy SAU khi đã chạy KDPD_DB_migration_user_groups_roles.sql (bảng groups, roles, user_groups, user_roles đã có + seed).
-- Gán mỗi user vào đúng nhóm và vai trò theo dữ liệu cũ. Có thể chạy nhiều lần (ON CONFLICT DO NOTHING).
-- =============================================================================

-- Gán nhóm từ users.employee_group (bien_tap, thu_ky_hop_phan; thong_thuong không map vào group nếu không có)
INSERT INTO public.user_groups (user_id, group_id)
SELECT u.id, g.id
FROM public.users u
INNER JOIN public.groups g ON g.code = u.employee_group
WHERE u.employee_group IS NOT NULL
  AND u.employee_group <> ''
ON CONFLICT (user_id, group_id) DO NOTHING;

-- Gán vai trò từ users.role (Admin → admin, Manager → manager, Employee → employee)
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM public.users u
INNER JOIN public.roles r ON LOWER(TRIM(u.role)) = r.code
WHERE u.role IS NOT NULL
  AND TRIM(u.role) <> ''
ON CONFLICT (user_id, role_id) DO NOTHING;
