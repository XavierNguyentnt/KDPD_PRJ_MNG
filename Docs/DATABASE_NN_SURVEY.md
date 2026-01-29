# Khảo sát CSDL và quan hệ n-n – Đề xuất bảng trung gian

Dựa trên backup CSDL `2026.01.29. neon_backup.sql` và schema hiện tại (public: users, tasks, contracts, documents).

---

## 1. Schema hiện tại (public)

| Bảng       | Mô tả ngắn | Quan hệ hiện tại |
|-----------|------------|-------------------|
| **users** | Nhân sự    | —                 |
| **tasks** | Công việc  | Chỉ thông tin task-level (title, status, priority, group, progress, workflow, contract_id). Người giao / ngày nhận-hoàn thành ở **task_assignments**. |
| **task_assignments** | Gán việc (users–tasks) | task_id → tasks, user_id → users; mỗi dòng = 1 user, 1 task, received_at, due_date, completed_at, stage_type, round_number. |
| **contracts** | Hợp đồng | —                 |
| **documents** | Hồ sơ/tài liệu | contract_id → contracts, task_id → tasks, uploaded_by → users (đều 1-n) |

---

## 2. Các trường hợp quan hệ n-n cần bảng trung gian

### 2.1. Users ↔ Tasks (1 nhân sự làm nhiều tasks, 1 task có nhiều nhân sự)

**Hiện trạng:**

- `tasks.assignee_id` chỉ lưu **một** user → quan hệ 1-1.
- Workflow (jsonb) lưu nhiều “stage” (BTV1, BTV2, Người đọc duyệt), mỗi stage có: assignee (tên), startDate, dueDate, completedDate → thực chất là **nhiều người** và **nhiều cặp “ngày nhận / ngày hoàn thành dự kiến”** cho một task, nhưng đang lưu dạng JSON, khó query và không chuẩn hóa.

**Đề xuất: bảng trung gian `task_assignments` (users–tasks + ngày nhận / ngày hoàn thành)**

Mỗi dòng = **một lần giao việc** (1 user + 1 task + 1 vai trò/giai đoạn + 1 cặp ngày nhận / ngày hoàn thành dự kiến / ngày hoàn thành thực tế).

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| id | uuid | PK |
| task_id | text | FK → tasks(id) |
| user_id | uuid | FK → users(id) |
| stage_type | text | BTV1 / BTV2 / doc_duyet (hoặc role trong task) |
| round_number | integer | Số vòng (1, 2, …) nếu task có nhiều round |
| received_at | date | **Ngày nhận công việc** |
| due_date | date | **Ngày hoàn thành dự kiến** |
| completed_at | timestamp | Ngày hoàn thành thực tế (nullable) |
| status | text | not_started / in_progress / completed / cancelled |
| progress | integer | 0–100 |
| notes | text | Ghi chú cho lần giao này |
| created_at, updated_at | timestamptz | |

- **Ràng buộc duy nhất:** (task_id, user_id, stage_type, round_number) để tránh trùng lặp.
- **Kết quả:** 1 task có nhiều dòng (nhiều user, nhiều round/stage), mỗi dòng có đúng một bộ “ngày nhận / ngày hoàn thành dự kiến / ngày hoàn thành thực tế” → giải quyết “1 task có nhiều ngày nhận và nhiều ngày hoàn thành dự kiến” và “1 task nhiều nhân sự”.

**Sau khi có bảng này:**

- Các trường **assignee_id, assignee, role, start_date, due_date, actual_completed_at** đã chuyển khỏi bảng `tasks` sang `task_assignments` (migration **KDPD_DB_migration_tasks_drop_assignment_columns.sql**). Bảng `tasks` chỉ còn thông tin task-level (title, status, priority, group, progress, workflow, contract_id, …); người giao và ngày nhận/hoàn thành quản lý qua `task_assignments`.
- `stage_type` có thể là **primary** (gán việc đơn từ dữ liệu cũ), **btv1**, **btv2**, **doc_duyet**.
- Workflow (jsonb) có thể chỉ còn metadata; dữ liệu “ai làm, ngày nào” lấy từ `task_assignments`.

---

### 2.2. Contracts ↔ Users (1 hợp đồng nhiều người phụ trách, 1 user nhiều hợp đồng)

**Hiện trạng:** `contracts` không có FK tới users → không lưu “ai phụ trách / tham gia hợp đồng”.

**Đề xuất (nếu cần): bảng trung gian `contract_members`**

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| id | uuid | PK |
| contract_id | uuid | FK → contracts(id) |
| user_id | uuid | FK → users(id) |
| role | text | Vai trò: phụ_trách_chính, tham_gia, … |
| created_at, updated_at | timestamptz | |

- **Ràng buộc duy nhất:** (contract_id, user_id) hoặc (contract_id, user_id, role) tùy cho phép 1 user nhiều vai trò trên 1 contract hay không.

---

### 2.3. Documents ↔ Tasks / Documents ↔ Contracts

**Hiện trạng:** Mỗi document có **một** contract_id **hoặc** **một** task_id → quan hệ 1-n (một contract/nhiều doc, một task/nhiều doc). Không có n-n.

**Bảng trung gian đã tạo (trong KDPD_DB_migration_nn_tables.sql):**

- **document_tasks:** (document_id, task_id, role, note) — 1 tài liệu gắn nhiều tasks.
- **document_contracts:** (document_id, contract_id, role, note) — 1 tài liệu gắn nhiều hợp đồng.

---

### 2.4. Task – nhiều “cặp ngày” (ngày nhận / ngày hoàn thành dự kiến)

**Đã giải quyết trong 2.1:** Mỗi cặp ngày gắn với **một lần giao** (user + stage + round) trong bảng `task_assignments`: received_at, due_date, completed_at. Một task có nhiều cặp vì có nhiều dòng (nhiều user và/hoặc nhiều round/stage).

### 2.5. Department / Groups / Roles (1 department, nhiều groups, nhiều roles)

**Quy tắc:** **Department:** 1 nhân sự chỉ thuộc **một** department (vd: Ban Thư ký) → giữ cột `users.department`. **Groups:** 1 nhân sự có thể thuộc **nhiều nhóm** (vd: vừa Biên tập vừa Thư ký hợp phần) → bảng **groups** + **user_groups**. **Roles:** 1 nhân sự có thể có **nhiều vai trò** → bảng **roles** + **user_roles**. Phân role phục vụ phân quyền: quyền truy cập, xem, sửa task sau này.

**Bảng đã tạo (KDPD_DB_migration_user_groups_roles.sql):** **groups** (code, name), **user_groups** (user_id, group_id), **roles** (code, name), **user_roles** (user_id, role_id). Seed: nhóm cv_chung, bien_tap, thiet_ke_cntt, quet_trung_lap, thu_ky_hop_phan, thong_thuong và vai trò admin, manager, employee. Migration dữ liệu từ users.employee_group / users.role: **KDPD_DB_migrate_users_to_groups_roles.sql**.

---

## 3. Tóm tắt đề xuất bảng trung gian

| Quan hệ | Bảng trung gian đề xuất | Ưu tiên | Ghi chú |
|---------|-------------------------|--------|--------|
| Users ↔ Tasks + “nhiều ngày nhận / ngày hoàn thành” | **task_assignments** | Cao | Thay thế/dùng kèm workflow jsonb; mỗi dòng = 1 user, 1 task, 1 stage/round, 1 bộ received_at / due_date / completed_at |
| Contracts ↔ Users | **contract_members** | Trung bình | Chỉ thêm khi cần “ai phụ trách / tham gia hợp đồng” |
| Documents ↔ Tasks | **document_tasks** | Đã tạo | document_id, task_id, role, note |
| Documents ↔ Contracts | **document_contracts** | Đã tạo | document_id, contract_id, role, note |
| Users ↔ Groups | **user_groups** | Đã tạo | 1 user nhiều nhóm (groups + user_groups) |
| Users ↔ Roles | **user_roles** | Đã tạo | 1 user nhiều vai trò (roles + user_roles), phục vụ phân quyền |

---

## 4. Thứ tự triển khai gợi ý

1. **task_assignments:** Tạo bảng, thêm FK task_id → tasks, user_id → users; migration dữ liệu từ workflow (jsonb) sang task_assignments (script parse rounds/stages, map assignee tên → user_id nếu có). Cập nhật API và UI đọc/ghi từ task_assignments (và có thể vẫn ghi thêm workflow để tương thích).
2. **contract_members:** Triển khai khi product yêu cầu “gán người vào hợp đồng”.
3. **document_tasks / document_contracts:** Triển khai khi có yêu cầu “một tài liệu gắn nhiều task/hợp đồng”.

---

## 5. SQL đã tạo (áp dụng điều chỉnh)

Các file trong **attached_assets/**:

1. **KDPD_DB_migration_nn_tables.sql**  
   - Tạo bảng **task_assignments** (users–tasks + ngày nhận / ngày hoàn thành), indexes, trigger `updated_at`.  
   - Tạo bảng **contract_members**, **document_tasks**, **document_contracts**.  
   - Có thể chạy nhiều lần (idempotent).

2. **KDPD_DB_migrate_workflow_to_assignments.sql**  
   - Chạy **sau** file 1.  
   - Chuyển dữ liệu từ `tasks.workflow` (jsonb) sang `task_assignments`: parse rounds/stages, map assignee (tên) → `users.display_name` để lấy `user_id`.  
   - Dùng `ON CONFLICT DO NOTHING` nên có thể chạy nhiều lần.

3. **KDPD_DB_migration_tasks_drop_assignment_columns.sql**  
   - Chạy **sau** file 1 (và tùy chọn file 2).  
   - Backfill **task_assignments** từ các task còn có `assignee_id` nhưng chưa có dòng assignment (stage_type = **primary**).  
   - **DROP** khỏi bảng **tasks** các cột: assignee_id, assignee, role, start_date, due_date, actual_completed_at.  
   - Sau bước này, thông tin “người giao / ngày nhận / ngày hoàn thành” chỉ còn ở **task_assignments**.

4. **KDPD_DB_migration_user_groups_roles.sql**  
   - Tạo bảng **groups**, **user_groups**, **roles**, **user_roles** (1 user nhiều nhóm, nhiều vai trò; phục vụ phân quyền).  
   - Seed nhóm (cv_chung, bien_tap, thiet_ke_cntt, quet_trung_lap, thu_ky_hop_phan, thong_thuong) và vai trò (admin, manager, employee).  
   - Ghi chú cột `users.department`, `users.employee_group`, `users.role`.  
   - Có thể chạy nhiều lần (idempotent).

5. **KDPD_DB_migrate_users_to_groups_roles.sql**  
   - Chạy **sau** file 4.  
   - Gán user vào nhóm/vai trò từ `users.employee_group` và `users.role` (user_groups, user_roles).  
   - `ON CONFLICT DO NOTHING` nên có thể chạy nhiều lần.

**Thứ tự trên Neon:** (1) `KDPD_DB_migration_nn_tables.sql` → (2) `KDPD_DB_migrate_workflow_to_assignments.sql` (tùy chọn) → (3) `KDPD_DB_migration_tasks_drop_assignment_columns.sql` → (4) `KDPD_DB_migration_user_groups_roles.sql` → (5) `KDPD_DB_migrate_users_to_groups_roles.sql`.

---

**Tóm tắt:** Các quan hệ n-n đã khảo sát gồm **(1) users–tasks kèm nhiều ngày nhận/ngày hoàn thành** → bảng **task_assignments**; **(2) contracts–users** → **contract_members** (tùy nhu cầu); **(3) documents–tasks/contracts** → chỉ thêm bảng trung gian khi thực sự cần 1 document gắn nhiều task hoặc nhiều contract.

---

## Loại bông và round_number (tham chiếu UI)

- **Loại bông:** Được quy định trong bảng **tasks**, cột **workflow** (jsonb). Cấu trúc: `workflow.rounds[].roundType`. Mỗi vòng (round) có một giá trị "Loại bông", ví dụ: Tiền biên tập, Bông thô, Bông 1 (thô), Bông 2 (thô), Bông chuyển in, … Trên UI: dropdown "Loại bông" trong task-dialog Biên tập; thay đổi được lưu vào `tasks.workflow` khi tạo/cập nhật task.

- **round_number (task_assignments):** Đại diện **số vòng** trong quy trình Biên tập (1, 2, …). Trên UI (workflow-view): khi không có roundType thì hiển thị "Đọc bông 1", "Đọc bông 2", … tương ứng `round_number = 1`, `2`, …

---

## users: vai trò và nhóm — nguồn duy nhất user_roles, user_groups

- **Đã bỏ** cột `users.role` và `users.employee_group` (migration `KDPD_DB_migration_users_roles_groups_only.sql`). Nguyên tắc đơn nhất: vai trò và nhóm của user **chỉ** lấy từ bảng trung gian **user_roles** và **user_groups** (một user có thể có nhiều role, nhiều group).
- **user_roles** (user_id, role_id) → **roles** (id, code, name). **user_groups** (user_id, group_id) → **groups** (id, code, name).
- API GET /api/users và GET /api/users/:id trả về user kèm `roles[]` và `groups[]` (từ join user_roles/user_groups). PATCH /api/users/:id nhận `roleIds: string[]` và `groupIds: string[]`; server ghi đè toàn bộ dòng user_roles/user_groups của user đó. UI admin-users: multi-select vai trò và nhóm nhân sự, gửi mảng id.
