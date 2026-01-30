-- =============================================================================
-- KDPD: Migration – Hợp phần (components) + Giai đoạn hợp đồng (contract_stages)
-- Dùng để: phân loại tác phẩm/hợp đồng theo hợp phần; mỗi hợp đồng có nhiều giai đoạn.
-- Chạy SAU khi đã có: works, translation_contracts, proofreading_contracts.
-- Nguyên tắc: CHỈ ADD bảng / ADD cột. KHÔNG xóa hoặc đổi tên bảng/cột cũ.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bảng components (Hợp phần dịch thuật)
-- VD: Phật tạng toàn dịch, Phật tạng tinh yếu, Phật điển, Nho tạng, Nho điển
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.components IS 'Hợp phần dịch thuật: dùng để phân loại tác phẩm và hợp đồng (VD: Phật tạng toàn dịch, Phật điển, Nho tạng).';

CREATE INDEX IF NOT EXISTS idx_components_code ON public.components(code);
CREATE INDEX IF NOT EXISTS idx_components_display_order ON public.components(display_order);

-- Seed dữ liệu mẫu (idempotent: chỉ insert nếu chưa có)
INSERT INTO public.components (code, name, display_order)
VALUES
  ('phat_tang_toan_dich', 'Phật tạng toàn dịch', 1),
  ('phat_tang_tinh_yeu', 'Phật tạng tinh yếu', 2),
  ('phat_dien', 'Phật điển', 3),
  ('nho_tang', 'Nho tạng', 4),
  ('nho_dien', 'Nho điển', 5)
ON CONFLICT (code) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 2. Bảng contract_stages (Giai đoạn hợp đồng – 1 hợp đồng nhiều giai đoạn)
-- Mỗi dòng: 1 giai đoạn (GĐ 1, GĐ 2, ...) thuộc 1 hợp đồng dịch thuật HOẶC 1 hợp đồng hiệu đính
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_contract_id uuid REFERENCES public.translation_contracts(id) ON DELETE CASCADE,
  proofreading_contract_id uuid REFERENCES public.proofreading_contracts(id) ON DELETE CASCADE,
  stage_code text NOT NULL,
  stage_order integer NOT NULL DEFAULT 1,
  start_date date,
  end_date date,
  actual_completion_date date,
  note text,
  CONSTRAINT contract_stages_one_contract_check CHECK (
    (translation_contract_id IS NOT NULL AND proofreading_contract_id IS NULL)
    OR (translation_contract_id IS NULL AND proofreading_contract_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.contract_stages IS 'Giai đoạn hợp đồng: mỗi hợp đồng (dịch thuật hoặc hiệu đính) có thể có nhiều giai đoạn (GĐ 1, GĐ 2, ...).';

CREATE INDEX IF NOT EXISTS idx_contract_stages_translation ON public.contract_stages(translation_contract_id) WHERE translation_contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contract_stages_proofreading ON public.contract_stages(proofreading_contract_id) WHERE proofreading_contract_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 3. Thêm cột component_id vào works, translation_contracts, proofreading_contracts
-- (idempotent)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'works' AND column_name = 'component_id') THEN
    ALTER TABLE public.works ADD COLUMN component_id uuid REFERENCES public.components(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'translation_contracts' AND column_name = 'component_id') THEN
    ALTER TABLE public.translation_contracts ADD COLUMN component_id uuid REFERENCES public.components(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proofreading_contracts' AND column_name = 'component_id') THEN
    ALTER TABLE public.proofreading_contracts ADD COLUMN component_id uuid REFERENCES public.components(id);
  END IF;
END $$;

COMMENT ON COLUMN public.works.component_id IS 'Hợp phần dịch thuật (phân loại tác phẩm).';
COMMENT ON COLUMN public.translation_contracts.component_id IS 'Hợp phần (phân loại hợp đồng); có thể suy từ work_id hoặc set trực tiếp.';
COMMENT ON COLUMN public.proofreading_contracts.component_id IS 'Hợp phần (phân loại hợp đồng); có thể suy từ work_id hoặc set trực tiếp.';

CREATE INDEX IF NOT EXISTS idx_works_component_id ON public.works(component_id) WHERE component_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_translation_contracts_component_id ON public.translation_contracts(component_id) WHERE component_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proofreading_contracts_component_id ON public.proofreading_contracts(component_id) WHERE component_id IS NOT NULL;
