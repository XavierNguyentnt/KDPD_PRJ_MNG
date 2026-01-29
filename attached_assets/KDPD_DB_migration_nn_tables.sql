-- =============================================================================
-- KDPD: Migration – Bảng trung gian cho quan hệ n-n (theo Docs/DATABASE_NN_SURVEY.md)
-- Chạy trên Neon (hoặc PostgreSQL) sau khi đã có bảng users, tasks, contracts, documents.
-- Tạo: task_assignments, contract_members, document_tasks, document_contracts.
-- Có thể chạy nhiều lần (idempotent).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bảng task_assignments (users ↔ tasks + ngày nhận / ngày hoàn thành)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stage_type text NOT NULL,
  round_number integer NOT NULL DEFAULT 1,
  received_at date,
  due_date date,
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'not_started',
  progress integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_assignments_progress_check CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT task_assignments_unique_assignment UNIQUE (task_id, user_id, stage_type, round_number)
);

COMMENT ON TABLE public.task_assignments IS 'Bảng trung gian users-tasks: 1 task nhiều nhân sự, mỗi lần giao có ngày nhận / ngày hoàn thành dự kiến / ngày hoàn thành thực tế.';
COMMENT ON COLUMN public.task_assignments.stage_type IS 'primary | btv1 | btv2 | doc_duyet (primary = gán việc đơn từ tasks.assignee_id cũ).';
COMMENT ON COLUMN public.task_assignments.received_at IS 'Ngày nhận công việc.';
COMMENT ON COLUMN public.task_assignments.due_date IS 'Ngày hoàn thành dự kiến.';
COMMENT ON COLUMN public.task_assignments.completed_at IS 'Ngày hoàn thành thực tế.';

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_due_date ON public.task_assignments(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON public.task_assignments(status);

DROP TRIGGER IF EXISTS task_assignments_updated_at ON public.task_assignments;
CREATE TRIGGER task_assignments_updated_at
  BEFORE UPDATE ON public.task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. Bảng contract_members (contracts ↔ users) – tùy chọn
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contract_members_unique UNIQUE (contract_id, user_id)
);

COMMENT ON TABLE public.contract_members IS 'Bảng trung gian contracts-users: ai phụ trách / tham gia hợp đồng.';
COMMENT ON COLUMN public.contract_members.role IS 'Ví dụ: phụ_trách_chính, tham_gia.';

CREATE INDEX IF NOT EXISTS idx_contract_members_contract_id ON public.contract_members(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_members_user_id ON public.contract_members(user_id);

DROP TRIGGER IF EXISTS contract_members_updated_at ON public.contract_members;
CREATE TRIGGER contract_members_updated_at
  BEFORE UPDATE ON public.contract_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 3. Bảng document_tasks (documents ↔ tasks – 1 tài liệu gắn nhiều tasks)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  task_id text NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  role text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_tasks_unique UNIQUE (document_id, task_id)
);

COMMENT ON TABLE public.document_tasks IS 'Bảng trung gian documents-tasks: 1 tài liệu gắn nhiều tasks.';
COMMENT ON COLUMN public.document_tasks.role IS 'Vai trò của tài liệu với task (vd: bản thảo, biên bản).';
COMMENT ON COLUMN public.document_tasks.note IS 'Ghi chú cho liên kết này.';

CREATE INDEX IF NOT EXISTS idx_document_tasks_document_id ON public.document_tasks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tasks_task_id ON public.document_tasks(task_id);

DROP TRIGGER IF EXISTS document_tasks_updated_at ON public.document_tasks;
CREATE TRIGGER document_tasks_updated_at
  BEFORE UPDATE ON public.document_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 4. Bảng document_contracts (documents ↔ contracts – 1 tài liệu gắn nhiều contracts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  role text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_contracts_unique UNIQUE (document_id, contract_id)
);

COMMENT ON TABLE public.document_contracts IS 'Bảng trung gian documents-contracts: 1 tài liệu gắn nhiều hợp đồng.';
COMMENT ON COLUMN public.document_contracts.role IS 'Vai trò của tài liệu với hợp đồng (vd: phụ lục, biên bản).';
COMMENT ON COLUMN public.document_contracts.note IS 'Ghi chú cho liên kết này.';

CREATE INDEX IF NOT EXISTS idx_document_contracts_document_id ON public.document_contracts(document_id);
CREATE INDEX IF NOT EXISTS idx_document_contracts_contract_id ON public.document_contracts(contract_id);

DROP TRIGGER IF EXISTS document_contracts_updated_at ON public.document_contracts;
CREATE TRIGGER document_contracts_updated_at
  BEFORE UPDATE ON public.document_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 5. Ghi chú trên bảng tasks (không đổi cấu trúc)
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN public.tasks.assignee_id IS 'Người chịu trách nhiệm chính (tùy chọn khi dùng task_assignments).';
