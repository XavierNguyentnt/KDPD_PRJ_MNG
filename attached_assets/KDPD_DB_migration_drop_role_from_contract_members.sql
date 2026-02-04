-- =============================================================================
-- KDPD: Migration – Xóa cột role khỏi translation_contract_members và proofreading_contract_members
-- Chạy sau khi đã đảm bảo role "partner" được lưu vào user_roles cho tất cả dịch giả và người hiệu đính.
-- Lý do: Role "partner" đã được lưu trong user_roles, không cần lưu trùng trong contract_members nữa.
-- =============================================================================

-- Bước 1: Đảm bảo tất cả users trong translation_contract_members và proofreading_contract_members có role "partner"
DO $$
DECLARE
    partner_role_id uuid;
    user_rec RECORD;
BEGIN
    -- Lấy role "partner"
    SELECT id INTO partner_role_id FROM public.roles WHERE code = 'partner' LIMIT 1;
    
    IF partner_role_id IS NULL THEN
        RAISE NOTICE 'Role "partner" chưa tồn tại. Vui lòng chạy migration tạo role "partner" trước.';
    ELSE
        -- Gán role "partner" cho tất cả users trong translation_contract_members chưa có role này
        FOR user_rec IN 
            SELECT DISTINCT user_id 
            FROM public.translation_contract_members
            WHERE user_id NOT IN (
                SELECT user_id FROM public.user_roles WHERE role_id = partner_role_id
            )
        LOOP
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (user_rec.user_id, partner_role_id)
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Đã gán role "partner" cho user %', user_rec.user_id;
        END LOOP;
        
        -- Gán role "partner" cho tất cả users trong proofreading_contract_members chưa có role này
        FOR user_rec IN 
            SELECT DISTINCT user_id 
            FROM public.proofreading_contract_members
            WHERE user_id NOT IN (
                SELECT user_id FROM public.user_roles WHERE role_id = partner_role_id
            )
        LOOP
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (user_rec.user_id, partner_role_id)
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Đã gán role "partner" cho user %', user_rec.user_id;
        END LOOP;
    END IF;
END $$;

-- Bước 2: Xóa cột role khỏi translation_contract_members
ALTER TABLE public.translation_contract_members 
    DROP COLUMN IF EXISTS role;

-- Bước 3: Xóa cột role khỏi proofreading_contract_members
ALTER TABLE public.proofreading_contract_members 
    DROP COLUMN IF EXISTS role;

-- Bước 4: Cập nhật comments
COMMENT ON TABLE public.translation_contract_members IS 'Bảng trung gian translation_contracts-users: ai là dịch giả/người tham gia hợp đồng dịch thuật. Role "partner" lưu trong user_roles.';
COMMENT ON TABLE public.proofreading_contract_members IS 'Bảng trung gian proofreading_contracts-users: ai là người hiệu đính/người tham gia hợp đồng hiệu đính. Role "partner" lưu trong user_roles.';
