-- =============================================================================
-- KDPD: Migration – Xóa cột proofreader_name khỏi bảng proofreading_contracts
-- Chạy sau khi đã có bảng proofreading_contract_members.
-- Lý do: Thông tin người hiệu đính đã được lưu trong bảng proofreading_contract_members,
-- không cần lưu trùng trong proofreading_contracts nữa.
-- =============================================================================

-- Bước 1: Migrate dữ liệu từ proofreader_name sang proofreading_contract_members (nếu có)
-- Tìm hoặc tạo user với tên từ proofreader_name, sau đó tạo record trong proofreading_contract_members
DO $$
    DECLARE
    contract_rec RECORD;
    found_user_id uuid;
    partner_role_id uuid;
    new_user_id uuid;
    new_email text;
BEGIN
    -- Lấy role "partner"
    SELECT id INTO partner_role_id FROM public.roles WHERE code = 'partner' LIMIT 1;
    
    IF partner_role_id IS NULL THEN
        RAISE NOTICE 'Role "partner" chưa tồn tại. Vui lòng chạy migration tạo role "partner" trước.';
    END IF;
    
    -- Duyệt qua các hợp đồng có proofreader_name
    FOR contract_rec IN 
        SELECT id, proofreader_name 
        FROM public.proofreading_contracts 
        WHERE proofreader_name IS NOT NULL 
          AND TRIM(proofreader_name) != ''
          AND NOT EXISTS (
              SELECT 1 FROM public.proofreading_contract_members 
              WHERE proofreading_contract_id = proofreading_contracts.id
          )
    LOOP
        -- Tìm user với display_name khớp
        SELECT id INTO found_user_id 
        FROM public.users 
        WHERE LOWER(TRIM(display_name)) = LOWER(TRIM(contract_rec.proofreader_name))
        LIMIT 1;
        
        IF found_user_id IS NULL THEN
            -- Tạo user mới
            new_email := 'partner_' || gen_random_uuid()::text || '@system.local';
            INSERT INTO public.users (email, display_name, password_hash, is_active)
            VALUES (new_email, TRIM(contract_rec.proofreader_name), NULL, true)
            RETURNING id INTO new_user_id;
            
            -- Gán role "partner" nếu có
            IF partner_role_id IS NOT NULL THEN
                INSERT INTO public.user_roles (user_id, role_id)
                VALUES (new_user_id, partner_role_id)
                ON CONFLICT DO NOTHING;
            END IF;
            
            found_user_id := new_user_id;
        END IF;
        
        -- Tạo record trong proofreading_contract_members
        INSERT INTO public.proofreading_contract_members (
            proofreading_contract_id, 
            user_id, 
            role
        )
        VALUES (
            contract_rec.id,
            found_user_id,
            'nguoi_hieu_dinh'
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Đã migrate proofreader_name "%" cho hợp đồng %', 
            contract_rec.proofreader_name, contract_rec.id;
    END LOOP;
END $$;

-- Bước 2: Xóa cột proofreader_name
ALTER TABLE public.proofreading_contracts 
    DROP COLUMN IF EXISTS proofreader_name;

-- Bước 3: Cập nhật comment
COMMENT ON TABLE public.proofreading_contracts IS 'Hợp đồng hiệu đính (theo dõi hợp đồng hiệu đính). Thông tin người hiệu đính lưu trong bảng proofreading_contract_members.';
