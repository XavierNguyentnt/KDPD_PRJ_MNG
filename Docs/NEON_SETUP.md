# Cài đặt Neon (PostgreSQL) cho KDPD

Hướng dẫn theo [Neon – Connecting to your stack](https://neon.com/docs/get-started/connect-neon).

---

## 1. Lấy connection string từ Neon

1. Đăng nhập [Neon Console](https://console.neon.tech).
2. Mở **Project Dashboard** của project (ví dụ KDPD_DB).
3. Bấm nút **Connect** để mở **Connection Details**.
4. Chọn **branch**, **database**, **role** (thường dùng branch mặc định, database `neondb`, role mặc định).
5. Copy **connection string** hiển thị, dạng:

   ```text
   postgresql://alex:AbC123dEf@ep-cool-darkness-a1b2c3d4.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

   Trong đó:
   - `alex` = role (user)
   - `AbC123dEf` = password
   - `ep-...neon.tech` = hostname
   - `neondb` = tên database

**Lưu ý:** Neon hỗ trợ **pooled** và **direct** connection. Nếu app tạo nhiều kết nối đồng thời, dùng connection string có `-pooler` trong hostname (xem [Connection pooling](https://neon.com/docs/connect/connection-pooling)).

---

## 2. Cấu hình trong project

1. Tạo file **`.env`** ở **thư mục gốc** project (cùng cấp với `package.json`).
2. Thêm biến môi trường:

   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

   Thay toàn bộ chuỗi bằng **connection string** vừa copy từ Neon (giữ nguyên `?sslmode=require`).

3. **Không commit** file `.env` (đã có trong `.gitignore`).

---

## 3. Chạy schema và seed (lần đầu)

1. Trên Neon, mở **SQL Editor** cho project/branch/database tương ứng.
2. Tắt **Explain** / **Analyze** nếu đang bật.
3. Chạy lần lượt:
   - **Schema:** nội dung file `attached_assets/KDPD_DB_schema.sql` (tạo bảng `users`, `contracts`, `tasks`, `documents`, `session` nếu dùng connect-pg-simple).
   - **Seed users:** `attached_assets/KDPD_DB_seed_users.sql` (28 user từ contacts, mật khẩu mặc định `123456`).
   - **Admin:** `attached_assets/KDPD_DB_seed_admin.sql` (tài khoản admin: `admin@kdpd.local` / `Admin01092016@`).

---

## 4. Kiểm tra kết nối

1. Chạy server:

   ```bash
   npm run dev
   ```

2. Trong log server, nếu thấy dòng kiểu **"Database connection initialized"** thì `DATABASE_URL` đã được đọc và kết nối Neon thành công.
3. Đăng nhập app với `admin@kdpd.local` / `Admin01092016@` để xác nhận auth và DB hoạt động.

---

## 5. Kiểm tra user admin đã có trong DB chưa

Trên Neon SQL Editor, chạy:

```sql
SELECT id, email, display_name, role FROM users WHERE email = 'admin@kdpd.local';
```

- Nếu **không có dòng nào**: chạy `attached_assets/KDPD_DB_seed_admin.sql` (tắt Explain/Analyze).
- Nếu **có dòng**: đăng nhập với **admin@kdpd.local** / **Admin01092016@** (đúng chữ hoa/thường).

Khi chạy `npm run dev`, nếu login thất bại, server sẽ in log (chỉ trong development):
- `[auth] Login failed: no user for email ...` → chưa có user, cần chạy seed admin.
- `[auth] Login failed: wrong password for ...` → sai mật khẩu; admin: **Admin01092016@**, seed users: **123456**.

---

## 6. Xử lý lỗi "Invalid email or password"

- **Đảm bảo đã chạy seed trên Neon:** Trong SQL Editor, chạy lần lượt `KDPD_DB_schema.sql` → `KDPD_DB_seed_users.sql` → `KDPD_DB_seed_admin.sql` (tắt Explain/Analyze).
- **Tài khoản admin:** Email `admin@kdpd.local`, mật khẩu `Admin01092016@` (đúng chữ hoa/thường và ký tự đặc biệt).
- **Tài khoản từ seed users:** Bất kỳ email nào trong file seed (ví dụ `ngatt.vtnt@vnu.edu.vn`), mật khẩu `123456`.
- Nếu vẫn lỗi: Kiểm tra trong Neon SQL Editor có bảng `users` và có dòng `email = 'admin@kdpd.local'` (sau khi chạy seed admin).
- **Đã chạy seed admin cũ (hash bcrypt bị thiếu `$` đầu):** Nếu server log báo "wrong password" nhưng mật khẩu đúng, có thể hash trong DB sai. Trên Neon SQL Editor chạy một lần:

  ```sql
  UPDATE users
  SET password_hash = $pwd$$2b$10$Qw2yKYN4QZOOKU5LRpQABOGbTB1RKc0FGM9QoUNmgdnhQXPK2KWMO$pwd$
  WHERE email = 'admin@kdpd.local';
  ```

  Sau đó thử đăng nhập lại **admin@kdpd.local** / **Admin01092016@**.

- **Tài khoản seed users (123456) cũng không đăng nhập được:** Các hash từ seed cũ (dùng `$$...$$`) bị thiếu `$` đầu. Chạy một lần file `attached_assets/KDPD_DB_fix_password_hashes.sql` trên Neon SQL Editor — script sẽ thêm `$` vào đầu mọi `password_hash` đang bắt đầu bằng `2b$10$` (admin đã đúng thì không bị sửa). Sau đó thử đăng nhập với bất kỳ email seed users + mật khẩu **123456**.

---

## 7. Tải xuống / xuất dữ liệu từ Neon

Có thể lấy dữ liệu từ Neon bằng: **pg_dump** (dòng lệnh, full backup), **pgAdmin 4** (giao diện, backup hoặc xuất CSV), hoặc **Neon SQL Editor** (xuất từng bảng/query trên web).

### 7.1. Dùng pg_dump (backup toàn bộ database)

**Yêu cầu:** Cài [PostgreSQL client tools](https://www.postgresql.org/download/) (trên Windows có thể dùng [pg_dump từ EDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads) hoặc dùng WSL). **Phiên bản pg_dump phải bằng hoặc cao hơn phiên bản PostgreSQL trên server** — Neon thường dùng PostgreSQL 17, nên cần **pg_dump 17 trở lên** (nếu lỗi "server version mismatch", xem mục 7.3 bên dưới).

1. Lấy **connection string** từ Neon Console (mục 1 ở trên). Với pg_dump nên dùng **direct** connection (không có `-pooler` trong host).
2. Tách từ connection string:
   - Host: phần sau `@`, trước `/` (ví dụ `ep-xxx.ap-southeast-1.aws.neon.tech`)
   - Port: **5432** (Neon dùng 5432)
   - Database: tên DB (ví dụ `neondb`)
   - User và password: từ connection string

3. Chạy trong terminal (PowerShell hoặc CMD):

   **Xuất ra file SQL (schema + data, dạng text):**
   ```bash
   pg_dump "postgresql://USER:PASSWORD@HOST/neondb?sslmode=require" -F p -f backup.sql
   ```
   Thay `USER`, `PASSWORD`, `HOST` bằng giá trị từ connection string. `-F p` = plain SQL, `-f backup.sql` = tên file xuất ra.

   **Xuất ra file custom (nén, dùng pg_restore sau):**
   ```bash
   pg_dump "postgresql://USER:PASSWORD@HOST/neondb?sslmode=require" -F c -f backup.dump
   ```

4. File `backup.sql` hoặc `backup.dump` sẽ nằm ở thư mục hiện tại — đó là bản tải về dữ liệu từ Neon.

**Ví dụ (Windows, connection string trong .env):**
```powershell
# Đọc từ .env rồi chạy (không commit file chứa mật khẩu)
$env:PGPASSWORD = "npg_xxx"; pg_dump -h ep-xxx-pooler.ap-southeast-1.aws.neon.tech -p 5432 -U neondb_owner -d neondb -F p -f neon_backup.sql
```
Nếu dùng host **pooler**, vẫn có thể dump; khi gặp lỗi kết nối thì thử connection string **không** có `-pooler`.

### 7.2. Xuất từng bảng qua Neon SQL Editor

1. Đăng nhập [Neon Console](https://console.neon.tech) → chọn project → **SQL Editor**.
2. Chạy query để xem dữ liệu, ví dụ:
   ```sql
   SELECT * FROM users;
   -- hoặc
   SELECT * FROM contracts;
   ```
3. Trong SQL Editor, dùng nút **Export** (hoặc Copy) để tải kết quả ra CSV/file — tùy giao diện Neon hiện tại (Export results / Download CSV).

Cách này phù hợp khi chỉ cần xuất vài bảng hoặc kết quả một câu SELECT, không cần cài pg_dump.

### 7.3. Dùng pgAdmin 4

**Có thể.** pgAdmin 4 là client PostgreSQL, kết nối được với Neon và dùng Backup / Query Tool để tải dữ liệu về.

**Bước 1 – Kết nối Neon trong pgAdmin:**

1. Mở pgAdmin 4 → chuột phải **Servers** → **Register** → **Server**.
2. Tab **General**: đặt tên (ví dụ `Neon KDPD`).
3. Tab **Connection**:
   - **Host:** hostname từ connection string (phần sau `@`, trước `/`), ví dụ `ep-frosty-flower-a1kxq5mz-pooler.ap-southeast-1.aws.neon.tech`
   - **Port:** `5432`
   - **Maintenance database:** `neondb` (hoặc tên database của bạn)
   - **Username:** user trong connection string (ví dụ `neondb_owner`)
   - **Password:** mật khẩu từ connection string
   - Bật **Save password** nếu muốn (chỉ trên máy cá nhân).
4. Tab **SSL**: chọn **Require** (Neon bắt buộc SSL).
5. **Save** → pgAdmin sẽ kết nối tới Neon.

**Bước 2 – Tải toàn bộ database (backup):**

- Trong cây bên trái: mở **Databases** → chuột phải database (ví dụ `neondb`) → **Backup...**
- **Filename:** chọn đường dẫn và tên file (ví dụ `neon_backup.backup` hoặc `.sql`)
- **Format:** **Plain** (file `.sql`, đọc được bằng text editor) hoặc **Custom** (file nén, restore bằng pg_restore)
- **Backup** → pgAdmin chạy pg_dump phía sau, file xuất ra chính là bản tải về dữ liệu từ Neon.

**Bước 3 – Xuất kết quả một câu query (CSV/Excel):**

- Chuột phải database → **Query Tool**
- Gõ SQL, ví dụ: `SELECT * FROM users;` → **Execute** (F5)
- Trong khung kết quả: chuột phải → **Download as CSV** (hoặc **Export**) → chọn đường dẫn lưu file.

**Lưu ý:** Nếu kết nối thất bại (timeout / SSL), thử dùng connection string **direct** (không có `-pooler` trong host) trong tab Connection.

**Lỗi "server version mismatch" khi Backup trong pgAdmin:**

- **Nguyên nhân:** Neon chạy PostgreSQL **17.x**, trong khi pgAdmin (cài kèm PostgreSQL 16) dùng **pg_dump 16** từ thư mục runtime của nó — thay đổi Binary Path trong Preferences **không** áp dụng cho Backup. pg_dump phải có phiên bản **≥** server.
- **Cách 1 – Script backup trong project (khuyên dùng):** Đã có script đọc `DATABASE_URL` từ `.env` và gọi pg_dump 17. Cài [PostgreSQL 17](https://www.postgresql.org/download/windows/) (hoặc chỉ Command Line Tools), rồi chạy:

  ```bash
  npm run neon:backup
  ```

  File backup sẽ ghi vào `attached_assets/YYYY.MM.DD neon_backup.sql`. Nếu pg_dump 17 không nằm ở `C:\Program Files\PostgreSQL\17\bin\`, set biến môi trường `PG_DUMP_PATH` trỏ tới `pg_dump.exe` (ví dụ `set PG_DUMP_PATH=C:\Path\To\pg_dump.exe` rồi chạy lại).

- **Cách 2 – Dùng pg_dump 17 từ dòng lệnh (PowerShell):**
  1. Cài [PostgreSQL 17](https://www.postgresql.org/download/windows/) (hoặc [EDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)); khi cài có thể chọn chỉ **Command Line Tools**.
  2. Mở PowerShell, đặt mật khẩu và chạy pg_dump **của bản 17** (đường dẫn thường `C:\Program Files\PostgreSQL\17\bin\pg_dump.exe`):

     ```powershell
     $env:PGPASSWORD = "MẬT_KHẨU_NEON"
     & "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h ep-frosty-flower-a1kxq5mz-pooler.ap-southeast-1.aws.neon.tech -p 5432 -U neondb_owner -d neondb -F p -f "D:\2. Vincent\DEV\KDPD_Project_management\KDPD_PRJ_MNG\attached_assets\neon_backup.sql"
     ```

     Thay `MẬT_KHẨU_NEON` bằng mật khẩu thật (hoặc dùng connection string trong `.env`). File xuất ra là backup dạng plain SQL.

- **Cách 3 – Cho pgAdmin dùng pg_dump 17:** Trên nhiều bản cài, pgAdmin **vẫn gọi pg_dump từ thư mục runtime của nó** (PostgreSQL 16), nên đổi Binary Path có thể không có tác dụng. Nếu vẫn muốn thử: **File** → **Preferences** → **Paths** → **Binary paths** → **PostgreSQL Binary Path** = `C:\Program Files\PostgreSQL\17\bin` → **Save** rồi thử Backup lại.

Sau khi dùng **Cách 1** (script) hoặc **Cách 2** (PowerShell), backup sẽ chạy được vì pg_dump 17 tương thích với server Neon 17.x.

### 7.4. Tài liệu Neon về backup / export

- [Backups with pg_dump](https://neon.tech/docs/manage/backup-pg-dump) – hướng dẫn backup bằng pg_dump.
- [Migrate from Postgres (pg_dump/pg_restore)](https://neon.tech/docs/import/migrate-from-postgres) – nhập dữ liệu vào Neon (ngược với việc tải về).

**Tóm tắt:** Để **tải về toàn bộ dữ liệu** từ Neon: dùng **pg_dump** (dòng lệnh) hoặc **pgAdmin 4** (Backup database). Để **xuất nhanh vài bảng**: dùng **Neon SQL Editor** hoặc **pgAdmin 4 Query Tool** → chạy SELECT → Export/Download CSV.

---

## 8. Tài liệu tham khảo

- [Connecting Neon to your stack](https://neon.com/docs/get-started/connect-neon) – lấy connection string, ví dụ theo ngôn ngữ/framework.
- [Connection pooling](https://neon.com/docs/connect/connection-pooling) – khi cần dùng pooled connection.
- [Connect documentation](https://neon.com/docs/connect/connect-intro) – tổng quan kết nối, xử lý lỗi, bảo mật.

---

**Tóm tắt** Lấy connection string từ Neon Dashboard → bỏ vào `.env` với key `DATABASE_URL` → chạy schema + seed → `npm run dev` và đăng nhập.
