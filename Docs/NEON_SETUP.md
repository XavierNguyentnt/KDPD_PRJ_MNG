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

## 7. Tài liệu tham khảo

- [Connecting Neon to your stack](https://neon.com/docs/get-started/connect-neon) – lấy connection string, ví dụ theo ngôn ngữ/framework.
- [Connection pooling](https://neon.com/docs/connect/connection-pooling) – khi cần dùng pooled connection.
- [Connect documentation](https://neon.com/docs/connect/connect-intro) – tổng quan kết nối, xử lý lỗi, bảo mật.

---

**Tóm tắt** Lấy connection string từ Neon Dashboard → bỏ vào `.env` với key `DATABASE_URL` → chạy schema + seed → `npm run dev` và đăng nhập.
