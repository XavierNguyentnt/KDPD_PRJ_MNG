# 05. Thiết kế

Trang **Thiết kế** dùng để quản lý công việc thuộc nhóm “Thiết kế”, hỗ trợ:

- Tạo/sửa/xóa công việc (tuỳ quyền).
- Lọc/sắp xếp/tìm kiếm theo nhân sự, hợp phần, giai đoạn, trạng thái, năm, đánh giá, thời gian.
- Xuất danh sách ra Excel.
- Phân công theo vai trò thiết kế (ví dụ: KTV chính, trợ lý thiết kế… tuỳ cấu hình công việc).

## 1) Truy cập trang

- Trên menu trái, bấm **Thiết kế** (chỉ hiện khi có quyền hoặc là Admin/Manager).

## 2) Tìm kiếm, lọc, sắp xếp

### 2.1) Tìm kiếm

- Nhập từ khóa vào ô tìm kiếm để lọc theo tiêu đề/mô tả/nhân sự/tác phẩm…

### 2.2) Bộ lọc (Filter)

Khối Filter gồm các trường (tuỳ thời điểm hiển thị):

- **Nhân sự**
- **Hợp phần**
- **Giai đoạn**
- **Trạng thái**
- **Năm nhận việc**
- **Đánh giá**
- **Từ ngày / Đến ngày** (lọc theo ngày hạn)

### 2.3) Sắp xếp

- Ở chế độ **Bảng**, bấm tiêu đề cột để sắp xếp tăng/giảm.

## 3) Chế độ xem và xuất Excel

- Chuyển **Bảng / Kanban** để xem theo nhu cầu.
- Bấm **Xuất Excel** để tải danh sách theo bộ lọc hiện tại.

## 4) Tạo công việc mới (Admin/Manager)

1. Bấm **Tạo mới**.
2. Điền thông tin cơ bản (tiêu đề, trạng thái, ưu tiên…).
3. (Tuỳ chọn) Liên kết **tài liệu dịch thuật** để lấy hợp phần/giai đoạn.
4. Phân công nhân sự thiết kế:
   - Gán **KTV chính** (nếu có).
   - Thêm các **trợ lý** (nếu có).
   - Nhập các mốc thời gian (nhận việc, dự kiến, hoàn thành) theo quyền.
5. Lưu công việc.

## 5) Cập nhật hoàn thành

- Với một số cấu hình công việc Thiết kế, khi nhập **Ngày hoàn thành thực tế** hệ thống có thể tự chuyển trạng thái công việc sang **Hoàn thành**.

