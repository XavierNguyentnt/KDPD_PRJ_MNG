-- =============================================================================
-- KDPD: Migration – Nhóm (groups) và Vai trò (roles) cho nhân sự
-- 1 nhân sự = 1 department (giữ users.department), nhiều groups, nhiều roles.
-- Phục vụ phân quyền: xem/sửa task theo nhóm và vai trò.
-- Chạy sau khi đã có bảng users. Có thể chạy nhiều lần (idempotent).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bảng groups (nhóm công việc / nhóm nhân sự)
-- Khớp với tasks."group": CV chung, Biên tập, Thiết kế + CNTT, Quét trùng lặp, Thư ký hợp phần, ...
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT groups_code_unique UNIQUE (code)
);

COMMENT ON TABLE public.groups IS 'Nhóm công việc / nhóm nhân sự. 1 nhân sự có thể thuộc nhiều nhóm (user_groups).';
COMMENT ON COLUMN public.groups.code IS 'Mã ổn định: bien_tap, thu_ky_hop_phan, cv_chung, thiet_ke_cntt, quet_trung_lap.';

CREATE INDEX IF NOT EXISTS idx_groups_code ON public.groups(code);

DROP TRIGGER IF EXISTS groups_updated_at ON public.groups;
CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. Bảng user_groups (users ↔ groups – 1 nhân sự thuộc nhiều nhóm)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_groups_unique UNIQUE (user_id, group_id)
);

COMMENT ON TABLE public.user_groups IS 'Bảng trung gian users-groups: 1 nhân sự thuộc nhiều nhóm (vd: vừa Biên tập vừa Thư ký hợp phần).';

CREATE INDEX IF NOT EXISTS idx_user_groups_user_id ON public.user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_id ON public.user_groups(group_id);

DROP TRIGGER IF EXISTS user_groups_updated_at ON public.user_groups;
CREATE TRIGGER user_groups_updated_at
  BEFORE UPDATE ON public.user_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 3. Bảng roles (vai trò phân quyền)
-- Liên quan quyền truy cập, xem, sửa task theo phân quyền sau này.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roles_code_unique UNIQUE (code)
);

COMMENT ON TABLE public.roles IS 'Vai trò phân quyền. 1 nhân sự có thể có nhiều vai trò (user_roles). Dùng cho quyền xem/sửa task.';
COMMENT ON COLUMN public.roles.code IS 'Mã ổn định: admin, manager, employee (hoặc chi tiết: task_view, task_edit, task_approve, ...).';

CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);

DROP TRIGGER IF EXISTS roles_updated_at ON public.roles;
CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 4. Bảng user_roles (users ↔ roles – 1 nhân sự có nhiều vai trò)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_unique UNIQUE (user_id, role_id)
);

COMMENT ON TABLE public.user_roles IS 'Bảng trung gian users-roles: 1 nhân sự có nhiều vai trò. Phục vụ phân quyền truy cập task.';

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

DROP TRIGGER IF EXISTS user_roles_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 5. Ghi chú trên bảng users (không đổi cấu trúc)
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN public.users.department IS 'Đơn vị: 1 nhân sự chỉ thuộc một department (vd: Ban Thư ký).';
COMMENT ON COLUMN public.users.employee_group IS 'Nhóm chính (tùy chọn, tương thích cũ). Chi tiết nhiều nhóm: bảng user_groups.';
COMMENT ON COLUMN public.users.role IS 'Vai trò chính (tùy chọn, tương thích cũ). Chi tiết nhiều vai trò: bảng user_roles.';


-- -----------------------------------------------------------------------------
-- 6. Seed: Nhóm và Vai trò mặc định (chạy 1 lần, idempotent)
-- -----------------------------------------------------------------------------
INSERT INTO public.groups (code, name, description) VALUES
  ('cv_chung', 'CV chung', 'Nhóm công việc chung'),
  ('bien_tap', 'Biên tập', 'Nhóm biên tập'),
  ('thiet_ke_cntt', 'Thiết kế + CNTT', 'Nhóm thiết kế và CNTT'),
  ('quet_trung_lap', 'Quét trùng lặp', 'Nhóm quét trùng lặp'),
  ('thu_ky_hop_phan', 'Thư ký hợp phần', 'Nhóm thư ký hợp phần'),
  ('thong_thuong', 'Thông thường', 'Nhóm thông thường (tương thích employee_group cũ)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.roles (code, name, description) VALUES
  ('admin', 'Admin', 'Quản trị hệ thống'),
  ('manager', 'Manager', 'Quản lý'),
  ('employee', 'Employee', 'Nhân viên')
ON CONFLICT (code) DO NOTHING;
