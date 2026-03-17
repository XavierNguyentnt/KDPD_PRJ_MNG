# 03. Công việc chung

Trang **Công việc chung** dùng để quản lý các công việc thuộc nhóm “Công việc chung” (và các công việc liên quan trong phạm vi trang này), hỗ trợ:

- Tạo/sửa/xóa công việc (tuỳ quyền).
- Phân công **nhiều nhân sự** (Nhân sự 1, Nhân sự 2, …) và **Người kiểm soát**.
- Theo dõi tiến độ, ngày nhận việc/ngày dự kiến/ngày hoàn thành thực tế.
- Người kiểm soát có thể **đánh giá** (Hoàn thành tốt/khá/không tốt/không hoàn thành) và yêu cầu làm lại.
- Lọc/sắp xếp/tìm kiếm và **xuất Excel** theo bộ lọc.

## 1) Truy cập trang

- Trên menu trái, bấm **Công việc chung**.

## 2) Bố cục và thao tác nhanh

Khu vực danh sách thường gồm:

- **Tìm kiếm**: tìm theo tiêu đề/mô tả/nhân sự/nhóm/hợp phần/giai đoạn (tuỳ dữ liệu liên kết).
- **Chuyển chế độ xem**: Bảng / Kanban.
- **Xuất Excel**: tải danh sách theo bộ lọc hiện tại.
- **Bộ lọc**: Nhân sự, Hợp phần, Giai đoạn, Trạng thái, Năm nhận việc, Đánh giá, Từ ngày/Đến ngày.

## 3) Bộ lọc, sắp xếp, tìm kiếm

### 3.1) Tìm kiếm

- Nhập từ khóa tại ô **Tìm công việc…** để thu hẹp danh sách.

### 3.2) Bộ lọc (Filter)

Khối Filter gồm các trường:

- **Nhân sự**: lọc theo người thực hiện (bao gồm các nhân sự được gán trong công việc).
- **Hợp phần**: lọc theo hợp phần của tài liệu dịch thuật liên kết (nếu có).
- **Giai đoạn**: lọc theo giai đoạn của tài liệu dịch thuật liên kết (nếu có).
- **Trạng thái**: Not Started / In Progress / Completed / Pending / Cancelled.
- **Năm nhận việc**: lọc theo năm của “ngày nhận việc”.
- **Đánh giá**: Hoàn thành tốt / Hoàn thành khá / Không tốt / Không hoàn thành.
- **Từ ngày / Đến ngày**: lọc theo **ngày hạn (Due date)**.

### 3.3) Sắp xếp (Sort)

- Ở chế độ **Bảng**, bấm tiêu đề cột để đổi thứ tự sắp xếp (tăng/giảm).

## 4) Mở chi tiết, xem/sửa/xóa

### 4.1) Mở chi tiết

- Bấm vào 1 dòng công việc để mở cửa sổ **Chi tiết công việc**.
- Hoặc bấm biểu tượng **Xem** (nếu có) ở cuối dòng.

### 4.2) Chỉnh sửa

- Bấm biểu tượng **Sửa** (bút chì) để vào chế độ chỉnh sửa.
- Lưu ý quyền:
  - Admin/Manager thường có quyền chỉnh sửa meta (tiêu đề, trạng thái, ưu tiên, phân công…).
  - Nhân sự thường chỉ chỉnh được các phần liên quan đến **ngày hoàn thành của chính mình** (tuỳ cấu hình từng loại phân công).

### 4.3) Xóa

- Bấm biểu tượng **Xóa** (thùng rác) để mở hộp thoại xác nhận, sau đó bấm **Xác nhận**.

## 5) Tạo công việc mới (Admin/Manager)

1. Bấm **Tạo mới**.
2. Điền thông tin cơ bản:
   - **Tiêu đề**
   - **Trạng thái**
   - **Ưu tiên**
   - **Nhóm (Group)**: mặc định “Công việc chung”
3. (Tuỳ chọn) Liên kết với **tài liệu dịch thuật**:
   - Chọn **Tên tài liệu dịch thuật**
   - Hệ thống tự hiển thị **Hợp phần** và **Giai đoạn** tương ứng (chỉ đọc)
4. Thiết lập **Phân công nhân sự**:
   - Thêm “Nhân sự 1, Nhân sự 2, …”
   - Thêm “Người kiểm soát”
   - Với mỗi nhân sự (không phải Người kiểm soát), có thể nhập:
     - Ngày nhận công việc
     - Ngày hoàn thành dự kiến
     - Ngày hoàn thành thực tế (thường chỉ nhân sự đó được nhập)
5. Bấm **Tạo/Cập nhật** để lưu.

## 6) Đánh giá (Người kiểm soát)

Trong khối phân công, “Người kiểm soát” có trường **Đánh giá công việc**:

- Hoàn thành tốt
- Hoàn thành khá
- Không tốt
- Không hoàn thành

Nếu đánh giá là **Không tốt** hoặc **Không hoàn thành**, hệ thống có thể hiển thị nút **Yêu cầu làm lại**:

- Bấm **Yêu cầu làm lại** để tạo một công việc “làm lại” liên quan.

## 7) Xuất Excel

- Bấm **Xuất Excel** để tải file Excel chứa danh sách công việc theo bộ lọc hiện tại.
- Nếu danh sách đang rỗng, nút có thể bị vô hiệu hoá hoặc hệ thống báo “Không có dữ liệu”.

