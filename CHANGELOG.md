# Changelog - Google Sheets Integration

## Tổng quan

Dự án đã được cập nhật để tích hợp đầy đủ với Google Sheets API, hỗ trợ các thao tác CRUD (Create, Read, Update, Delete) trực tiếp với Google Sheets.

## Các thay đổi chính

### 1. Cài đặt Dependencies
- ✅ Thêm `googleapis` package để tích hợp Google Sheets API

### 2. Google Sheets Service (`server/google-sheets.ts`)
- ✅ Tạo service mới với hỗ trợ đầy đủ CRUD operations
- ✅ Hỗ trợ 2 chế độ:
  - **Read-only mode**: Sử dụng CSV export công khai (không cần cấu hình)
  - **Full CRUD mode**: Sử dụng Google Sheets API với Service Account
- ✅ Tự động phát hiện tên sheet và cấu trúc dữ liệu
- ✅ Hỗ trợ cả tên cột tiếng Anh và tiếng Việt
- ✅ Xử lý lỗi và fallback tự động

### 3. Storage Layer (`server/storage.ts`)
- ✅ Cập nhật để sử dụng Google Sheets service mới
- ✅ Hỗ trợ create, update, delete operations
- ✅ Cache mechanism để tối ưu performance
- ✅ Fallback về in-memory update khi không có authentication

### 4. API Routes (`server/routes.ts`)
- ✅ Thêm endpoint `POST /api/tasks` để tạo task mới
- ✅ Thêm endpoint `DELETE /api/tasks/:id` để xóa task
- ✅ Cải thiện error handling với thông báo rõ ràng
- ✅ Hỗ trợ status codes phù hợp (503 cho authentication errors)

### 5. Frontend Hooks (`client/src/hooks/use-tasks.ts`)
- ✅ Thêm `useCreateTask()` hook
- ✅ Thêm `useDeleteTask()` hook
- ✅ Cải thiện error handling

### 6. API Schema (`shared/routes.ts`)
- ✅ Thêm schema cho create và delete endpoints
- ✅ Validation với Zod

### 7. Documentation
- ✅ Tạo `GOOGLE_SHEETS_SETUP.md` với hướng dẫn chi tiết
- ✅ Tạo `.env.example` để hướng dẫn cấu hình
- ✅ Cập nhật `.gitignore` để bảo vệ credentials

## Cách sử dụng

### Chế độ Read-Only (Mặc định)
Không cần cấu hình gì, dự án sẽ tự động:
- Đọc dữ liệu từ Google Sheets qua CSV export
- Hiển thị tasks trên dashboard
- **Không thể** tạo, cập nhật hoặc xóa tasks

### Chế độ Full CRUD
Để bật chế độ đầy đủ, làm theo các bước trong `GOOGLE_SHEETS_SETUP.md`:
1. Tạo Google Cloud Service Account
2. Kích hoạt Google Sheets API
3. Chia sẻ Google Sheet với Service Account email
4. Cấu hình `GOOGLE_SERVICE_ACCOUNT_JSON` trong `.env`

## Cấu trúc dữ liệu hỗ trợ

Dự án hỗ trợ các tên cột sau (cả tiếng Anh và tiếng Việt):

| Tiếng Anh | Tiếng Việt |
|-----------|------------|
| Task ID / ID | Mã công việc / Mã CV |
| Task Name / Title | Tên công việc / Công việc |
| Description | Mô tả |
| Assignee | Người thực hiện |
| Role | Vai trò |
| Status | Trạng thái |
| Priority | Độ ưu tiên |
| Start Date | Ngày bắt đầu |
| Due Date | Ngày kết thúc |
| Progress | Tiến độ |
| Notes | Ghi chú |

## Lưu ý quan trọng

1. **Bảo mật**: Không commit file credentials vào Git
2. **Permissions**: Service Account cần quyền Editor trên Google Sheet
3. **Sheet Structure**: Sheet cần có header row ở dòng đầu tiên
4. **Fallback**: Nếu API không khả dụng, hệ thống tự động fallback về CSV

## Testing

Để kiểm tra cấu hình:
1. Khởi động server: `npm run dev`
2. Kiểm tra console log:
   - `Google Sheets API: Using service account authentication` = Đã cấu hình thành công
   - `Google Sheets API: Using read-only public access` = Chế độ read-only

## Troubleshooting

Xem phần "Xử lý lỗi thường gặp" trong `GOOGLE_SHEETS_SETUP.md`
