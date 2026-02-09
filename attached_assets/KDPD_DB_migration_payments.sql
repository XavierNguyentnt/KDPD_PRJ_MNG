-- =============================================================================
-- KDPD: Migration – Bảng payments (chuẩn kế toán) + bổ sung cột settlement_date
-- Chạy nhiều lần an toàn (idempotent).
-- =============================================================================

-- 1) Tạo bảng payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_contract_id uuid REFERENCES public.translation_contracts(id) ON DELETE CASCADE,
  payment_type text, -- advance | settlement | other
  voucher_no text,
  payment_date date,
  amount numeric(15, 2) NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payments IS 'Mỗi lần chi tiền = 1 record (tạm ứng/quyết toán/khác).';
COMMENT ON COLUMN public.payments.payment_type IS 'advance | settlement | other';

CREATE INDEX IF NOT EXISTS idx_payments_translation_contract ON public.payments(translation_contract_id) WHERE translation_contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date) WHERE payment_date IS NOT NULL;

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'payments_updated_at'
  ) THEN
    CREATE TRIGGER payments_updated_at
      BEFORE UPDATE ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 2) Bổ sung cột settlement_date cho translation_contracts (nếu chưa có)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'translation_contracts' AND column_name = 'settlement_date'
  ) THEN
    ALTER TABLE public.translation_contracts ADD COLUMN settlement_date date;
  END IF;
END $$;

-- 3) Bổ sung các cột cấu hình tạm ứng/quyết toán cho translation_contracts (nếu chưa có)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'translation_contracts' AND column_name = 'advance_include_overview'
  ) THEN
    ALTER TABLE public.translation_contracts ADD COLUMN advance_include_overview boolean;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'translation_contracts' AND column_name = 'advance_1_percent'
  ) THEN
    ALTER TABLE public.translation_contracts ADD COLUMN advance_1_percent numeric(10,4);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'translation_contracts' AND column_name = 'advance_2_percent'
  ) THEN
    ALTER TABLE public.translation_contracts ADD COLUMN advance_2_percent numeric(10,4);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'translation_contracts' AND column_name = 'is_settled'
  ) THEN
    ALTER TABLE public.translation_contracts ADD COLUMN is_settled boolean;
  END IF;
END $$;
