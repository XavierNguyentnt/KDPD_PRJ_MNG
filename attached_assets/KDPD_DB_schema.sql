-- =============================================================================
-- KDPD_DB - Script tạo các bảng theo DB_Plan.md
-- Chạy trong Neon SQL Editor: chọn database (neondb hoặc KDPD_DB) rồi Execute
-- gen_random_uuid() có sẵn trong PostgreSQL 13+
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bảng users (người dùng / nhân sự)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  department TEXT,
  role TEXT,
  employee_group TEXT CHECK (employee_group IS NULL OR employee_group IN ('thong_thuong', 'thu_ky_hop_phan', 'bien_tap')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'Nhân sự - đồng bộ từ Google Contacts; role: Admin/Manager/Employee; employee_group cho Employee.';
COMMENT ON COLUMN users.employee_group IS 'thong_thuong | thu_ky_hop_phan | bien_tap - chỉ dùng khi role = Employee';

-- -----------------------------------------------------------------------------
-- 2. Bảng contracts (hợp đồng: Dịch thuật, Hiệu đính)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  type TEXT,
  name TEXT,
  party_a TEXT,
  party_b TEXT,
  signed_at DATE,
  value NUMERIC(15, 2),
  status TEXT,
  contract_scope TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE contracts IS 'Hợp đồng (Dịch thuật, Hiệu đính); type: dich_thuat | hieu_dinh.';

-- -----------------------------------------------------------------------------
-- 3. Bảng tasks (công việc)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assignee TEXT,
  role TEXT,
  "group" TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  start_date TEXT,
  due_date TEXT,
  actual_completed_at TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  workflow JSONB,
  source_sheet_id TEXT,
  source_sheet_name TEXT,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tasks IS 'Công việc từ 4 bảng Sheets; workflow JSON (BTV1, BTV2, Người đọc duyệt).';
COMMENT ON COLUMN tasks."group" IS 'Nhóm CV: CV chung, Biên tập, Thiết kế + CNTT, Quét trùng lặp';

-- -----------------------------------------------------------------------------
-- 4. Bảng documents (hồ sơ giấy tờ)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  document_type TEXT,
  file_path TEXT,
  storage_key TEXT,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE documents IS 'Hồ sơ giấy tờ (file/dossier); gắn contract_id hoặc task_id hoặc đứng riêng.';
COMMENT ON COLUMN documents.document_type IS 'scan, bản thảo, biên bản, ...';

-- -----------------------------------------------------------------------------
-- 5. Index gợi ý (truy vấn nhanh)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_employee_group ON users(employee_group) WHERE employee_group IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(type);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_group ON tasks("group");
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_contract_id ON tasks(contract_id) WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_contract_id ON documents(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by) WHERE uploaded_by IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. Trigger cập nhật updated_at tự động
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS contracts_updated_at ON contracts;
CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
