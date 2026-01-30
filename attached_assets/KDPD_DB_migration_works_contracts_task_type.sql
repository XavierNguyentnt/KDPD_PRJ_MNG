-- =============================================================================
-- KDPD: Migration – Work / Contract taxonomy (theo Docs/hướng_dẫn_refactor_migration_task_work_contract_giữ_dữ_liệu_cu.md)
-- Nguyên tắc: CHỈ ADD bảng / ADD cột / ADD index. KHÔNG xóa hoặc đổi tên bảng/cột cũ.
-- Chạy sau khi đã có: users, tasks, contracts, documents, task_assignments, ...
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bảng works (tác phẩm / công việc nguồn)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text,
  title_vi text,
  title_hannom text,
  document_code text,
  base_word_count integer,
  base_page_count integer,
  estimate_factor numeric,
  estimate_word_count integer,
  estimate_page_count integer,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.works IS 'Tác phẩm / công việc nguồn (trục nghiệp vụ bền vững).';

CREATE INDEX IF NOT EXISTS idx_works_stage ON public.works(stage) WHERE stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_works_document_code ON public.works(document_code) WHERE document_code IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 2. Bảng translation_contracts (hợp đồng dịch thuật)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.translation_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text,
  work_id uuid REFERENCES public.works(id),
  unit_price numeric,
  contract_value numeric,
  start_date date,
  end_date date,
  extension_start_date date,
  extension_end_date date,
  actual_completion_date date,
  actual_word_count integer,
  actual_page_count integer,
  completion_rate numeric,
  settlement_value numeric,
  note text
);

COMMENT ON TABLE public.translation_contracts IS 'Hợp đồng dịch thuật (theo dõi hợp đồng dịch thuật).';

CREATE INDEX IF NOT EXISTS idx_translation_contracts_work_id ON public.translation_contracts(work_id);
CREATE INDEX IF NOT EXISTS idx_translation_contracts_contract_number ON public.translation_contracts(contract_number) WHERE contract_number IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 3. Bảng proofreading_contracts (hợp đồng hiệu đính)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proofreading_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text,
  work_id uuid REFERENCES public.works(id),
  translation_contract_id uuid REFERENCES public.translation_contracts(id),
  proofreader_name text,
  page_count integer,
  rate_ratio numeric,
  contract_value numeric,
  start_date date,
  end_date date,
  actual_completion_date date,
  note text
);

COMMENT ON TABLE public.proofreading_contracts IS 'Hợp đồng hiệu đính (theo dõi hợp đồng hiệu đính).';

CREATE INDEX IF NOT EXISTS idx_proofreading_contracts_work_id ON public.proofreading_contracts(work_id);
CREATE INDEX IF NOT EXISTS idx_proofreading_contracts_translation_contract_id ON public.proofreading_contracts(translation_contract_id);


-- -----------------------------------------------------------------------------
-- 4. Nâng cấp bảng tasks – CHỈ ADD cột (không xóa cột cũ), idempotent
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'task_type') THEN
    ALTER TABLE public.tasks ADD COLUMN task_type text DEFAULT 'GENERAL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'related_work_id') THEN
    ALTER TABLE public.tasks ADD COLUMN related_work_id uuid REFERENCES public.works(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'related_contract_id') THEN
    ALTER TABLE public.tasks ADD COLUMN related_contract_id uuid NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.tasks.task_type IS 'GENERAL | TRANSLATION | PROOFREADING | ...; NULL/legacy coi như GENERAL.';
COMMENT ON COLUMN public.tasks.related_work_id IS 'Gắn task với work (tác phẩm). Optional.';
COMMENT ON COLUMN public.tasks.related_contract_id IS 'UUID của translation_contracts(id) hoặc proofreading_contracts(id); kiểm tra ở app theo task_type.';

CREATE INDEX IF NOT EXISTS idx_tasks_related_work ON public.tasks(related_work_id) WHERE related_work_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_related_contract ON public.tasks(related_contract_id) WHERE related_contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks(task_type) WHERE task_type IS NOT NULL;
