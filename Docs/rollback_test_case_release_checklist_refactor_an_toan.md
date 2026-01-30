# ROLLBACK PLAN · TEST CASE · RELEASE CHECKLIST
## Áp dụng cho refactor Work – Contract – Task (giữ dữ liệu cũ)

Tài liệu này dùng làm **lưới an toàn cuối cùng** khi Cursor hoặc dev triển khai refactor trên hệ thống đang chạy.

Mục tiêu:
- Có đường **quay lui an toàn** nếu migration lỗi
- Có **test case nghiệp vụ bắt buộc** để Cursor tự kiểm tra
- Có **checklist release production** tránh sự cố chết người

---

# PHẦN I – 🔒 ROLLBACK PLAN CHI TIẾT (SQL + CODE)

## I.1. Nguyên tắc rollback

1. Rollback **KHÔNG được làm mất dữ liệu cũ**
2. Rollback **KHÔNG phụ thuộc dữ liệu mới**
3. Rollback phải thực hiện được **ngay cả khi code mới đã deploy**

---

## I.2. Rollback Database (SQL)

### 1️⃣ Trường hợp migration CHƯA chạy data migration

👉 An toàn tuyệt đối – chỉ cần **ẩn bảng mới**

```sql
-- Không DROP ngay, chỉ đổi schema nếu cần
ALTER TABLE works RENAME TO works__rollback;
ALTER TABLE translation_contracts RENAME TO translation_contracts__rollback;
ALTER TABLE proofreading_contracts RENAME TO proofreading_contracts__rollback;
```

> Lý do: rename nhanh, không mất dữ liệu, có thể restore tức thì.

---

### 2️⃣ Trường hợp đã ADD cột vào `tasks`

👉 Không rollback cột, chỉ rollback code

```sql
-- KHÔNG DROP COLUMN
-- Chỉ đảm bảo các cột mới không được dùng
SELECT task_type, related_work_id, related_contract_id FROM tasks LIMIT 1;
```

> Các cột nullable, không ảnh hưởng logic cũ → không cần can thiệp.

---

### 3️⃣ Trường hợp đã migrate dữ liệu sang `works`

👉 Rollback logic, **KHÔNG rollback data**

```sql
-- Giữ nguyên bảng works để dùng lại sau
SELECT COUNT(*) FROM works;
```

> Nguyên tắc: data mới không phá data cũ → không cần xóa.

---

## I.3. Rollback Code

### Backend

- Disable feature flag:

```ts
FEATURE_WORK_ENABLED = false
```

- Bypass middleware validate task:

```ts
if (!FEATURE_WORK_ENABLED) return next();
```

---

### Frontend

- Ẩn UI mới bằng flag
- Không xóa component

---

## I.4. Điều TUYỆT ĐỐI KHÔNG làm khi rollback

❌ DROP TABLE  
❌ DROP COLUMN  
❌ DELETE DATA  

Rollback là **tắt tính năng**, không phải dọn dẹp.

---

# PHẦN II – 🧪 TEST CASE NGHIỆP VỤ BẮT BUỘC

## II.1. Test Case – Task (Backward Compatibility)

### TC-01: Task cũ vẫn hoạt động

- GIVEN: task được tạo trước migration
- WHEN: load task
- THEN: không lỗi, task_type = GENERAL

---

### TC-02: Task GENERAL không gắn hợp đồng

- GIVEN: task_type = GENERAL
- WHEN: set related_contract_id
- THEN: bị reject

---

## II.2. Test Case – Work & Contract

### TC-03: Tạo Work không sinh task

- GIVEN: tạo works mới
- THEN: không có task tự sinh

---

### TC-04: Tạo hợp đồng dịch thuật

- GIVEN: work tồn tại
- WHEN: tạo translation_contract
- THEN: contract_value = unit_price × estimate_page_count

---

## II.3. Test Case – Task & Contract Interaction

### TC-05: Task TRANSLATION được gắn hợp đồng

- GIVEN: task_type = TRANSLATION
- WHEN: gắn translation_contract_id
- THEN: thành công

---

### TC-06: DONE task không ảnh hưởng quyết toán

- GIVEN: task DONE
- THEN: settlement_value không đổi

---

## II.4. Test Case – Regression

### TC-07: UI cũ không bị thay đổi

- GIVEN: user không dùng module Work
- THEN: UI không khác trước

---

# PHẦN III – 📦 CHECKLIST RELEASE PRODUCTION

## III.1. Trước khi release

- [ ] Backup DB (snapshot)
- [ ] Migration chạy trên staging
- [ ] Pass toàn bộ test case
- [ ] Feature flag OFF mặc định

---

## III.2. Khi release

- [ ] Deploy DB migration trước
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] BẬT feature flag cho admin trước

---

## III.3. Sau release

- [ ] Theo dõi error log 24h
- [ ] Không DROP bảng mới trong 7 ngày
- [ ] Thu feedback người dùng

---

## III.4. Dấu hiệu cần rollback ngay

- Lỗi tạo task
- Lỗi truy cập hợp đồng cũ
- UI trắng / crash

👉 **Rollback code trước – DB sau**

---

## KẾT LUẬN

> Nếu làm đúng tài liệu này:
> - Không có migration nào là "không quay đầu"
> - Không có release nào là "đánh bạc"

Đây là bộ **đai an toàn cấp dự án thật**, không phải lý thuyết.

