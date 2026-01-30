# HƯỚNG DẪN REFACTOR & MIGRATION
## Áp dụng cho dự án KDPD_PRJ_MNG (giữ nguyên dữ liệu cũ)

Tài liệu này dùng để **chỉ đạo Cursor / AI Coding Agent** thực hiện chỉnh sửa code + CSDL hiện tại, dựa trên:
- Codebase đang có
- Database đang chạy (production hoặc staging)
- Yêu cầu bổ sung nghiệp vụ **Work – Contract – Task taxonomy**

Mục tiêu cao nhất:

> ✅ **Không phá dữ liệu cũ**  
> ✅ **Không dừng hệ thống**  
> ✅ **Cho phép chạy song song nghiệp vụ cũ & mới**

---

## I. Nguyên tắc CHỈ ĐẠO cho Cursor (bắt buộc tuân thủ)

Khi chỉnh sửa code / DB, Cursor phải tuân thủ:

1. ❌ KHÔNG xóa bảng cũ
2. ❌ KHÔNG rename bảng cũ
3. ❌ KHÔNG drop cột đang có dữ liệu
4. ✅ Chỉ **ADD bảng / ADD cột / ADD index**
5. ✅ Mọi logic mới phải **fallback an toàn** nếu dữ liệu mới chưa tồn tại

---

## II. Tổng quan kiến trúc SAU khi refactor

Hai trục song song:

### 1. Trục nghiệp vụ bền vững

- works
- translation_contracts
- proofreading_contracts
- editorial

### 2. Trục vận hành (giữ nguyên)

- tasks
- task_assignments
- comments
- attachments

`tasks` **KHÔNG bị thay thế**, chỉ được nâng cấp.

---

## III. Migration PHẦN 1 – Database Schema

### III.1. Thêm bảng `works`

```sql
CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT,
  title_vi TEXT,
  title_hannom TEXT,
  document_code TEXT,
  base_word_count INTEGER,
  base_page_count INTEGER,
  estimate_factor NUMERIC,
  estimate_word_count INTEGER,
  estimate_page_count INTEGER,
  note TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

---

### III.2. Thêm bảng `translation_contracts`

```sql
CREATE TABLE translation_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT,
  work_id UUID REFERENCES works(id),
  unit_price NUMERIC,
  contract_value NUMERIC,
  start_date DATE,
  end_date DATE,
  extension_start_date DATE,
  extension_end_date DATE,
  actual_completion_date DATE,
  actual_word_count INTEGER,
  actual_page_count INTEGER,
  completion_rate NUMERIC,
  settlement_value NUMERIC,
  note TEXT
);
```

---

### III.3. Thêm bảng `proofreading_contracts`

```sql
CREATE TABLE proofreading_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT,
  work_id UUID REFERENCES works(id),
  translation_contract_id UUID REFERENCES translation_contracts(id),
  proofreader_name TEXT,
  page_count INTEGER,
  rate_ratio NUMERIC,
  contract_value NUMERIC,
  start_date DATE,
  end_date DATE,
  actual_completion_date DATE,
  note TEXT
);
```

---

### III.4. Nâng cấp bảng `tasks`

❗ KHÔNG xóa cột cũ

```sql
ALTER TABLE tasks
ADD COLUMN task_type TEXT DEFAULT 'GENERAL',
ADD COLUMN related_work_id UUID NULL,
ADD COLUMN related_contract_id UUID NULL;

CREATE INDEX idx_tasks_related_work ON tasks(related_work_id);
CREATE INDEX idx_tasks_related_contract ON tasks(related_contract_id);
```

---

## IV. Migration PHẦN 2 – Dữ liệu cũ (KHÔNG bắt buộc nhưng KHUYẾN NGHỊ)

### IV.1. Mapping dữ liệu cũ → works (tùy chọn)

```sql
INSERT INTO works (title_vi, created_at)
SELECT DISTINCT d.title, now()
FROM documents d
WHERE d.title IS NOT NULL;
```

> ⚠️ Chỉ map **metadata tối thiểu**. Không suy diễn số chữ.

---

### IV.2. Mapping contracts cũ → translation_contracts (nếu cần)

```sql
INSERT INTO translation_contracts (contract_number, contract_value)
SELECT c.code, c.value
FROM contracts c
WHERE c.type = 'TRANSLATION';
```

> ⚠️ Các hợp đồng cũ **chỉ để tham chiếu**, không dùng quyết toán mới.

---

## V. Refactor Backend – HƯỚNG DẪN CHO CURSOR

### V.1. Task validation middleware

Pseudo-code:

```ts
if (task.relatedContractId) {
  assert(task.relatedWorkId);
  assert(task.type !== 'GENERAL' && task.type !== 'ADMIN');
}
```

---

### V.2. Không sửa logic task cũ

- Nếu `task_type` NULL → coi như `GENERAL`
- UI cũ vẫn chạy bình thường

---

## VI. UI Flow – Áp dụng từng bước

### Giai đoạn 1

- Hiển thị `task_type`
- Cho phép gắn `related_work_id` (optional)

### Giai đoạn 2

- Chỉ hiện `related_contract_id` khi `task_type` phù hợp

---

## VII. Checklist nghiệm thu (bắt buộc pass)

- [ ] Dữ liệu task cũ vẫn xem được
- [ ] Không có lỗi FK khi chưa dùng work
- [ ] Task GENERAL không gắn được hợp đồng
- [ ] Task DONE không cập nhật số tiền

---

## VIII. Chỉ dẫn cho Cursor (copy-paste nguyên khối)

> You are refactoring an existing production system.
>
> DO NOT remove existing tables, columns, or logic.
>
> ONLY add new tables, columns, indexes, and guarded logic.
>
> All new features must gracefully handle missing new data.
>
> Backward compatibility is mandatory.

---

## KẾT LUẬN

Tài liệu này đảm bảo:
- Cursor làm **đúng việc**
- Dev không phá dữ liệu
- Hệ thống nâng cấp **có kiểm soát**

> Đây là cách refactor **chuẩn dự án thật**, không phải demo.

