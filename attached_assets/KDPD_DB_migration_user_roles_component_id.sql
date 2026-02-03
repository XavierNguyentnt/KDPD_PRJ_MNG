-- KDPD: Migration – Thêm component_id vào user_roles để phân quyền thư ký theo hợp phần
-- Một thư ký có thể tham gia một hoặc nhiều hợp phần (nhiều dòng user_roles: cùng role_id, khác component_id).
-- Vai trò toàn cục (Admin, Manager, Employee) giữ component_id = NULL.
-- Chạy SAU khi bảng user_roles và components đã tồn tại (vd: sau 2026.02.02. neon_backup).

-- 1. Thêm cột component_id (nullable, FK → components.id)
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS component_id uuid REFERENCES public.components(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.user_roles.component_id IS 'Hợp phần áp dụng cho vai trò (vd: Thư ký hợp phần). NULL = vai trò toàn cục (Admin/Manager/Employee).';

-- 2. Bỏ ràng buộc UNIQUE (user_id, role_id) vì giờ cho phép nhiều dòng (user_id, role_id, component_id) với component_id khác nhau
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_unique;

-- 3. Chỉ cho phép tối đa một dòng (user_id, role_id) khi component_id IS NULL (vai trò toàn cục)
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_global_key
  ON public.user_roles (user_id, role_id)
  WHERE component_id IS NULL;

-- 4. Chỉ cho phép tối đa một dòng (user_id, role_id, component_id) khi component_id IS NOT NULL (thư ký theo hợp phần)
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_component_key
  ON public.user_roles (user_id, role_id, component_id)
  WHERE component_id IS NOT NULL;

-- 5. Index để lọc theo component_id
CREATE INDEX IF NOT EXISTS idx_user_roles_component_id
  ON public.user_roles (component_id)
  WHERE component_id IS NOT NULL;

COMMENT ON TABLE public.user_roles IS 'Bảng trung gian users-roles: 1 nhân sự có nhiều vai trò. component_id: hợp phần (vd Thư ký hợp phần); NULL = toàn cục.';
