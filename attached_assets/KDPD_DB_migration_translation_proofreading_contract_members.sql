-- =============================================================================
-- KDPD: Migration – Bảng trung gian cho translation_contracts và proofreading_contracts với users
-- Chạy sau khi đã có bảng users, translation_contracts, proofreading_contracts, roles.
-- Tạo: translation_contract_members, proofreading_contract_members.
-- Tạo role "partner" cho các đối tác (dịch giả, người hiệu đính) không phải nhân viên hệ thống.
-- Có thể chạy nhiều lần (idempotent).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tạo role "partner" (nếu chưa có)
-- -----------------------------------------------------------------------------
INSERT INTO public.roles (code, name, description)
VALUES ('partner', 'Đối tác', 'Đối tác tham gia dịch thuật/hiệu đính (có thể không phải nhân viên hệ thống)')
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Bảng translation_contract_members (translation_contracts ↔ users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.translation_contract_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    translation_contract_id uuid NOT NULL REFERENCES public.translation_contracts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text, -- Ví dụ: 'dich_gia_chinh', 'dich_gia_phu', 'dich_gia_kiem_tra'
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.translation_contract_members IS 'Bảng trung gian translation_contracts-users: ai là dịch giả/người tham gia hợp đồng dịch thuật.';
COMMENT ON COLUMN public.translation_contract_members.role IS 'Vai trò của người tham gia trong hợp đồng (vd: dịch giả chính, dịch giả phụ, người kiểm tra).';

CREATE INDEX IF NOT EXISTS idx_translation_contract_members_translation_contract_id 
    ON public.translation_contract_members(translation_contract_id);
CREATE INDEX IF NOT EXISTS idx_translation_contract_members_user_id 
    ON public.translation_contract_members(user_id);

DROP TRIGGER IF EXISTS translation_contract_members_updated_at ON public.translation_contract_members;
CREATE TRIGGER translation_contract_members_updated_at
    BEFORE UPDATE ON public.translation_contract_members
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Bảng proofreading_contract_members (proofreading_contracts ↔ users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proofreading_contract_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proofreading_contract_id uuid NOT NULL REFERENCES public.proofreading_contracts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text, -- Ví dụ: 'nguoi_hieu_dinh_chinh', 'nguoi_hieu_dinh_phu'
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.proofreading_contract_members IS 'Bảng trung gian proofreading_contracts-users: ai là người hiệu đính/người tham gia hợp đồng hiệu đính.';
COMMENT ON COLUMN public.proofreading_contract_members.role IS 'Vai trò của người tham gia trong hợp đồng (vd: người hiệu đính chính, người hiệu đính phụ).';

CREATE INDEX IF NOT EXISTS idx_proofreading_contract_members_proofreading_contract_id 
    ON public.proofreading_contract_members(proofreading_contract_id);
CREATE INDEX IF NOT EXISTS idx_proofreading_contract_members_user_id 
    ON public.proofreading_contract_members(user_id);

DROP TRIGGER IF EXISTS proofreading_contract_members_updated_at ON public.proofreading_contract_members;
CREATE TRIGGER proofreading_contract_members_updated_at
    BEFORE UPDATE ON public.proofreading_contract_members
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
