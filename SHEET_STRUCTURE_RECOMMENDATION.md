# Đề xuất cấu trúc Google Sheets - Quản lý công việc theo thời gian thực

## Tổng quan

Thay vì tạo file mới mỗi tháng, bạn có thể sử dụng **1 file Google Sheets duy nhất** để quản lý tất cả công việc theo thời gian thực.

## Cấu trúc đề xuất

### Sheet 1: "DỮ LIỆU CHUNG" (Master Data Sheet)
**Mục đích**: Chứa tất cả công việc từ mọi tháng, mọi năm

**Cấu trúc cột đề xuất**:
| Cột | Tên cột | Mô tả | Ví dụ |
|-----|---------|-------|-------|
| A | **Năm** | Năm của công việc | 2026 |
| B | **Tháng** | Tháng của công việc | 1, 2, 3... hoặc T1/26 |
| C | **Ngày nhập** | Ngày tạo công việc | 01/09/2024 |
| D | **Hợp phần/ Nhiệm vụ** | Mô tả ngắn | Họp thường trực |
| E | **Nội dung công việc** | Chi tiết công việc | Chuẩn bị tài liệu họp |
| F | **Phân loại nhóm CV** | Nhóm công việc | Hành chính |
| G | **Mức ưu tiên** | Độ ưu tiên | Cao, Trung bình, Thấp |
| H | **THỜI GIAN THỰC HIỆN** | Deadline hoặc thời gian dự kiến | 15/01/2026 |
| I | **Người phụ trách** | Người được giao | Nguyễn Văn A |
| J | **Trạng thái** | Trạng thái hiện tại | Chưa bắt đầu, Đang tiến hành, Hoàn thành |
| K | **Tiến độ (%)** | Phần trăm hoàn thành | 0, 25, 50, 75, 100 |
| L | **Ghi chú** | Ghi chú bổ sung | Đã hoàn thành đúng hạn |

**Lợi ích**:
- ✅ Tất cả dữ liệu ở một nơi, dễ tìm kiếm
- ✅ Có thể filter/sort theo năm, tháng, trạng thái
- ✅ Dễ dàng tạo báo cáo tổng hợp
- ✅ Không cần tạo file mới mỗi tháng

### Sheet 2-7: Các sheet báo cáo (tự động filter từ DỮ LIỆU CHUNG)

Các sheet báo cáo có thể sử dụng công thức Google Sheets để tự động lấy dữ liệu từ "DỮ LIỆU CHUNG":

**Ví dụ công thức filter theo tháng**:
```excel
=FILTER('DỮ LIỆU CHUNG'!A:L, 'DỮ LIỆU CHUNG'!B:B="T1/26")
```

**Các sheet báo cáo**:
1. **"BÁO CÁO CHUNG CV-BTK"** - Báo cáo tổng hợp (có thể filter theo tháng)
2. **"BÁO CÁO CÔNG VIỆC THEO NHÂN SỰ"** - Báo cáo theo người
3. **"CV chung"** - Tất cả công việc chung
4. **"Biên tập"** - Công việc nhóm Biên tập
5. **"Thiết kế + CNTT"** - Công việc nhóm Thiết kế + CNTT
6. **"Quét trùng lặp"** - Công việc quét trùng lặp

## Cách chuyển đổi từ hệ thống cũ

### Bước 1: Tổng hợp dữ liệu
1. Mở tất cả các file Google Sheets cũ (T1/26, T2/26, v.v.)
2. Copy tất cả dữ liệu vào sheet "DỮ LIỆU CHUNG"
3. Thêm cột "Năm" và "Tháng" để phân biệt

### Bước 2: Cập nhật sheet báo cáo
1. Sử dụng công thức FILTER để tự động lấy dữ liệu từ "DỮ LIỆU CHUNG"
2. Cập nhật các công thức trong sheet báo cáo để filter theo tháng hiện tại

### Bước 3: Sử dụng ứng dụng
- Ứng dụng sẽ tự động đọc từ sheet "DỮ LIỆU CHUNG"
- Khi tạo/cập nhật công việc mới, dữ liệu sẽ được ghi vào "DỮ LIỆU CHUNG"
- Các sheet báo cáo sẽ tự động cập nhật nhờ công thức FILTER

## Lợi ích của cách tiếp cận này

### 1. Quản lý tập trung
- ✅ Tất cả dữ liệu ở một nơi
- ✅ Dễ backup và quản lý
- ✅ Không bị phân tán dữ liệu

### 2. Theo dõi theo thời gian thực
- ✅ Ứng dụng web cập nhật ngay lập tức
- ✅ Google Sheets cũng cập nhật real-time
- ✅ Đồng bộ 2 chiều

### 3. Báo cáo linh hoạt
- ✅ Có thể xem báo cáo theo tháng, năm, nhóm
- ✅ Tự động filter không cần chỉnh sửa thủ công
- ✅ Dễ dàng tạo dashboard tổng hợp

### 4. Lịch sử đầy đủ
- ✅ Xem được tất cả công việc đã làm
- ✅ Phân tích xu hướng theo thời gian
- ✅ Đánh giá hiệu suất dài hạn

## Cấu hình ứng dụng

Ứng dụng hiện tại đã được cấu hình để:
- ✅ Đọc từ sheet "DỮ LIỆU CHUNG" (tự động phát hiện)
- ✅ Hỗ trợ đầy đủ CRUD operations
- ✅ Map đúng các cột tiếng Việt
- ✅ Tự động phát hiện header row

## Lưu ý

1. **Performance**: Với dữ liệu lớn (hàng nghìn tasks), nên sử dụng filter trong Google Sheets thay vì load tất cả
2. **Backup**: Nên backup định kỳ file Google Sheets
3. **Permissions**: Đảm bảo Service Account có quyền Editor để ghi dữ liệu

## Ví dụ cấu trúc dữ liệu

```
Năm | Tháng | Ngày nhập | Hợp phần | Nội dung công việc | ... | Trạng thái
2026| T1/26 | 01/09/2024| Họp     | Chuẩn bị tài liệu  | ... | Hoàn thành
2026| T1/26 | 05/09/2024| Biên tập| Rà soát bản dịch   | ... | Đang tiến hành
2026| T2/26 | 01/02/2026| CNTT    | Cập nhật hệ thống  | ... | Chưa bắt đầu
```

Với cấu trúc này, bạn có thể:
- Filter theo tháng: `=FILTER(A:L, B:B="T1/26")`
- Filter theo năm: `=FILTER(A:L, A:A=2026)`
- Filter theo trạng thái: `=FILTER(A:L, J:J="Hoàn thành")`
