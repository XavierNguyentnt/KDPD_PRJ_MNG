# Thiết kế Database cho Thông tin Dịch giả (Translator)

## Phân tích PA1: Lưu thông tin dịch giả trong bảng users

### Ưu điểm của PA1:
1. ✅ **Dữ liệu chỉ cần ghi một lần**: Tên dịch giả lưu trong `users`, dùng lại cho nhiều hợp đồng
2. ✅ **Hỗ trợ nhiều dịch giả**: Một hợp đồng dịch thuật có thể có nhiều dịch giả (qua bảng trung gian)
3. ✅ **Tái sử dụng**: Cùng một dịch giả có thể dùng cho hợp đồng Biên tập, hợp đồng Hiệu đính, v.v.
4. ✅ **Chuẩn hóa dữ liệu**: Tránh trùng lặp tên dịch giả

### Vấn đề hiện tại:
- Bảng `contract_members` chỉ tham chiếu `contracts.id`, không tham chiếu `translation_contracts.id`
- `translation_contracts` là bảng riêng, không có quan hệ trực tiếp với `contracts`

## Giải pháp đề xuất

### Option 1: Tạo bảng mới `translation_contract_members` (Khuyến nghị)

Tạo bảng mới tương tự `contract_members` nhưng dành riêng cho hợp đồng dịch thuật:

```sql
CREATE TABLE public.translation_contract_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    translation_contract_id uuid NOT NULL REFERENCES public.translation_contracts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text, -- Ví dụ: 'dich_gia_chinh', 'dich_gia_phu', 'dich_gia_kiem_tra'
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.translation_contract_members IS 'Bảng trung gian translation_contracts-users: ai là dịch giả của hợp đồng dịch thuật.';
COMMENT ON COLUMN public.translation_contract_members.role IS 'Vai trò của dịch giả trong hợp đồng (vd: dịch giả chính, dịch giả phụ).';

CREATE INDEX idx_translation_contract_members_translation_contract_id 
    ON public.translation_contract_members(translation_contract_id);
CREATE INDEX idx_translation_contract_members_user_id 
    ON public.translation_contract_members(user_id);
```

**Ưu điểm:**
- ✅ Tách biệt rõ ràng giữa `contracts` (hợp đồng chung) và `translation_contracts` (hợp đồng dịch thuật)
- ✅ Dễ mở rộng cho các loại hợp đồng khác (proofreading_contract_members, editing_contract_members, v.v.)
- ✅ Không ảnh hưởng đến cấu trúc hiện có

### Option 2: Mở rộng `contract_members` để hỗ trợ cả hai loại hợp đồng

Thêm cột `translation_contract_id` vào `contract_members`:

```sql
ALTER TABLE public.contract_members 
    ADD COLUMN translation_contract_id uuid REFERENCES public.translation_contracts(id) ON DELETE CASCADE;

-- Thêm constraint để đảm bảo chỉ một trong hai contract_id được set
ALTER TABLE public.contract_members 
    ADD CONSTRAINT contract_members_one_contract_check 
    CHECK (
        (contract_id IS NOT NULL AND translation_contract_id IS NULL) OR
        (contract_id IS NULL AND translation_contract_id IS NOT NULL)
    );

CREATE INDEX idx_contract_members_translation_contract_id 
    ON public.contract_members(translation_contract_id);
```

**Nhược điểm:**
- ⚠️ Làm phức tạp bảng `contract_members`
- ⚠️ Cần sửa nhiều code hiện có

## Quy trình triển khai PA1

### Bước 1: Tạo role "Translator" trong bảng `roles`

```sql
INSERT INTO public.roles (code, name, description)
VALUES ('translator', 'Dịch giả', 'Dịch giả tham gia dịch thuật (không phải người dùng hệ thống)')
ON CONFLICT (code) DO NOTHING;
```

### Bước 2: Tạo user cho dịch giả (không có password)

Khi người dùng nhập tên dịch giả trong form:
1. Kiểm tra xem đã có user với `display_name` tương ứng chưa
2. Nếu chưa có, tạo user mới:
   - `email`: có thể dùng format `translator_<uuid>@system.local` hoặc để NULL
   - `password_hash`: NULL (không có mật khẩu)
   - `display_name`: tên dịch giả
   - `is_active`: true
3. Gán role "Translator" cho user này trong `user_roles`

### Bước 3: Liên kết dịch giả với hợp đồng dịch thuật

Khi lưu hợp đồng dịch thuật:
1. Lưu thông tin hợp đồng vào `translation_contracts`
2. Tạo record trong `translation_contract_members` để liên kết dịch giả với hợp đồng

## Schema Drizzle (nếu chọn Option 1)

Thêm vào `shared/schema.ts`:

```typescript
export const translationContractMembers = pgTable("translation_contract_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  translationContractId: uuid("translation_contract_id")
    .notNull()
    .references(() => translationContracts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

## API Endpoints cần thêm (nếu chọn Option 1)

- `GET /api/translation-contracts/:id/members` - Lấy danh sách dịch giả của hợp đồng
- `POST /api/translation-contract-members` - Thêm dịch giả vào hợp đồng
- `DELETE /api/translation-contract-members/:id` - Xóa dịch giả khỏi hợp đồng

## Gợi ý cải tiến Form

Hiện tại form chỉ có một ô nhập tên dịch giả. Để hỗ trợ nhiều dịch giả, có thể:

1. **Hiện tại**: Ô nhập text đơn giản (đã thêm)
2. **Tương lai**: 
   - Autocomplete/Select dropdown với danh sách dịch giả có sẵn
   - Cho phép thêm nhiều dịch giả (multi-select hoặc list với nút "Thêm")
   - Khi nhập tên mới, tự động tạo user mới với role Translator

## Kết luận

**Khuyến nghị: Option 1** - Tạo bảng `translation_contract_members` mới vì:
- Tách biệt rõ ràng, dễ bảo trì
- Không ảnh hưởng code hiện có
- Dễ mở rộng cho các loại hợp đồng khác
- Phù hợp với kiến trúc hiện tại của hệ thống
