# Hướng dẫn nhanh – Neon (PostgreSQL)

1. Tạo project trên [Neon Console](https://console.neon.tech), copy **connection string**.
2. Tạo file **`.env`** ở thư mục gốc:
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
3. Trên Neon SQL Editor (tắt Explain/Analyze): chạy lần lượt:
   - `attached_assets/KDPD_DB_schema.sql`
   - `attached_assets/KDPD_DB_seed_users.sql`
   - `attached_assets/KDPD_DB_seed_admin.sql`
4. Chạy ứng dụng: `npm run dev`.
5. Đăng nhập: **admin@kdpd.local** / **Admin01092016@**.

Chi tiết và xử lý lỗi: **[NEON_SETUP.md](./NEON_SETUP.md)**.
