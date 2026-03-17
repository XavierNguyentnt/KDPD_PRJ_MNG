# Bộ tài liệu Hướng dẫn sử dụng KDPD Project Management

Tài liệu này hướng dẫn thao tác sử dụng cho người dùng cuối, từ đăng nhập đến sử dụng các chức năng quản lý công việc, bộ lọc/sắp xếp/tìm kiếm, xuất file, xem báo cáo, thông báo và quản lý tài khoản cá nhân.

## Đối tượng sử dụng

- **Employee (Nhân sự)**: Xem công việc được giao, cập nhật tiến độ/ngày hoàn thành theo quyền, theo dõi thông báo.
- **Manager (Quản lý)**: Tạo/cập nhật/xóa công việc; theo dõi báo cáo; quản lý theo nhóm.
- **Admin (Quản trị)**: Toàn quyền như Manager; thêm/quản lý người dùng, phân quyền.
- **Thư ký hợp phần**: Ngoài công việc, có thêm các tab quản lý danh mục tác phẩm, hợp đồng dịch thuật/hiệu đính theo hợp phần được gán.

## Cấu trúc bộ hướng dẫn

- [01-Dang_nhap.md](./01-Dang_nhap.md) – Đăng nhập/đăng xuất và lỗi thường gặp
- [02-Dashboard_Bao_cao.md](./02-Dashboard_Bao_cao.md) – Dashboard, báo cáo, bộ lọc nhanh, sắp xếp, chế độ xem
- [03-Cong_viec_chung.md](./03-Cong_viec_chung.md) – Quản lý công việc chung (tạo/sửa/xóa, phân công nhiều nhân sự, đánh giá)
- [04-Bien_tap.md](./04-Bien_tap.md) – Công việc Biên tập (workflow theo bông, theo dõi tiến độ theo tác phẩm)
- [05-Thiet_ke.md](./05-Thiet_ke.md) – Công việc Thiết kế (lọc/sắp xếp/xuất Excel, trợ lý thiết kế)
- [06-CNTT.md](./06-CNTT.md) – Công việc CNTT/Quét trùng lặp (lọc/sắp xếp/xuất Excel, phân công nhiều nhân sự)
- [07-Thu_ky_hop_phan.md](./07-Thu_ky_hop_phan.md) – Thư ký hợp phần (công việc + danh mục tác phẩm + hợp đồng)
- [08-Thong_bao.md](./08-Thong_bao.md) – Thông báo: quan trọng/đã đọc/chưa đọc, lọc và thao tác nhanh
- [09-Tai_khoan_Cai_dat.md](./09-Tai_khoan_Cai_dat.md) – Tài khoản cá nhân: avatar, đổi mật khẩu, ngôn ngữ, giao diện
- [10-Quan_tri_Nguoi_dung.md](./10-Quan_tri_Nguoi_dung.md) – Quản trị người dùng (chỉ Admin)

## Thuật ngữ và quy ước chung

- **Công việc/Task**: một đầu việc cần theo dõi.
- **Nhóm/Group**: phân loại công việc theo nhóm chức năng (Công việc chung, Biên tập, Thiết kế, CNTT, …).
- **Trạng thái/Status**:
  - **Not Started**: Chưa bắt đầu
  - **In Progress**: Đang tiến hành
  - **Pending**: Tạm dừng
  - **Cancelled**: Đã hủy
  - **Completed**: Hoàn thành
- **Mức ưu tiên/Priority**: Low/Medium/High/Critical.
- **Lưu trữ/Archived**: công việc đã đưa vào lưu trữ (có thể bật “Bao gồm lưu trữ” để xem).

## Tóm tắt thao tác nhanh (5 phút)

1. Đăng nhập theo [01-Dang_nhap.md](./01-Dang_nhap.md).
2. Vào **Dashboard** để xem tổng quan, dùng ô **Tìm kiếm**, bộ lọc **Nhóm/Năm/Trạng thái**, và chuyển **Bảng/Kanban/Lịch** theo [02-Dashboard_Bao_cao.md](./02-Dashboard_Bao_cao.md).
3. Mở trang nhóm công việc (Công việc chung/Biên tập/Thiết kế/CNTT…) từ menu bên trái.
4. Dùng **Bộ lọc** (Nhân sự/Hợp phần/Giai đoạn/Trạng thái/Năm/Đánh giá/Ngày) để thu hẹp danh sách; bấm tiêu đề cột để **sắp xếp**.
5. Bấm **Xuất Excel** để tải danh sách theo bộ lọc hiện tại.
6. Nhấn biểu tượng **Chuông** để xem thông báo, đánh dấu **Quan trọng/Đã đọc/Chưa đọc** theo [08-Thong_bao.md](./08-Thong_bao.md).
7. Vào **Tài khoản của tôi** để đổi mật khẩu/cập nhật avatar theo [09-Tai_khoan_Cai_dat.md](./09-Tai_khoan_Cai_dat.md).
