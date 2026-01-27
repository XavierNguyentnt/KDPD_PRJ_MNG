# Hướng dẫn nhanh - Cấu hình Google Sheets

## Bước 1: Chia sẻ Google Sheet với Service Account

Service Account email của bạn là:
```
kdpd-project-management@zeta-courage-485612-h8.iam.gserviceaccount.com
```

**Cách chia sẻ:**
1. Mở Google Sheet: https://docs.google.com/spreadsheets/d/1EocmoQcjYbXBaleojrV7LLlgjZTjOvkyZxEb_bHJETM/edit
2. Nhấn nút **"Chia sẻ"** (Share) ở góc trên bên phải
3. Dán email: `kdpd-project-management@zeta-courage-485612-h8.iam.gserviceaccount.com`
4. Chọn quyền **"Biên tập viên"** (Editor)
5. Nhấn **"Gửi"** (Send)

## Bước 2: Khởi động lại server

Sau khi chia sẻ, khởi động lại server:
```bash
npm run dev
```

Bạn sẽ thấy trong console:
```
Google Sheets API: Using credentials from zeta-courage-485612-h8-19dc8bb278ad.json
Google Sheets API: Service account authentication configured successfully
```

## Kiểm tra

1. Server chạy thành công
2. Không còn lỗi "Bad Request" khi đọc dữ liệu
3. Có thể tạo, cập nhật, xóa tasks từ ứng dụng

## Troubleshooting

### Nếu vẫn thấy lỗi "Bad Request":
- Kiểm tra xem đã chia sẻ Sheet với Service Account email chưa
- Đảm bảo quyền là "Editor" (không phải "Viewer")

### Nếu thấy "Failed to initialize Google Auth":
- Kiểm tra file JSON credentials có đúng format không
- Đảm bảo file nằm trong thư mục gốc của project

### Nếu muốn dùng biến môi trường thay vì file:
Thêm vào `.env`:
```
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```
(Copy toàn bộ nội dung file JSON vào đây)
