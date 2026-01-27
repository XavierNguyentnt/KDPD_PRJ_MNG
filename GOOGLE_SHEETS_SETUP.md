# Hướng dẫn cấu hình Google Sheets API

Dự án này sử dụng Google Sheets làm nguồn dữ liệu chính. Để hỗ trợ đầy đủ các thao tác CRUD (Create, Read, Update, Delete), bạn cần cấu hình Google Sheets API với Service Account.

## Chế độ hoạt động

### 1. Chế độ Read-Only (Mặc định)
- **Không cần cấu hình**: Dự án sẽ tự động sử dụng CSV export công khai từ Google Sheets
- **Hạn chế**: Chỉ có thể đọc dữ liệu, không thể tạo, cập nhật hoặc xóa
- **Phù hợp**: Khi bạn chỉ cần xem dữ liệu

### 2. Chế độ Full CRUD (Cần cấu hình)
- **Yêu cầu**: Service Account credentials từ Google Cloud
- **Tính năng**: Đầy đủ Create, Read, Update, Delete
- **Phù hợp**: Khi bạn cần quản lý dữ liệu trực tiếp từ ứng dụng

## Các bước cấu hình Google Sheets API

### Bước 1: Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo một project mới hoặc chọn project hiện có
3. Kích hoạt **Google Sheets API**:
   - Vào "APIs & Services" > "Library"
   - Tìm "Google Sheets API"
   - Nhấn "Enable"

### Bước 2: Tạo Service Account

1. Vào "APIs & Services" > "Credentials"
2. Nhấn "Create Credentials" > "Service Account"
3. Điền thông tin:
   - **Service account name**: `kdpd-project-management` (hoặc tên bạn muốn)
   - **Service account ID**: Tự động tạo
   - Nhấn "Create and Continue"
4. Bỏ qua phần "Grant this service account access to project" (nhấn Continue)
5. Nhấn "Done"

### Bước 3: Tạo và tải xuống Key

1. Trong danh sách Service Accounts, nhấn vào service account vừa tạo
2. Vào tab "Keys"
3. Nhấn "Add Key" > "Create new key"
4. Chọn format **JSON**
5. Nhấn "Create" - file JSON sẽ được tải xuống

### Bước 4: Chia sẻ Google Sheet với Service Account

1. Mở file JSON đã tải xuống, tìm email trong trường `client_email` (ví dụ: `kdpd-project-management@your-project.iam.gserviceaccount.com`)
2. Mở Google Sheet của bạn: https://docs.google.com/spreadsheets/d/1EocmoQcjYbXBaleojrV7LLlgjZTjOvkyZxEb_bHJETM/edit
3. Nhấn nút "Share" (Chia sẻ) ở góc trên bên phải
4. Dán email của Service Account vào ô
5. Chọn quyền **Editor** (Biên tập viên)
6. Nhấn "Send" (Gửi)

### Bước 5: Cấu hình trong dự án

#### Cách 1: Sử dụng biến môi trường (Khuyến nghị)

1. Tạo file `.env` trong thư mục gốc của dự án
2. Mở file JSON credentials đã tải xuống
3. Copy toàn bộ nội dung JSON
4. Thêm vào file `.env`:

```env
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**Lưu ý**: Toàn bộ JSON phải nằm trong dấu nháy đơn `'...'` và trên một dòng.

#### Cách 2: Sử dụng file JSON (Cho development)

1. Đặt file JSON credentials vào thư mục `server/` (ví dụ: `server/credentials.json`)
2. Cập nhật code trong `server/google-sheets.ts` để đọc từ file:

```typescript
import { readFileSync } from 'fs';
const credentials = JSON.parse(readFileSync('server/credentials.json', 'utf8'));
```

**⚠️ Cảnh báo**: Không commit file credentials vào Git! Thêm vào `.gitignore`:

```
server/credentials.json
*.json
!package.json
!tsconfig.json
```

## Kiểm tra cấu hình

Sau khi cấu hình, khởi động lại server và kiểm tra log:

```
Google Sheets API: Using service account authentication
```

Nếu thấy thông báo này, bạn đã cấu hình thành công!

## Xử lý lỗi thường gặp

### Lỗi: "Write operations require Google Sheets API authentication"
- **Nguyên nhân**: Chưa cấu hình Service Account hoặc biến môi trường không đúng
- **Giải pháp**: Kiểm tra lại các bước cấu hình ở trên

### Lỗi: "The caller does not have permission"
- **Nguyên nhân**: Service Account chưa được chia sẻ quyền Editor trên Google Sheet
- **Giải pháp**: Kiểm tra lại Bước 4

### Lỗi: "Invalid JSON"
- **Nguyên nhân**: Format của `GOOGLE_SERVICE_ACCOUNT_JSON` không đúng
- **Giải pháp**: Đảm bảo JSON được đặt trong dấu nháy đơn và là một dòng

## Cấu trúc Google Sheet

Dự án hỗ trợ các tên cột bằng cả tiếng Anh và tiếng Việt:

### Tiếng Anh:
- Task ID / ID
- Task Name / Task / Title / Name
- Description / Desc
- Assignee / Assigned To / Owner
- Role / Team
- Status / State
- Priority
- Start Date / Start
- Due Date / Due / Deadline
- Progress / %
- Notes / Comments

### Tiếng Việt:
- Mã công việc / Mã CV
- Tên công việc / Công việc / Nội dung
- Mô tả / Ghi chú
- Người thực hiện / Người phụ trách
- Vai trò / Nhóm
- Trạng thái
- Độ ưu tiên / Ưu tiên
- Ngày bắt đầu
- Ngày kết thúc / Hạn hoàn thành
- Tiến độ
- Ghi chú / Nhận xét

## Bảo mật

- **KHÔNG** commit file credentials vào Git
- **KHÔNG** chia sẻ Service Account key công khai
- Sử dụng biến môi trường cho production
- Giới hạn quyền của Service Account chỉ trên Sheet cần thiết
