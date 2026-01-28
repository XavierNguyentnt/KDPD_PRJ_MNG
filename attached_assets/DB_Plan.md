# Kế hoạch xây dựng cơ sở dữ liệu từ các bảng theo dõi công việc (Google Sheets)

> Nguồn: 4 file Google Sheets theo dõi CV. Mục tiêu: chuyển sang DB chuẩn (PostgreSQL) với schema thống nhất.

---

## 1. Danh sách 4 bảng Google Sheets

| # | Sheet ID | Link | Ghi chú |
|---|----------|------|--------|
| 1 | `11nTbFa9qawxEV6tQ32y739DgIur6ZVvdtPOvLW7JPFs` | [Mở](https://docs.google.com/spreadsheets/d/11nTbFa9qawxEV6tQ32y739DgIur6ZVvdtPOvLW7JPFs/edit?usp=sharing) | Bảng theo dõi 1 |
| 2 | `1G7nv-m2W64Z2RPf7i4gXuawh_mj42mRBD-_j3OmGnxw` | [Mở](https://docs.google.com/spreadsheets/d/1G7nv-m2W64Z2RPf7i4gXuawh_mj42mRBD-_j3OmGnxw/edit?usp=sharing) | Bảng theo dõi 2 |
| 3 | `1xBaoXjeZR7P9rmpB1GB6BQAgbLOYiMT4wGk5PaJseJo` | [Mở](https://docs.google.com/spreadsheets/d/1xBaoXjeZR7P9rmpB1GB6BQAgbLOYiMT4wGk5PaJseJo/edit?usp=sharing) | Bảng theo dõi 3 |
| 4 | `1EocmoQcjYbXBaleojrV7LLlgjZTjOvkyZxEb_bHJETM` | [Mở](https://docs.google.com/spreadsheets/d/1EocmoQcjYbXBaleojrV7LLlgjZTjOvkyZxEb_bHJETM/edit?usp=drive_link) | [Demo] THEO DÕI CV BAN THƯ KÝ |

**Gợi ý:** Mỗi file có thể tương ứng một **nhóm CV** (CV chung, Biên tập, Thiết kế + CNTT, Quét trùng lặp) hoặc nhiều tab trong một file. Cần xác định rõ: 1 file = 1 nhóm hay 1 file có nhiều tab = nhiều nhóm. Khi import vào DB, mỗi task sẽ có trường `source_sheet_id` + `source_sheet_name` (hoặc `group`) để truy vết nguồn.

---

## 2. Cấu trúc cột thống nhất từ Google Sheets (đã dùng trong code)

Dựa trên sheet **[Demo]_THEO DÕI CV BAN THƯ KÝ** và logic hiện tại trong `server/google-sheets.ts`:

| Cột Sheet (ví dụ) | Ánh xạ DB / Task field | Ghi chú |
|-------------------|-------------------------|--------|
| **A** Ngày nhập | `start_date` / `created_at` | Ngày tạo/nhập CV |
| **B** Nội dung công việc | `title` | Bắt buộc |
| **C** Phân loại nhóm CV | `role` hoặc `group` | Nhóm nghiệp vụ (CV chung, Biên tập, …) |
| **D** Mức ưu tiên | `priority` | Cao / Trung bình / Thấp |
| **E** Ngày Bắt đầu | `start_date` (nếu khác cột A) | Có thể trùng A |
| **F** Ngày kết thúc dự kiến | `due_date` | |
| **G** Nhân sự 1 | Workflow stage 1 `assignee` | BTV1 / Người thực hiện 1 |
| **H** Ngày nhận công việc (1) | Workflow stage 1 `startDate` | |
| **I** Ngày hoàn thành 1 | Workflow stage 1 `completedDate` | |
| **J** Nhân sự 2 | Workflow stage 2 `assignee` | BTV2 |
| **K** Ngày nhận công việc (2) | Workflow stage 2 `startDate` | |
| **L** Ngày hoàn thành 2 | Workflow stage 2 `completedDate` | |
| **M** Người kiểm soát/Phối hợp | Workflow stage 3 `assignee` | Đọc duyệt |
| **N** Ngày nhận công việc (3) | Workflow stage 3 `startDate` | |
| **O** Ngày hoàn thành 3 | Workflow stage 3 `completedDate` | |
| **P** Ngày HT Thực tế của cả công việc | `actual_completed_at` (mới) | Có thể thêm vào schema |
| **Q** TRẠNG THÁI CV | `status` | Đang tiến hành, Hoàn thành, … |
| **R** Đánh giá | `evaluation` hoặc `notes` | Có thể gộp vào `notes` |
| **S** Ghi chú | `notes` | |

Workflow nhiều bước (Nhân sự 1 → 2 → Kiểm soát) được lưu dạng JSON trong `tasks.workflow` (theo `shared/workflow.ts`).

---

## 3. Cấu trúc DB đề xuất (3 phần chính)

### I. Bảng `users` (người dùng / nhân sự)

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|--------|
| `id` | UUID hoặc serial | PK | |
| `email` | text | UNIQUE, NOT NULL | Đăng nhập, đồng bộ từ Google Contacts |
| `password_hash` | text | nullable | Null = chưa đặt mật khẩu |
| `display_name` | text | NOT NULL | Họ tên đầy đủ (Nhân sự 1, 2, Kiểm soát trong Sheet là tên hiển thị) |
| `first_name` | text | | Tách riêng nếu cần filter |
| `last_name` | text | | |
| `department` | text | | VD: BAN THƯ KÝ |
| `role` | text | | Admin / Manager / Employee |
| `employee_group` | text | nullable, chỉ dùng khi role = Employee | `thong_thuong` / `thu_ky_hop_phan` / `bien_tap` — phân quyền theo nhóm (xem mục 3.1) |
| `is_active` | boolean | default true | |
| `created_at` | timestamptz | | |
| `updated_at` | timestamptz | | |

**Nguồn dữ liệu:** Import từ `attached_assets/contacts.csv` (Google Contacts). Assignee trong Sheet (Nhân sự 1, 2, Người kiểm soát) map theo `display_name` hoặc email → `users.id`.

---

### II. Bảng `tasks` (công việc)

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|--------|
| `id` | text hoặc UUID | PK | Có thể giữ dạng `task-{timestamp}-{row}` khi migrate |
| `title` | text | NOT NULL | Nội dung công việc |
| `description` | text | | Hợp phần / Nhiệm vụ, mô tả ngắn |
| `assignee_id` | UUID / int | FK → users.id, nullable | Người phụ trách chính (sau khi có users) |
| `assignee` | text | | Tên hiển thị (giữ tạm khi chưa map user) |
| `role` | text | | Phân loại nhóm CV / vai trò nghiệp vụ |
| `group` | text | | Nhóm CV: CV chung, Biên tập, Thiết kế + CNTT, Quét trùng lặp |
| `status` | text | NOT NULL | TRẠNG THÁI CV: Đang tiến hành, Hoàn thành, Chưa bắt đầu, … |
| `priority` | text | NOT NULL | Mức ưu tiên |
| `start_date` | date hoặc text | | Ngày nhập / Ngày bắt đầu |
| `due_date` | date hoặc text | | Ngày kết thúc dự kiến |
| `actual_completed_at` | timestamptz | | Ngày HT thực tế (cột P) |
| `progress` | integer | default 0 | 0–100 |
| `notes` | text | | Ghi chú (+ Đánh giá nếu gộp) |
| `workflow` | jsonb hoặc text | | JSON workflow (BTV1, BTV2, Người đọc duyệt + ngày) |
| `source_sheet_id` | text | | Sheet ID nguồn (1 trong 4 ID trên) |
| `source_sheet_name` | text | | Tên tab (nếu có nhiều tab) |
| `created_at` | timestamptz | | |
| `updated_at` | timestamptz | | |

**Quan hệ:** `assignee_id` → `users.id`. Các bước workflow (Nhân sự 1, 2, Kiểm soát) có thể để trong `workflow` JSON; sau này nếu cần truy vấn theo người, có thể tách bảng `task_assignments` (task_id, user_id, stage_type, received_at, completed_at).

---

### III. Bảng `contracts` (hợp phần / hợp đồng – tùy chọn)

Nếu “Contracts” nghĩa là **hợp phần dự án** hoặc **gói công việc** (không phải hợp đồng pháp lý), có thể dùng để nhóm task:

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| `id` | UUID / serial | PK |
| `name` | text | Tên hợp phần / gói CV |
| `code` | text | Mã (nếu có) |
| `description` | text | |
| `start_date` | date | |
| `end_date` | date | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Khi đó `tasks` thêm cột `contract_id` (FK → contracts.id) nullable. Nếu chưa dùng hợp phần thì có thể bỏ qua bảng này ở giai đoạn đầu.

---

### 3.1 Phân nhóm Employee và quyền theo dõi/quản lý

Employee được chia thành **3 nhóm**; mỗi nhóm chỉ xem/quản lý đúng phạm vi nghiệp vụ:

| Nhóm Employee | Phạm vi theo dõi / quản lý |
|---------------|----------------------------|
| **Nhóm Thông thường** | Chỉ theo dõi công việc **chung của Ban Thư ký** (CV chung). |
| **Nhóm Thư ký hợp phần** | Quản lý và theo dõi: (1) công việc của **hợp phần dịch thuật** (Phật tạng toàn dịch, Phật tạng tinh yếu, Nho tạng, …), (2) **Hợp đồng Dịch thuật**, (3) **Hợp đồng Hiệu đính**. |
| **Nhóm Biên tập** | Theo dõi và quản lý: công việc, **hồ sơ**, **hợp đồng** liên quan đến **Biên tập**. |

**Gợi ý trong DB:** Bảng `users` thêm cột `employee_group` (hoặc `user_group`) kiểu text/enum: `'thong_thuong' | 'thu_ky_hop_phan' | 'bien_tap'`. Chỉ áp dụng khi `role = 'Employee'`; Admin/Manager không phụ thuộc nhóm này. BE dùng `employee_group` để filter task/contract/document theo quyền (middleware hoặc query scope).

---

### 3.2 Tư vấn: Có nên thêm bảng `documents` hay quản lý chung với Hợp đồng?

**Khuyến nghị: Nên tách hai bảng — `contracts` (hợp đồng) và `documents` (hồ sơ giấy tờ).**

#### Sự khác nhau về nghiệp vụ

| Khái niệm | Mô tả | Ví dụ |
|-----------|--------|-------|
| **Hợp đồng (contracts)** | Thỏa thuận có cấu trúc: bên A, bên B, loại hợp đồng, ngày ký, giá trị, trạng thái. | Hợp đồng Dịch thuật, Hợp đồng Hiệu đính. |
| **Hồ sơ giấy tờ (documents)** | File, dossier, giấy tờ đính kèm — có thể gắn với một hợp đồng, một công việc, hoặc đứng riêng. | Hồ sơ hợp đồng XYZ, bản scan hợp đồng, hồ sơ công việc biên tập, tài liệu đính kèm task. |

- **Hợp đồng** = một bản ghi nghiệp vụ (một “hợp đồng”) với các trường cố định (loại, bên, số tiền, ngày, trạng thái).
- **Hồ sơ** = từng “đơn vị” giấy tờ/file (một file, một dossier, một bản scan), có thể thuộc về một hợp đồng hoặc một công việc hoặc không gắn gì.

Một hợp đồng có thể có **nhiều hồ sơ** (bản scan, phụ lục, biên bản…). Một công việc cũng có thể có nhiều hồ sơ. Nếu gộp chung một bảng thì vừa lưu “hợp đồng” vừa lưu “từng file hồ sơ” sẽ trùng lặp và khó mở rộng (thêm trường riêng cho hợp đồng vs cho file).

#### Thiết kế đề xuất

- **Bảng `contracts`** (giữ như kế hoạch, bổ sung trường nghiệp vụ hợp đồng):
  - Dùng cho **hợp đồng** (Dịch thuật, Hiệu đính, hoặc loại khác): `id`, `code`, `type` (dịch_thuat / hieu_dinh / …), `party_a`, `party_b`, `signed_at`, `value`, `status`, `contract_scope` (hoặc `project_id` / hợp phần), `created_at`, `updated_at`.
  - `tasks` có thể có `contract_id` (FK → contracts) khi công việc gắn với một hợp đồng cụ thể.

- **Bảng `documents`** (bảng mới — hồ sơ giấy tờ):
  - Mỗi dòng = một file/dossier: `id`, `title`, `document_type` (scan, bản thảo, biên bản, …), `file_path` hoặc `storage_key` (đường dẫn/file lưu), `contract_id` (nullable, FK → contracts), `task_id` (nullable, FK → tasks), `uploaded_by` (user_id), `created_at`, `updated_at`.
  - Ý nghĩa:
    - **Hồ sơ hợp đồng:** `contract_id` khác null, `task_id` null (hoặc có nếu vừa gắn công việc).
    - **Hồ sơ công việc:** `task_id` khác null (hồ sơ biên tập, hồ sơ CV chung…).
    - **Hồ sơ đứng riêng:** cả hai null (giấy tờ chung, lưu trữ).

Như vậy:
- **Contracts** = quản lý “hợp đồng” (nghiệp vụ rõ ràng, dễ báo cáo theo loại/giá trị/trạng thái).
- **Documents** = quản lý “hồ sơ giấy tờ” (file/dossier), gắn với hợp đồng hoặc công việc khi cần, không trộn lẫn cấu trúc với hợp đồng.

#### So sánh nhanh

| Cách làm | Ưu | Nhược |
|----------|-----|--------|
| **Hai bảng: `contracts` + `documents`** | Rõ ràng: hợp đồng có trường riêng; hồ sơ có thể gắn contract/task; một hợp đồng nhiều hồ sơ; dễ mở rộng (version file, loại tài liệu). | Thêm một bảng và API. |
| **Một bảng chung (chỉ `contracts` hoặc chỉ `documents`)** | Ít bảng. | Hợp đồng phải lưu dạng “một dòng + nhiều file” trong cùng bảng → schema lẫn (vừa trường hợp đồng vừa trường file); hoặc mọi thứ đều là “document” thì thiếu cấu trúc chuẩn cho hợp đồng (bên, giá trị, ngày ký…). |

**Kết luận:** Nên **thêm bảng `documents`** để quản lý hồ sơ giấy tờ; **giữ bảng `contracts`** để quản lý hợp đồng. Hai bảng liên kết qua `documents.contract_id`; hồ sơ công việc liên kết qua `documents.task_id`. Phân quyền theo nhóm Employee (Thông thường / Thư ký hợp phần / Biên tập) áp dụng trên cả task, contract và document (filter theo `group`, `contract_scope`, hoặc `document_type`/nhóm nghiệp vụ tương ứng).

---

## 4. Chiến lược migrate từ 4 Sheets sang DB

### Bước 1: Chuẩn bị DB

- Tạo project PostgreSQL (vd. Neon), lấy `DATABASE_URL`.
- Định nghĩa schema Drizzle: `users`, `tasks` (và `contracts` nếu dùng).
- Chạy migration (`drizzle-kit push` hoặc `generate` + migrate).

### Bước 2: Import users

- Chạy script đọc `attached_assets/contacts.csv` → insert vào `users` (đã có kế hoạch trong `Docs/USER_DATABASE_PLAN.md`).

### Bước 3: Import tasks từ từng Sheet

- Với **mỗi một trong 4 Sheet**:
  - Gọi API (hoặc export CSV) lấy toàn bộ dòng dữ liệu (sau header).
  - Map theo bảng ánh xạ mục 2:
    - Cột → `title`, `status`, `priority`, `start_date`, `due_date`, `notes`, …
    - Cột Ngày HT Thực tế → `actual_completed_at`.
    - Nhân sự 1/2/Kiểm soát + ngày nhận/hoàn thành → build object workflow, ghi vào `workflow`.
  - Gán `source_sheet_id` = Sheet ID tương ứng, `source_sheet_name` = tên tab (nếu có).
  - Gán `group` theo quy ước (tên file/tab hoặc cấu hình cố định cho từng Sheet ID).
  - Assignee: nếu có bảng `users`, match tên trong Sheet với `users.display_name` (hoặc email) → điền `assignee_id`; không match thì để `assignee` (text) và `assignee_id` null.
- Insert từng task vào `tasks` (tránh trùng `id`: dùng `source_sheet_id + rowIndex` hoặc UUID).

### Bước 4: Cấu hình đa nguồn (4 Sheet)

- Hiện tại `SHEET_CONFIG` chỉ có 1 `sheetId`. Để hỗ trợ 4 file:
  - **Cách 1:** Giữ 1 `sheetId` mặc định cho “đọc/ghi chính”, thêm bảng cấu hình `sheet_sources`: `(id, sheet_id, sheet_name, group)` và khi “đồng bộ từ Sheets” thì lần lượt đọc 4 sheet, merge vào DB.
  - **Cách 2:** Đọc/ghi chính từ DB; chỉ dùng 4 Sheet làm nguồn import một lần (hoặc import định kỳ), không ghi ngược lại Sheet.
- Khuyến nghị: **Đọc/ghi chính từ DB**, 4 Sheet chỉ dùng để import ban đầu và (nếu cần) export báo cáo.

### Bước 5: Cập nhật BE/FE

- API task: đọc/ghi từ bảng `tasks` (và join `users` nếu cần tên assignee).
- Form task: dropdown assignee lấy từ `users`; lưu `assignee_id`.
- Filter theo nhóm: dùng `tasks.group` (và sau này có thể thêm filter theo `contract_id`).

---

## 5. Tóm tắt cấu trúc DB (theo file DB_Plan.md hiện tại)

| Thành phần | Mục đích |
|------------|----------|
| **I. Users** | Nhân sự (từ Google Contacts); đăng nhập, gán công việc (assignee). Thêm `employee_group` (thong_thuong / thu_ky_hop_phan / bien_tap) cho Employee để phân quyền theo nhóm. |
| **II. Tasks** | Công việc từ 4 bảng Sheets; workflow nhiều bước, nguồn sheet, assignee (text + FK user). |
| **III. Contracts** | Hợp đồng (Dịch thuật, Hiệu đính): cấu trúc nghiệp vụ (bên, loại, giá trị, ngày, trạng thái). Tasks có thể có `contract_id`. |
| **IV. Documents** | Hồ sơ giấy tờ (file/dossier): metadata file, gắn với `contract_id` (hồ sơ hợp đồng) hoặc `task_id` (hồ sơ công việc) hoặc đứng riêng. Tách riêng với Contracts. |

---

## 6. File và tài liệu liên quan

- **Schema hiện tại:** `shared/schema.ts` (tasks), `shared/workflow.ts` (workflow Biên tập).
- **Đọc/ghi Sheet:** `server/google-sheets.ts` (parseRowToTask, parseBienTapWorkflow, column mapping).
- **Kế hoạch users:** `Docs/USER_DATABASE_PLAN.md`.
- **Danh sách liên hệ:** `attached_assets/contacts.csv`.

Sau khi có DB và bảng `users`/`tasks`, bước tiếp theo có thể là: (1) thêm schema Drizzle cho `users` và cập nhật `tasks` (assignee_id, source_sheet_id, actual_completed_at), (2) viết script import lần lượt từ 4 Sheet vào `tasks`.

---

## 7. Gợi ý Backend (BE) cho dự án

Dự án đã có sẵn BE (Express + Drizzle + PostgreSQL). Gợi ý **giữ và mở rộng** stack hiện tại, phù hợp ~30 nhân sự và thao tác nghiệp vụ.

### 7.1 Stack BE đề xuất (giữ hiện tại)

| Thành phần | Công nghệ | Ghi chú |
|------------|-----------|--------|
| **Runtime** | Node.js (ESM) | Đã dùng `"type": "module"` |
| **Framework HTTP** | Express 5 | Đủ cho REST API, middleware, session |
| **Ngôn ngữ** | TypeScript | Type-safe, shared types với FE |
| **ORM / DB** | Drizzle ORM + `pg` | Schema trong `shared/schema.ts`, migration bằng drizzle-kit |
| **Database** | PostgreSQL (vd. Neon) | Đúng với kế hoạch DB (Users, Tasks, Contracts) |
| **Validation** | Zod + drizzle-zod | Đã dùng trong `shared/routes.ts` (input/response) |
| **Auth** | Passport + express-session | Đã có; session store: memorystore (dev) hoặc connect-pg-simple (prod) |
| **Build/Dev** | Vite (client) + tsx (server) | Giữ như hiện tại |

**Lý do:** Không cần đổi sang NestJS/Fastify/Hono vì quy mô nhỏ; Express + Drizzle đã đủ, dễ bảo trì và đồng bộ với FE (React, shared schema).

### 7.2 Cấu trúc thư mục BE (gợi ý)

```
server/
  index.ts           # Entry, Express app, middleware
  routes.ts           # Đăng ký route (tasks, sau này users, auth)
  storage.ts          # Abstraction: dùng DB (Drizzle)
  db.ts               # Kết nối Drizzle (PostgreSQL / Neon)
  static.ts           # Serve FE
  vite.ts             # Vite dev server
```

Sau khi chuyển nguồn dữ liệu sang DB, có thể tách thêm:

- `server/repositories/taskRepository.ts` — truy vấn bảng `tasks`
- `server/repositories/userRepository.ts` — truy vấn bảng `users`
- `server/middleware/auth.ts` — kiểm tra đăng nhập, phân quyền (Admin/Manager/Employee)

### 7.3 API REST (hiện tại + mở rộng)

- **Tasks:** `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`, `POST /api/tasks/refresh` — giữ nguyên.
- **Users (sau khi có bảng users):**  
  - `GET /api/users` — danh sách user (cho dropdown assignee, Admin/Manager).  
  - `GET /api/users/:id` — chi tiết user.  
  - `PATCH /api/users/:id` — cập nhật (Admin) hoặc profile (user đăng nhập).
- **Auth:**  
  - `POST /api/auth/login` — email + password, Passport local.  
  - `POST /api/auth/logout` — hủy session.  
  - `GET /api/auth/me` — user đang đăng nhập.

Validation: tiếp tục dùng Zod schema trong `shared/routes.ts` (hoặc file `shared/api.ts`) cho input/response.

### 7.4 Auth & Session

- **Session store:**  
  - Development: `memorystore` (đã có).  
  - Production: `connect-pg-simple` (đã có dependency) — lưu session vào PostgreSQL.
- **Passport:**  
  - Strategy `local` (email + password) cho login.  
  - Sau khi có `users`: serialize/deserialize `user.id` vào session.
- **Middleware:**  
  - `requireAuth`: nếu không có session → 401.  
  - `requireRole('Admin' | 'Manager')`: cho route quản lý user hoặc toàn bộ task.

### 7.5 Validation & xử lý lỗi

- **Input:** Dùng Zod schema (như `api.tasks.create.input`, `api.tasks.update.input`) trong route; lỗi validation trả 400 + message/field.
- **Lỗi nghiệp vụ:** 404 (task/user not found), 403 (forbidden).  
- **Lỗi server:** 500, không trả stack trace ra ngoài ở production.  
- Có thể chuẩn hóa response lỗi: `{ message, field?, code? }`.

### 7.6 Tóm tắt

- **Giữ:** Node.js + Express 5 + TypeScript + Drizzle + PostgreSQL + Zod + Passport + express-session.
- **Bổ sung khi chuyển sang DB:** repository layer (task, user), middleware auth, API users và auth; session store production = PostgreSQL (connect-pg-simple).
- **Không bắt buộc:** Đổi framework, thêm GraphQL, thêm queue (với ~30 user và thao tác nghiệp vụ thì REST + DB là đủ).
