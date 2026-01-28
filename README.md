# KDPD Project Management System

Hệ thống quản lý công việc (Task Management System) với PostgreSQL (Neon), đăng nhập Passport và phân quyền theo role/employee_group.

## ✨ Tính năng

- ✅ **Quản lý công việc đầy đủ**: Create, Read, Update, Delete tasks
- ✅ **PostgreSQL (Neon)**: Dữ liệu tasks, users, contracts, documents lưu trên Neon
- ✅ **Đăng nhập (Passport)**: Session-based auth, email + mật khẩu
- ✅ **Phân quyền**: Theo role (Admin, Manager, Employee) và employee_group
- ✅ **Hỗ trợ tiếng Việt**: i18n và map cột tiếng Việt
- ✅ **Dashboard**: Thống kê, filter, search

## 🚀 Cài đặt nhanh

### Yêu cầu

- Node.js 20+
- npm hoặc yarn
- Tài khoản [Neon](https://neon.tech) (PostgreSQL miễn phí)

### Bước 1: Clone và cài đặt

```bash
git clone https://github.com/XavierNguyentnt/KDPD_PRJ_MNG.git
cd KDPD_PRJ_MNG
npm install
```

### Bước 2: Cấu hình Neon (PostgreSQL)

Xem hướng dẫn chi tiết trong **[Docs/NEON_SETUP.md](./Docs/NEON_SETUP.md)**.

**Tóm tắt:**
1. Tạo project trên [Neon Console](https://console.neon.tech), lấy **connection string**
2. Tạo file **`.env`** ở thư mục gốc:
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
3. Trên Neon SQL Editor: chạy lần lượt `attached_assets/KDPD_DB_schema.sql` → `KDPD_DB_seed_users.sql` → `KDPD_DB_seed_admin.sql`

### Bước 3: Chạy ứng dụng

```bash
npm run dev
```

Ứng dụng chạy tại: **http://localhost:5000**

Đăng nhập mặc định (sau khi chạy seed admin): **admin@kdpd.local** / **Admin01092016@**

## 📁 Cấu trúc dự án

```
KDPD_PRJ_MNG/
├── client/              # Frontend (React + TypeScript)
│   └── src/
│       ├── components/
│       ├── pages/
│       └── hooks/
├── server/              # Backend (Express + TypeScript)
│   ├── auth.ts          # Passport + session
│   ├── db.ts            # Neon/Postgres connection
│   ├── db-storage.ts    # CRUD qua Drizzle
│   ├── storage.ts       # Storage layer (DB)
│   └── routes.ts        # API routes
├── shared/
│   ├── schema.ts        # Drizzle schema + Zod
│   └── routes.ts        # API definitions
├── attached_assets/     # SQL schema & seed
└── Docs/
    └── NEON_SETUP.md    # Hướng dẫn cài đặt Neon
```

## 🔧 Biến môi trường

Tạo file **`.env`** (không commit):

```env
# Bắt buộc: connection string từ Neon
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Tuỳ chọn: secret cho session cookie
# SESSION_SECRET=your-secret

PORT=5000
NODE_ENV=development
```

## 📚 Tài liệu

- **[Docs/NEON_SETUP.md](./Docs/NEON_SETUP.md)** – Cài đặt Neon, lấy connection string, chạy schema/seed, xử lý lỗi đăng nhập
- [Docs/USER_DATABASE_PLAN.md](./Docs/USER_DATABASE_PLAN.md) – Kế hoạch DB người dùng
- [attached_assets/DB_Plan.md](./attached_assets/DB_Plan.md) – Kế hoạch DB (tasks, contracts, documents)
- [CHANGELOG.md](./CHANGELOG.md) – Lịch sử thay đổi

## 🐛 Xử lý lỗi

- **"Database not configured"**: Đặt `DATABASE_URL` trong `.env` và restart server (xem [Docs/NEON_SETUP.md](./Docs/NEON_SETUP.md)).
- **"Invalid email or password"**: Chạy `KDPD_DB_seed_admin.sql` trên Neon, đăng nhập với **admin@kdpd.local** / **Admin01092016@**. Hoặc dùng email từ seed users với mật khẩu **123456**.

## 📝 License

MIT

## 👤 Author

XavierNguyentnt
