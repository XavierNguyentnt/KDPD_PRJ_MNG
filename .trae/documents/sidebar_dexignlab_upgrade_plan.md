# Nâng cấp Sidebar theo mẫu DexignLab Workload — Implementation Plan

## Repository Research

### Hiện trạng Sidebar (Banner V.2 "Kinh điển Phương Đông")
File chính: [layout.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/layout.tsx#L408-L775)
- **2 mode desktop**: Expanded (256px icon+label) ↔ Collapsed (64px icon rail)
- **Thành phần**: Logo area (logo + tên đơn vị + tagline) · Toggle hamburger→X · Nav items (box icon riêng + label) · Footer promo card ("Ghi chú làm việc nhóm")
- **Style phức tạp**: Nền gradient giấy mộc thổ, viền vàng dashed, drop shadow đa lớp, active state = thanh chỉ báo glow bên phải + nền gradient vàng nhạt
- **Sidebar tokens** (trong [index.css](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/index.css#L57-L124)): `--sidebar-bg` (hơi vàng đất), `--sidebar-active-bg` (vàng Đường), `--sidebar-glow` (vàng anh)

### Thiết kế tham chiếu (DexignLab Workload)
Từ URL `https://workload.dexignlab.com/codeigniter/demo/index`:
1. **Icon-rail thu gọn** (mặc định collapsed, không có expanded mode): chiều rộng ~64px, nền trắng sạch
2. **Icon button dạng tròn/vuông bo tròn** (~48-52px), mỗi item là một container riêng biệt, padding rộng
3. **Active state = FILL NỀN** thay vì thanh indicator bên phải: mục Dashboard → nền xanh đậm đặc (emerald/teal solid fill) + icon trắng
4. **Inactive state**: nền xám rất nhạt (#f5f5f5) + icon xám, hover nhẹ
5. **Logo top**: logo gradient tròn (xanh lá+vàng cam), khung tròn thay vì bo góc vuông
6. **Nhóm icon cuối**: 2 icon action đặc biệt (Support + Cart) dạng hình tròn gradient đầy màu sắc — nổi bật so với nav icons
7. **Clean, minimal**: Không border rườm rà, không gradient nền sidebar, không shadow nặng

### Design Decision: Giữ thương hiệu "Kinh điển Phương Đông" + áp dụng layout tham chiếu
KHÔNG chuyển sang theme xanh teal của DexignLab. Áp dụng **cấu trúc và interaction pattern** của tham chiếu, nhưng giữ hệ màu **Vàng Đường thư pháp + Lục lam Trúc Lâm** của dự án:
- Filled active background = sử dụng `--sidebar-active-bg` (vàng Đường) thay vì thanh viền phải glow
- Icon containers = bo tròn "Bát Quý" (radius 14px+) thay vì vuông nhọn
- Sidebar nền = sạch, "giấy mộc" đơn giản thay vì đa lớp gradient
- Thêm floating gold bar toggle (mép trái màn hình) như đã đề cập trong project memory

---

## Files and Modules

| File | Thay đổi dự kiến |
|---|---|
| `client/src/components/layout.tsx` | Refactor toàn bộ sidebar JSX: logo area, nav items style, toggle button, thêm floating trigger, xóa thanh indicator phải, thêm footer action icons group |
| `client/src/index.css` | Update `--sidebar-*` CSS tokens (đặc biệt `--sidebar-bg` cho nền sạch, `--sidebar-active-bg` đậm hơn cho filled), update/đơn giản hóa `.sidebar-shell`, `.sidebar-nav-item`, `.sidebar-nav-item-active` CSS classes |

---

## Implementation Steps

### Bước 1: Update CSS Tokens & Base Classes (index.css)
1.1 Điều chỉnh `--sidebar-bg` và `--sidebar-bg-elevated`: trắng/sáng hơn ("giấy sạch" thay vì giấy mộc vàng đậm), giữ ấm nhẹ theo thương hiệu
1.2 `--sidebar-active-bg`: tăng saturation/độ đậm để có thể dùng làm **nền filled active** (thay vì chỉ phủ nhẹ trước đây), đảm bảo contrast với text/icon `--sidebar-active-fg` đạt WCAG AA
1.3 Update class `.sidebar-shell`: loại bỏ radial gradient + đa lớp shadow, thay bằng nền sạch + 1 viền phải mỏng
1.4 Refactor `.sidebar-nav-item` và `.sidebar-nav-item-active`:
   - Nav item = bo góc lớn (rounded-xl / 2xl) giống tham chiếu
   - **Active state = filled background đặc** (loại bỏ thanh indicator glow bên phải)
   - Inactive = nền `--sidebar-bg-elevated` rất nhạt, border subtle
   - Hover = tăng độ đậm nhẹ nền
1.5 Dark mode: áp dụng tương tự, dùng `--sidebar-active-bg` dark cho filled nền (hiện tại 210 40% 18% — đủ đậm)

### Bước 2: Redesign Sidebar JSX Structure (layout.tsx)
2.1 **Logo area tối giản**:
   - Logo container dạng hình tròn (not rounded rectangle) — giống tham chiếu
   - Khi collapsed: chỉ hiển thị logo tròn, full width căn giữa
   - Khi expanded: logo tròn + tên VP + tagline (giữ lại không bỏ)

2.2 **Toggle button đơn giản hóa**:
   - Loại bỏ hamburger→X animation phức tạp 3 thanh hiện tại
   - Thay bằng icon `ChevronRight` / `ChevronLeft` đơn giản trong vòng tròn nhỏ (hoặc giữ lại style khung vuông bo tròn nhưng đơn giản hơn)

2.3 **Nav items — áp dụng pattern tham chiếu**:
   - Mỗi item: **bỏ khung icon riêng biệt (div h-8 w-8 box)**. Thay vào đó, icon nằm trực tiếp trong container item (như tham chiếu)
   - Khi **collapsed**: item = khung vuông bo tròn lớn (h-12 w-12), icon ở giữa, padding đều
   - Khi **expanded**: item = row (h-11 w-full), icon + text cách nhau gap-3
   - **Active state**: nền filled bằng `--sidebar-active-bg` + icon/text màu `--sidebar-active-fg`. **XÓA HOÀN TOÀN** span indicator bên phải (`<span className="absolute right-2 ...h-5 w-[3px]">`)
   - Inactive: nền nhạt, border subtle 1px hoặc không

2.4 **Thêm Floating Sidebar Toggle (Gold Bar)** như trong project memory đã định:
   - Nút `fixed left-0 top-1/2 -translate-y-1/2 w-[10px] h-24 rounded-r-full` — dạng "thanh vàng" lòi ra
   - Ẩn khi sidebar đang mở, hiện khi sidebar đã collapsed
   - Click để mở/đóng 2 chiều (bất kể scroll vị trí nào)
   - Background: gradient vàng Đường → vàng anh, shadow nhẹ

2.5 **Thêm Footer Action Icons Group** (khi collapsed):
   - Bottom của sidebar rail: 2 icon button tròn đặc biệt như tham chiếu
   - Vị trí 1: `Settings` (bánh răng) — mở Settings Modal (đã có logic `settingsOpen`)
   - Vị trí 2: `Smartphone` (PWA Install) — mở PWA prompt (nếu có sẵn / chưa dismiss 7 ngày)
   - Nền gradient brand (amber→rose hoặc amber→teal) cho 2 nút này để nổi bật so với nav icons
   - Khi expanded → chuyển thành dạng row "Cài đặt" + "Cài đặt ứng dụng" (giống nav items thường)

2.6 **Footer promo card "Ghi chú làm việc nhóm"**:
   - Giữ lại khi expanded (dùng làm Help/Quick Tips card)
   - Khi collapsed → ẩn (như cũ)
   - Style đơn giản hóa theo tông mới (bỏ radial blur quá rực rỡ)

2.7 **Mobile Sidebar (Sheet)**: Cập nhật style tương ứng cho consistency (nền sạch, bo góc lớn active items, filled active state)

2.8 **Reset scroll sidebar khi mở**: Giữ logic cũ (đã implement trong memory notes) — đảm bảo không bị cuộn mất menu items

### Bước 3: Kiểm tra A11y & Responsive
3.1 Đảm bảo tất cả clickable divs có `role="button"`, `tabIndex={0}`, handler `onKeyDown` (Enter/Space)
3.2 `aria-expanded`, `aria-controls` giữ nguyên hoặc cập nhật cho buttons mới
3.3 Tooltips cho collapsed mode (hover vào icon → hiện label): tham chiếu không làm nhưng chúng ta nên giữ/them cho UX tốt
3.4 Kiểm tra grid layout ko bị vỡ khi collapse/expand (đặc biệt transition grid-template-columns)

### Bước 4: Kiểm tra Brand Consistency
4.1 Verify tất cả màu vẫn tuân thủ 3-layer mapping: CSS `--sidebar-*` HSL → inline style vars → component (không hardcode hex)
4.2 Kiểm tra contrast WCAG AA: active text ≥ 4.7:1 so với nền active, inactive text ≥ 4.7:1 so với nền sidebar

---

## Dependencies and Considerations
- **Zero new dependencies**: Sử dụng existing lucide icons (ChevronRight/Left, Settings, Smartphone đã có imports trong layout.tsx)
- **Giữ nguyên state management**: `sidebarOpen`, `mobileSidebarOpen`, `settingsOpen` hooks không đổi
- **Hard constraint nhớ**: "Không được tự động đóng Sidebar khi click ra ngoài" — giữ nguyên rule này
- **Hard constraint nhớ**: `Sticky Sidebar h-screen` với overflow-y-auto độc lập — giữ nguyên architecture
- **Impact đến mobile**: Sheet content class `.sidebar-shell` dùng chung CSS, nên khi update shell sẽ ảnh hưởng cả mobile (mong muốn consistency)

---

## Validation
1. **TypeScript strict exit 0**: `cd client && npx tsc --noEmit`
2. **Full Build Pass**: `cd client && npm run build` (check build delta JS ≤ 2%, CSS ≤ 1%)
3. **Visual Inspection**: Chạy dev server (`npm run dev`) và kiểm tra:
   - Sidebar expanded mode: look clean, items bo góc lớn, active filled nền vàng/teal, không có thanh indicator phải
   - Sidebar collapsed mode: icon rail, mỗi icon trong khung tròn/bo lớn, active filled nền
   - Floating gold bar: hiện khi collapsed, ẩn khi expanded, click toggle works ở bất kỳ scroll vị trí nào
   - Footer action icons (Settings + Smartphone): visible ở collapsed mode với nền gradient đặc biệt
   - Mobile Sheet: style tương đồng
   - Dark/Light toggle: cả 2 mode hoạt động đúng màu tokens
4. **A11y check**: Tab navigation works, Enter/Space activates items, keyboard shortcut (nếu có)
5. **Contrast**: Kiểm tra visual active text/background đủ tương phản

---

## Risks
| Risk | Xử lý / Fallback |
|---|---|
| Transition grid-template-columns bị giật khi đổi style nav items | Đảm bảo animation duration giữ `320ms cubic-bezier(0.22,1,0.36,1)`, chỉ đổi bên trong items, không đổi outer grid gap |
| Filled active nền quá giống hover state → khó phân biệt | Active = dùng `--sidebar-active-bg` đặc + ring 2px bên trong; Hover = nền nhạt hơn active, không có ring |
| Floating gold bar bị che bởi content hoặc sidebar khi mở | `z-40` cho floating bar; dùng CSS `:not([data-sidebar-open="true"])` hoặc conditional render nếu cần; test z-index stack với `#main-content` (header sticky có z-10) |
| Nav items khi thu nhỏ collapsed mode có kích thước quá nhỏ → khó click | Dùng h-12 w-12 (≥ 48px — đạt touch target 44x44 Apple HIG) |
| CSS class specificity bị conflict `.sidebar-nav-item-active` mới vs. inline style cũ | Remove toàn bộ inline style trên nav items, ưu tiên dùng CSS class trong `index.css` + chỉ dùng inline style cho `hsl(var(--...))` color references |
