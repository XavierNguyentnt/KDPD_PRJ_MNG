# Kế hoạch Cơ sở dữ liệu Người dùng & Nền tảng DB

> Chuyển từ Google Sheets sang nền tảng DB chuẩn (PostgreSQL), đồng bộ danh sách từ Google Contacts.

---

## 1. Gợi ý nền tảng DB online miễn phí

Với **~30 nhân sự** và nhu cầu **đơn giản, thao tác nghiệp vụ**, các lựa chọn phù hợp:

### 1.1 Neon (PostgreSQL) — **Ưu tiên số 1**

| Tiêu chí | Chi tiết |
|----------|----------|
| **Link** | https://neon.tech |
| **Free tier** | 0.5 GB storage, 10 projects, autoscaling compute |
| **Ưu điểm** | Postgres thuần, không cần thẻ tín dụng; tích hợp tốt với Drizzle/Node; có branching cho dev/test |
| **Phù hợp** | Đúng stack hiện tại (Express + Drizzle + `pg`), chỉ cần thay `DATABASE_URL` |

**Lý do chọn:** Dự án đã dùng PostgreSQL (Drizzle + `pg`). Neon cho free tier rộng rãi, không bị pause như một số dịch vụ, dễ scale sau này.

---

### 1.2 Supabase (PostgreSQL)

| Tiêu chí | Chi tiết |
|----------|----------|
| **Link** | https://supabase.com |
| **Free tier** | 500 MB DB, 2 projects (pause sau 1 tuần không dùng) |
| **Ưu điểm** | Có sẵn Auth, Realtime, Storage; giao diện quản lý dễ dùng |
| **Phù hợp** | Nếu sau này muốn dùng Supabase Auth thay Passport |

**Lưu ý:** Có thể dùng **chỉ Postgres** của Supabase (lấy connection string) với Drizzle, không bắt buộc dùng toàn bộ Supabase.

---

### 1.3 So sánh nhanh

| | Neon | Supabase |
|---|------|----------|
| Postgres thuần | ✅ | ✅ (có thể dùng thuần) |
| Free tier ổn định | ✅ | ⚠️ Pause nếu không dùng |
| Không cần thẻ | ✅ | ✅ |
| Phù hợp stack hiện tại | ✅ Rất tốt | ✅ Tốt |

**Kết luận:** Với yêu cầu “nền tảng chuẩn, DB + BE + FE”, **Neon** là lựa chọn cân bằng nhất: Postgres chuẩn, free đủ dùng, dễ kết nối với BE hiện tại.

---

## 2. Cấu trúc dữ liệu từ Google Contacts (contacts.csv)

### 2.1 Các cột trong file export

- **First Name, Middle Name, Last Name** → Họ tên đầy đủ
- **E-mail 1 - Value** → Email (dùng làm username / login)
- **Labels** → Nhãn (vd: BAN THƯ KÝ, THƯ KÝ HỢP PHẦN) → có thể dùng cho vai trò/phòng ban

### 2.2 Quy tắc ánh xạ sang User

- **Một người nhiều email:** Trong CSV có trường hợp cùng một người (vd: Dương Văn Hà) với 2 dòng, 2 email. Trong DB nên:
  - **1 user = 1 email chính** (ưu tiên email cơ quan `@vnu.edu.vn` hoặc `@...vtnt...`), hoặc
  - Cho phép 1 user nhiều email (bảng `user_emails`) — với ~30 người có thể đơn giản: 1 user 1 email.
- **Full name:** `display_name = [First] + [Middle] + [Last]`, bỏ khoảng trùng.
- **Labels:** Lưu vào `department` hoặc `role` (chuẩn hóa: BAN THƯ KÝ → department, THƯ KÝ HỢP PHẦN → role hoặc tag).

---

## 3. Schema cơ sở dữ liệu người dùng

### 3.1 Bảng `users`

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| `id` | UUID hoặc serial | PK |
| `email` | text, unique | Email chính (từ Contacts), dùng để đăng nhập |
| `password_hash` | text, nullable | Null = chưa đặt mật khẩu (invite flow) |
| `display_name` | text | Họ tên đầy đủ |
| `first_name` | text | Tên (optional, dùng cho filter/gọi tên) |
| `last_name` | text | Họ (optional) |
| `department` | text | Phòng ban (từ Labels, vd: BAN THƯ KÝ) |
| `role` | text | Vai trò hệ thống: Admin, Manager, Employee |
| `is_active` | boolean | Đang hoạt động hay đã tắt |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 3.2 Liên kết với `tasks`

- Hiện tại `tasks.assignee` đang là **text** (tên hoặc email).
- Sau khi có bảng `users`: nên thêm `tasks.assignee_id` (FK → `users.id`), giữ `assignee` (text) tạm để tương thích cũ hoặc dùng view/join để hiển thị tên.

### 3.3 Các bảng khác (tùy chọn, có thể làm sau)

- **Sessions** — đã dùng express-session; có thể lưu session vào DB (connect-pg-simple) khi dùng Postgres.
- **Audit log** — ai làm gì, khi nào (sau này nếu cần).

---

## 4. Lộ trình triển khai (gợi ý)

### Phase 1: Nền tảng DB + Users

1. **Tạo DB trên Neon**
   - Đăng ký Neon → tạo project → copy connection string (Postgres).
   - Đặt `DATABASE_URL` trong `.env` (và không commit file này).

2. **Định nghĩa schema Drizzle**
   - Thêm bảng `users` trong `shared/schema.ts`.
   - Thêm `assignee_id` (nullable) vào `tasks` nếu dùng FK.
   - Chạy migration: `npm run db:push` hoặc `drizzle-kit generate` + `migrate`.

3. **Script import contacts**
   - Script (Node/TS) đọc `attached_assets/contacts.csv`.
   - Chuẩn hóa: gộp trùng người (cùng First+Middle+Last), chọn 1 email chính/user.
   - Insert vào `users` (password_hash = null, role = Employee mặc định).

4. **API Backend**
   - `GET /api/users` — danh sách user (phân quyền: Admin/Manager xem hết).
   - `GET /api/users/:id` — chi tiết (cho assignee, profile).
   - Cập nhật task API: trả thêm thông tin user (display_name, email) khi có `assignee_id`.

### Phase 2: Đăng nhập & phân quyền

5. **Auth**
   - Giữ Passport (đã có trong project) + session.
   - Login bằng email + password; sau khi import, có thể “set password” lần đầu (invite link hoặc form đặt mật khẩu).
   - Middleware: chỉ cho phép user đã login; kiểm tra role (Admin/Manager/Employee) cho từng route.

6. **FE**
   - Trang login; sau khi login chuyển về dashboard.
   - Dropdown “Người thực hiện” trong task: lấy từ `GET /api/users` (id + display_name).
   - Trang quản lý user (Admin): danh sách, bật/tắt `is_active`, đổi role (nếu cần).

### Phase 3: Chuyển nguồn dữ liệu task

7. **Chuyển tasks từ Google Sheets sang DB**
   - Script đọc tasks từ Sheets (hoặc export CSV), map `assignee` (text) → `assignee_id` (tra theo email/display_name).
   - Insert vào bảng `tasks` trong Postgres.
   - Cập nhật BE: đọc/ghi task từ DB thay vì Sheets (có thể giữ Sheets làm backup/export tạm thời).

8. **Tắt phụ thuộc Sheets (optional)**
   - Sau khi ổn định, bỏ hoặc tùy chọn hóa việc đồng bộ Sheets; toàn bộ nghiệp vụ chạy trên DB.

---

## 5. Checklist nhanh

- [ ] Đăng ký Neon, tạo project, lấy `DATABASE_URL`
- [ ] Thêm bảng `users` (và cập nhật `tasks`) trong `shared/schema.ts`
- [ ] Chạy migration
- [ ] Viết script import `contacts.csv` → `users`
- [ ] API: GET users, GET user by id
- [ ] Cập nhật form task (FE): chọn assignee từ danh sách user
- [ ] Auth: login (email + password), middleware, phân quyền
- [ ] (Sau này) Chuyển tasks từ Sheets sang DB và chuyển BE sang dùng DB làm nguồn chính

---

## 6. File tham chiếu

- **Danh sách liên hệ:** `attached_assets/contacts.csv`
- **Schema hiện tại:** `shared/schema.ts`
- **DB connection:** `server/db.ts`
- **Drizzle config:** `drizzle.config.ts`

Nếu bạn chọn Neon, bước tiếp theo có thể là: (1) thêm bảng `users` vào `shared/schema.ts`, và (2) viết script đọc CSV và insert vào `users`. Bạn muốn bắt đầu từ bước schema hay từ script import contacts?
