# KDPD Project Management System

Hệ thống quản lý công việc (Task Management System) với tích hợp Google Sheets, hỗ trợ CRUD đầy đủ và quản lý theo thời gian thực.

## ✨ Tính năng

- ✅ **Quản lý công việc đầy đủ**: Create, Read, Update, Delete tasks
- ✅ **Tích hợp Google Sheets**: Dữ liệu được lưu trực tiếp trên Google Sheets
- ✅ **Real-time sync**: Đồng bộ 2 chiều giữa ứng dụng web và Google Sheets
- ✅ **Hỗ trợ tiếng Việt**: Tự động nhận diện và map các cột tiếng Việt
- ✅ **Role-based access**: Phân quyền Admin, Manager, Employee
- ✅ **Dashboard trực quan**: Thống kê, báo cáo, filter và search
- ✅ **Không cần database**: Chỉ cần Google Sheets (đơn giản, miễn phí)

## 🚀 Cài đặt nhanh

### Yêu cầu

- Node.js 20+ 
- npm hoặc yarn
- Google Account (để tạo Service Account)

### Bước 1: Clone repository

```bash
git clone https://github.com/XavierNguyentnt/KDPD_PRJ_MNG.git
cd KDPD_PRJ_MNG
```

### Bước 2: Cài đặt dependencies

```bash
npm install
```

### Bước 3: Cấu hình Google Sheets API

Xem hướng dẫn chi tiết trong [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)

**Tóm tắt:**
1. Tạo Google Cloud Service Account
2. Kích hoạt Google Sheets API
3. Download credentials JSON
4. Đặt file credentials vào thư mục gốc (hoặc set `GOOGLE_SERVICE_ACCOUNT_JSON` env var)
5. Chia sẻ Google Sheet với Service Account email

### Bước 4: Chạy ứng dụng

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Ứng dụng sẽ chạy tại: `http://localhost:5000`

## 📁 Cấu trúc dự án

```
KDPD_PRJ_MNG/
├── client/              # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Pages
│   │   └── hooks/       # React hooks
├── server/              # Backend (Express + TypeScript)
│   ├── google-sheets.ts # Google Sheets API service
│   ├── storage.ts       # Storage layer
│   └── routes.ts        # API routes
├── shared/              # Shared code
│   ├── schema.ts        # Data schemas
│   └── routes.ts        # API route definitions
└── docs/                # Documentation
```

## 🔧 Cấu hình

### Environment Variables

Tạo file `.env` (xem `.env.example`):

```env
# Google Sheets API (Optional - sẽ tự động tìm file credentials.json)
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Database (Optional - không bắt buộc)
DATABASE_URL='postgresql://...'

# Server
PORT=5000
NODE_ENV=development
```

### Google Sheets Configuration

Cấu hình trong `shared/schema.ts`:

```typescript
export const SHEET_CONFIG: SheetConfig = {
  sheetId: "YOUR_SHEET_ID",
  gid: "0" // Optional: sheet ID
};
```

## 📚 Tài liệu

- [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md) - Hướng dẫn cấu hình Google Sheets API
- [QUICK_SETUP.md](./QUICK_SETUP.md) - Hướng dẫn nhanh
- [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) - Kiến trúc và quyết định về database
- [SHEET_STRUCTURE_RECOMMENDATION.md](./SHEET_STRUCTURE_RECOMMENDATION.md) - Đề xuất cấu trúc Google Sheets
- [CHANGELOG.md](./CHANGELOG.md) - Lịch sử thay đổi

## 🎯 Sử dụng

### Chế độ Read-Only (Mặc định)

Không cần cấu hình gì, ứng dụng sẽ:
- Đọc dữ liệu từ Google Sheets qua CSV export
- Hiển thị tasks trên dashboard
- **Không thể** tạo, cập nhật hoặc xóa tasks

### Chế độ Full CRUD

Sau khi cấu hình Service Account:
- ✅ Tạo tasks mới
- ✅ Cập nhật tasks
- ✅ Xóa tasks
- ✅ Đồng bộ real-time với Google Sheets

## 🏗️ Kiến trúc

### Data Flow

```
Frontend (React) 
    ↕
Backend API (Express)
    ↕
Google Sheets Service
    ↕
Google Sheets API / CSV Export
```

### Storage Layer

- **Primary**: Google Sheets (via API hoặc CSV)
- **Database**: Optional (không bắt buộc)
- **Cache**: In-memory cache (1 phút TTL)

## 🔒 Bảo mật

- ✅ File credentials được ignore trong Git
- ✅ Service Account chỉ có quyền trên Sheet cụ thể
- ✅ Environment variables cho sensitive data
- ⚠️ **KHÔNG commit** file `*.json` credentials vào Git

## 🐛 Troubleshooting

### Lỗi "Unable to parse range"
- Kiểm tra tên sheet có đúng không
- Code sẽ tự động phát hiện tên sheet

### Lỗi "Failed to fetch sheet"
- Kiểm tra Google Sheet đã được chia sẻ với Service Account chưa
- Kiểm tra quyền của Service Account (cần Editor)

### Lỗi "Write operations require authentication"
- Đảm bảo đã cấu hình Service Account credentials
- Kiểm tra file credentials.json có đúng format không

Xem thêm trong [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)

## 📝 License

MIT

## 👤 Author

XavierNguyentnt

## 🙏 Acknowledgments

- Google Sheets API
- React + TypeScript
- Express.js
- shadcn/ui components
