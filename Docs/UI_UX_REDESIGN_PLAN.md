# 🎨 KẾ HOẠCH ĐIỀU CHỈNH UI/UX CHI TIẾT — KDPD PROJECT MANAGEMENT

> **Tài liệu tham chiếu:** Hướng dẫn thực hiện tái cấu trúc & tối ưu giao diện người dùng
> **Phạm vi áp dụng:** Toàn bộ 8 trang frontend React Vite shadcn/ui
> **Nguyên tắc vàng:** 80% thống nhất (Design System chung) + 20% đặc trưng (tùy biến nghiệp vụ)
> **Ngày lập:** 22/09/2026
> **Tình trạng:** Đã duyệt kế hoạch — Chờ triển khai Giai đoạn 1

---

## MỤC LỤC

1. [Tổng quan & Mục tiêu](#1-tổng-quan--mục-tiêu)
2. [Đánh giá hiện trạng — Thống nhất & Chênh lệch](#2-đánh-giá-hiện-trạng--thống-nhất--chênh-lệch)
3. [Design System Mới — Palette & Typography & Spacing](#3-design-system-mới--palette--typography--spacing)
4. [Unified Group Page Template — Bố cục mẫu 80% chung](#4-unified-group-page-template--bố-cục-mẫu-80-chung)
5. [Kế hoạch chi tiết từng Trang — 7 Menu nghiệp vụ](#5-kế-hoạch-chi-tiết-từng-trang--7-menu-nghiệp-vụ)
   - [5.1 Công việc chung](#51-công-việc-chung-cv-chung)
   - [5.2 Biên tập](#52-biên-tập-biên-tập)
   - [5.3 Thiết kế](#53-thiết-kế-thiết-kế)
   - [5.4 CNTT](#54-cntt-cntt)
   - [5.5 Thư ký hợp phần](#55-thư-ký-hợp-phần-thư-ký-hợp-phần)
   - [5.6 Nhóm — Team Performance](#56-nhóm--team-performance-team)
   - [5.7 Quản trị — Admin Dashboard & Users](#57-quản-trị--admin-dashboard--users-admin)
6. [Checklist Thống nhất Toàn cục — 20 Công việc G1–G20](#6-checklist-thống-nhất-toàn-cục--20-công-việc-g1g20)
7. [Lộ trình Thực thi 4 Giai đoạn & Độ ưu tiên](#7-lộ-trình-thực-thi-4-giai-đoạn--độ-ưu-tiên)
8. [File Mapping — Mỗi thay đổi liên kết file mã nguồn](#8-file-mapping--mỗi-thay-đổi-liên-kết-file-mã-nguồn)

---

## 1. TỔNG QUAN & MỤC TIÊU

### 1.1 Ba vấn đề cốt lõi cần giải quyết (từ yêu cầu người dùng)
1. **Dashboard quá tải** — hiện 8 khối lớn trong 1 trang dài (Greeting + 2 activity cards + 5 badges + 2 pie + 2 bar + 1 trend line + Full task section 7 controls + 20 assignee badges)
2. **Bộ lọc chi tiết quá mức** — 8+ controls hàng header + 9-12 trường TaskFilters + 20 assignee badges hàng thứ 3
3. **Màu sắc đơn điệu** — Palette shadcn default trung tính chỉ có 1 màu primary xanh dương; Sidebar active màu tím rời bộ

### 1.2 Mục tiêu tổng thể
- Giảm **cognitive load** người dùng mới (trang Dashboard 3 tab thay vì 1 page 3màn cuộn)
- **Feature parity** đồng bộ 6 duplicate `handleExportTasks` / `getStatusColor` / `getPriorityColor` → 1 nguồn utils
- **Phân tầng bộ lọc** theo Progressive Disclosure Pattern (2-3 ngoài / còn lại trong Popover nâng cao + Indicator)
- **Nhận diện thương hiệu Kinh điển phương Đông** qua Palette 6 màu nhóm (Xanh gốm / Đỏ gốm / Vàng đất sách cổ / Tím / Xanh lam / Xanh kỹ thuật)
- **Không thay đổi dữ liệu backend** — toàn bộ thay đổi chỉ Frontend (Component + CSS + Hook refactor)

### 1.3 File trọng tâm cần tham chiếu
| Loại | Đường dẫn tuyệt đối |
|---|---|
| Dashboard (đánh giá) | [dashboard.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/dashboard.tsx) |
| CSS Variables gốc (sửa) | [index.css#L7-L71](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/index.css#L7-L71) |
| Sidebar active (sửa màu) | [layout.tsx#L448](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/layout.tsx#L448) |
| Sidebar auto-close (xoá handler) | [layout.tsx#L160-L190](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/layout.tsx#L160-L190) |
| Hook Control Task (golden hook) | [use-task-list-controls.ts](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/hooks/use-task-list-controls.ts) |
| Utils chung (thêm export/color fn) | [utils.ts](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/lib/utils.ts) |
| Task Form (tab hóa 4 khu vực) | [task-dialog.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/task-dialog.tsx) |
| Task Filters (2-tier disclosure) | [task-filters.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/task-filters.tsx) |
| Task Table (Column Picker mặc định) | [task-table.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/task-table.tsx) |
| Login (2 cột Brand Identity) | [login.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/login.tsx) |
| Tailwind config (group accent colors) | [tailwind.config.ts](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/tailwind.config.ts) |

---

## 2. ĐÁNH GIÁ HIỆN TRẠNG — THỐNG NHẤT & CHÊNH LỆCH

### 🟢 2.1 Các thành phần ĐÃ thống nhất TỐT (giữ nguyên + polish nhẹ)
| Thành phần | Mức độ | Ưu điểm |
|---|---|---|
| `TaskStatsBadgesOnly` (4 badges: Tổng/Đang làm/Quá hạn/Đánh giá) | ✅ 5/5 trang | API nhất quán: `tasks`, `activeKey`, `onSelectKey` |
| `TaskFilters` component 9-12 trường | ✅ 5/5 trang | Props `showVoteFilter`, `showRoundTypeFilter` tùy biến Biên tập |
| `TaskTable` + `TaskKanbanBoard` Toggle view | ✅ 5/5 trang | Actions object `{onView, onEdit, onDuplicate, onDelete}` |
| `TaskDialog` (View/Edit mode) | ✅ 5/5 trang | Pattern `<TaskDialog open mode task onCreate/>` |
| `BienTapWorkProgress`, `AdminUsersPage` | ⭐ Component riêng | Đã implement đúng tinh thần nghiệp vụ |
| Mobile responsive Team / AdminUsers | ⭐ Switch Card ↔ Table theo breakpoint md | Áp dụng pattern này cho toàn bộ TaskTable |

### 🔴 2.2 Các thành phần CHƯA thống nhất (Fix GLOBAL trước)
| Vấn đề | Ảnh hưởng | Sửa thành |
|---|---|---|
| **6 bản copy-paste `handleExportTasks`** (148-260 dòng/file) | [cv-chung.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/cv-chung.tsx), [bien-tap.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/bien-tap.tsx), [thiet-ke.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/thiet-ke.tsx), [cntt.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/cntt.tsx), [thu-ky-hop-phan.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/thu-ky-hop-phan.tsx), [dashboard.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/dashboard.tsx) | 1 hàm `exportTasksToExcel(tasks, opts)` trong [lib/utils.ts](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/lib/utils.ts) |
| **6 bản `getStatusColor` chênh lệch màu** | `Pending`: file này `yellow-50`, file kia `amber-100`; `In Progress`: `blue-50` vs `blue-100` | `getTaskStatusColor(status)` → return `hsl(var(--status-X)/15) hsl(var(--status-X)/80)` chuẩn HSL variable |
| **6 bản `getPriorityColor` chênh lệch** | `Critical`: `red-100` vs `rose-100`; `Medium`: `blue-100` vs `indigo-100` | `getTaskPriorityColor(priority)` → 1 nguồn utils |
| **`useTaskListControls` không dùng ở 2 trang** | [cv-chung.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/cv-chung.tsx) + [dashboard.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/dashboard.tsx) tự viết filter → ra kết quả khác biệt nhẹ | Refactor 2 trang này dùng chung hook [use-task-list-controls.ts](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/hooks/use-task-list-controls.ts) |
| **`Duplicate` action thiếu 2 trang** | CV-chung ❌, CNTT ❌ (chỉ Thiết kế ✅ Biên tập ✅) | Thêm `onDuplicate` handler với role mapping riêng từng nhóm |
| **Sidebar active `bg-violet-100`** | [layout.tsx:L448](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/layout.tsx#L448) rời palette xanh primary | Đổi `bg-violet-100 text-violet-700 dark:bg-violet-900/40` → `bg-primary/12 text-primary dark:bg-primary/25` |
| **Auto-close sidebar click outside** | [layout.tsx:L160-L190](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/layout.tsx#L160-L190) cản người dùng mở rộng làm việc | Remove `useEffect` handler này hoàn toàn |
| **Toast duration không chuẩn** | Mỗi nơi gọi `toast()` khác duration | Đặt `duration: 4000` mặc định trong ToastProvider / useToast hook |
| **Loading chỉ có Spinner đơn** | 8/8 trang dùng `<Loader2 animate-spin>` | Thay bằng Skeleton shadcn (đã có sẵn trong [ui/skeleton.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/ui/skeleton.tsx)) — tạo 3 wrapper: `TaskTableSkeleton`, `CardGridSkeleton`, `TeamMemberSkeleton` |
| **Column default mỗi trang tự do** | `columns={{...}}` map bật/tắt khác nhau không có quy ước | Định nghĩa `DEFAULT_GROUP_COLUMNS[groupCode]` Object trong `lib/utils.ts` |
| **Thu-ky-hop-phan 32 state trong 1 file** | [thu-ky-hop-phan.tsx:L790-L897](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/thu-ky-hop-phan.tsx#L790-L897): 8 state × 4 tabs khai báo dài 107 dòng | Tách 3 custom hooks: `useThuKyTasksTab`, `useThuKyWorksTab`, `useThuKyContractsTab` |

### 🎨 2.3 Bảng Group Accent Color — 6 nhóm 6 sắc văn hóa Việt
| Menu | Mã nhóm | Accent HSL | Nguồn cảm hứng | Ứng dụng (ví dụ) |
|---|---|---|---|---|
| Công việc chung | `cv_chung` | `210° 40% 45%` Xanh lam nhạt | Màu áo dài truyền thống | Stat bar trái, icon group, role badge "Kiểm soát" |
| **Biên tập** ✅ PRIMARY | `bien_tap` | `197° 68% 32%` **Xanh gốm Bát Tràng** | Men gốm lam cổ | Default primary; Workflow stepper; Round type pills |
| Thiết kế | `thiet_ke` | `270° 55% 55%` Tím tươi | Màu lam Khuê Văn Các ngoại cảnh | Card hover ring; Helper badge; Role "KTV chính" |
| CNTT | `cntt` | `215° 60% 38%` Xanh đậm kỹ thuật | Mực in / Điện tử | Role badge "Kỹ thuật viên"; Group pill "Quét trùng lặp" |
| Thư ký hợp phần | `thu_ky_hp` | `38° 72% 48%` Vàng đất | Giấy sách cổ / vàng hài nghi lễ | Finance summary; Contract pills; Số tiền VND |
| Quản trị | `admin` | `15° 65% 48%` **Đỏ gốm** Hương Canh | Gốm lam đỏ cổ (accent + danger) | Warning lock icon; Shield role; Overdue highlight |
| Nhóm (Team) | `team` | Gradient theo role thành viên | Avatar ring — linh hoạt | Member card ring gradient theo role chính |

---

## 3. DESIGN SYSTEM MỚI — PALETTE & TYPOGRAPHY & SPACING

### 3.1 Overwrite CSS Variables (Sửa file `index.css` [L7-L71](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/index.css#L7-L71))
```css
:root {
  --background: 40 30% 97%;       /* Giấy cổ nhạt ấm (thay default trung tính trắng lạnh) */
  --foreground: 25 25% 18%;       /* Mực đen nâu ấm (dễ đọc hơn #000) */
  --card: 0 0% 100%;
  --card-foreground: 25 25% 18%;
  --popover: 0 0% 100%;
  --popover-foreground: 25 25% 18%;

  --primary: 197 68% 32%;         /* ✅ XANH GỐM BÁT TRÀNG (default = Biên tập) */
  --primary-foreground: 0 0% 100%;

  --secondary: 38 62% 90%;        /* Vàng đất sách cổ (Thư ký) */
  --secondary-foreground: 25 60% 20%;

  --accent: 15 65% 50%;           /* 🔴 ĐỎ GỐM (Quản trị / Warning accent) */
  --accent-foreground: 0 0% 100%;

  --muted: 35 18% 92%;            /* Xám ấm (thay xám 210° lạnh) */
  --muted-foreground: 25 12% 42%; /* Nâu nhạt (contrast >4.5:1 đạt WCAG AA — trước đây fail) */

  --destructive: 0 72% 45%;       /* Giữ nguyên đỏ thiệt hại */
  --destructive-foreground: 0 0% 100%;

  --border: 35 20% 85%;           /* Border ấm (thay 214°) */
  --input: 35 20% 85%;
  --ring: 197 68% 32%;            /* Ring đồng bộ primary */
  --radius: 0.75rem;              /* Giữ nguyên 12px shadcn New York */

  /* Group Accent Custom (extend tailwind config) */
  --group-cvchung: 210 40% 45%;   /* Xanh lam */
  --group-bientap: 197 68% 32%;   /* Primary */
  --group-thietke: 270 55% 55%;   /* Tím */
  --group-cntt: 215 60% 38%;      /* Xanh kỹ thuật */
  --group-thuky: 38 72% 48%;      /* Vàng đất */
  --group-admin: 15 65% 48%;      /* Đỏ gốm */

  /* Status colors (cho getStatusColor trả về HSL) */
  --status-success: 142 70% 40%;  /* Xanh lá Completed */
  --status-info: 197 90% 50%;     /* Xanh In Progress */
  --status-warning: 38 85% 55%;   /* Vàng Pending / Expiring */
  --status-danger: 0 72% 50%;     /* Đỏ Quá hạn / Cancelled */
  --status-muted: 25 10% 55%;     /* Xám nâu Not Started */
}

.dark { /* — Giữ nguyên dark palette, chỉ tune nhẹ theo ấm — */
  --background: 25 15% 8%;
  --foreground: 35 25% 95%;
  --muted: 25 10% 18%;
  --muted-foreground: 35 10% 65%;
  --border: 25 10% 22%;
  --input: 25 10% 22%;
}
```

### 3.2 Extend Tailwind Config — Thêm group colors & bg-opacity
Sửa file [tailwind.config.ts](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/tailwind.config.ts) → `theme.extend.colors`:
```ts
colors: {
  // ... existing shadcn colors
  group: {
    cvchung: 'hsl(var(--group-cvchung) / <alpha-value>)',
    bientap: 'hsl(var(--group-bientap) / <alpha-value>)',
    thietke: 'hsl(var(--group-thietke) / <alpha-value>)',
    cntt: 'hsl(var(--group-cntt) / <alpha-value>)',
    thuky: 'hsl(var(--group-thuky) / <alpha-value>)',
    admin: 'hsl(var(--group-admin) / <alpha-value>)',
  },
  status: {
    success: 'hsl(var(--status-success) / <alpha-value>)',
    info: 'hsl(var(--status-info) / <alpha-value>)',
    warning: 'hsl(var(--status-warning) / <alpha-value>)',
    danger: 'hsl(var(--status-danger) / <alpha-value>)',
    muted: 'hsl(var(--status-muted) / <alpha-value>)',
  },
}
```

### 3.3 Typography & Spacing (Keep, extend)
- ✅ **Giữ nguyên** Font family `Inter (body) + Outfit (display)`, Scale 4/5 spacing, Radius 0.75rem
- Mở rộng class `.font-display` cho: Page hero title, Stat numbers (team cards/dashboard), Badge số lớn
- Add class `.text-shadow-sm` cho tiêu đề trắng trên nền gradient (login page)
- **Table typography standard:** Header `text-xs uppercase tracking-wider text-muted-foreground font-semibold` (chuẩn hóa 5 trang group)

---

## 4. UNIFIED GROUP PAGE TEMPLATE — BỐ CỤC MẪU 80% CHUNG

> Áp dụng cho 5 trang: Công việc chung / Biên tập / Thiết kế / CNTT / Tab Công việc (Thu-ky)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PAGE HERO (4px Accent bar trái theo nhóm)                                   │
│ ┌─┐                                                                         │
│ │█│ [Icon nhóm màu accent]  TIÊU ĐỀ NHÓM .font-display .text-2xl           │
│ │█│                         Định nghĩa 1 dòng ngắn gọn nghiệp vụ nhóm       │
│ │█│                         [Right] Đồng bộ lúc h:mm a · [↻ Refresh btn]    │
│ └─┘                                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ TASK STATS BADGES (4 badges gốc + 1 badge mới Đánh giá TB)                  │
│ [ Tổng 120 ] [ Đang làm 38 bg-info/15 ] [ Quá hạn 5 bg-danger/15 ]          │
│ [ Chưa bắt đầu 20 bg-muted ] [ ⭐ Đánh giá TB 4.2/5.0 bg-secondary ]        │
├─────────────────────────────────────────────────────────────────────────────┤
│ SECTION HEADER / TOOLBAR (Flex wrap responsive)                             │
│ [Left side - wrap gap-3:]                                                    │
│   🔍 Search (gộp title + assignee + id + work liên quan) .w-full sm:w-80    │
│   Badge "N công việc" (secondary)                                           │
│ [Right side - wrap gap-2 sm:gap-3:]                                         │
│   ⚙️ Bộ lọc nâng cao (Popover) + [🔴 Badge "3 filters" nếu có ≥1]           │
│   📥 Excel (nếu có permission)                                               │
│   👁 View Toggle Segmented: [Danh sách 📋] [Kanban 📊] [Lịch 📆]            │
│   ＋ Tạo mới [Primary variant]                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ DATA VIEW (1 trong 3 view modes, Table mặc định)                            │
│ ┌─ Table View mặc định ─────────────────────────────────────────────────┐   │
│ │ ⚙️ Column Picker gear icon (top-right) · Preset Views: [Cơ bản 6 cột] │   │
│ │ [Đầy đủ 12 cột] [Theo vai trò (đặc thù nhóm)]                         │   │
│ │ Cột mặc định 6 cột: ID | Title | Role1 đặc thù | Avatars tổng hợp |   │   │
│ │                                 Tiến độ bar | Hạn (nếu overdue đỏ)    │   │
│ │ → Sortable tất cả cột mặc định; Sticky ID + Title scroll ngang        │   │
│ │ → Pagination 10/25/50 dòng (mới thêm selector page size)              │   │
│ └────────────────────────────────────────────────────────────────────────┘   │
│ ┌─ Kanban View ─────────────────────────────────────────────────────────┐   │
│ │ 5 cột (Not Started / Pending / In Progress / Completed / Cancelled)   │   │
│ │ WIP Limit badge mỗi cột (vd In Progress: [8/10] nếu setup)            │   │
│ │ Column trống → Drop zone placeholder "Kéo thả task vào đây"           │   │
│ └────────────────────────────────────────────────────────────────────────┘   │
│ ┌─ Calendar View (nếu có) ──────────────────────────────────────────────┐   │
│ │ Week numbers (cột 1) · Holiday indicator 🎉 · Overdue cell đỏ bg      │   │
│ │ Month / Week / Day 3 modes toggle                                     │   │
│ └────────────────────────────────────────────────────────────────────────┘   │
│ • Loading: Skeleton shimmer (thay Loader2 spin)                              │
│ • Empty State: Illustration vector + Text 2 dòng + [CTA button: "＋ Tạo CV đầu tiên"] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Thiết kế Bộ lọc 2-tier (Progressive Disclosure)
- **Lớp 1 — Hiển thị sẵn trên màn hình (ngoài Toolbar):** Chỉ 3 mục phổ biến: `Search`, `Status Quick` (5 segmented badges Tất cả/Đang làm/Quá hạn/Hoàn thành/Chưa bắt đầu — giống stats nhanh), `Assignee` (gộp assignee badges scroll horizontal)
- **Lớp 2 — Nâng cao (ẩn trong Popover `⚙️ Bộ lọc nâng cao`):** 9-12 trường còn lại (Nhóm lọc chi tiết, Priority, Vote, Round Type, Hợp phần, Giai đoạn, Năm, Khoảng ngày nhận, Khoảng hạn, Tác phẩm, Keywords, Archived toggle)
- **Indicator:** Khi có bất kỳ filter nào ở Lớp 2 khác default → Hiện Badge số đỏ: `[🔴 3 filters]` + hover tooltip liệt kê các filter đang bật; click badge = Reset nhanh tất cả

### 4.2 TaskDialog 4 Tabs CHUNG (component cha — các nhóm con inject `extraTabs`)
1. **[1] Tổng quan** (luôn luôn): Title, Mô tả rich text, Status pill, Priority pill, Overall Progress bar, Ghi chú chung, Created/Updated timestamps, Created by
2. **[2] Phân công** (đặc thù mỗi nhóm inject vai trò riêng — xem chi tiết từng trang mục 5): Render cards theo role type map của nhóm
3. **[3] Liên kết** (Work + Contract + Files): Tác phẩm liên quan (Card work inline: Stage, Mã TL, 8 progress badges mini như Thu-ky) · Số HĐ dịch/ hiệu đính liên kết (nếu có) · Upload đính kèm (nếu backend hỗ trợ sau này)
4. **[4] Lịch sử** (Comment log + Activity timeline): Tất cả thay đổi status/progress/assignee (từ activity log DB nếu có; nếu chưa thì hiển thị placeholder "Sắp có")

> **Cách inject đặc thù nhóm:** TaskDialog component nhận prop `extraTabs = [{ key, title, render }]` từ page cha. Ví dụ Biên tập tab2 có Stepper 3 bước, Thiết kế tab2 có Grid 2×2 4 vai trò.

---

## 5. KẾ HOẠCH CHI TIẾT TỪNG TRANG — 7 MENU NGHIỆP VỤ

---

### 5.1 CÔNG VIỆC CHUNG (`/cv-chung`)
| Thông tin | Giá trị |
|---|---|
| **File** | [cv-chung.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/cv-chung.tsx) |
| **Accent bar** | 4px `bg-group-cvchung` (Xanh lam nhạt 210°) |
| **Hero Icon** | `ClipboardList` (lucide-react) màu group-cvchung |
| **Hero mô tả** | "Công việc văn phòng chung · Phối hợp đa bộ phận · 3 vai trò: Kiểm soát + Nhân sự N + Thực hiện chính" |
| **INCLUDED_GROUPS** | `["Công việc chung", "CV chung"]` (giữ nguyên) |
| **Vai trò đặc thù** | `kiem_soat` (1 người) + `nhan_su_1`, `nhan_su_2`... N người + `primary` người thực hiện (1 người) |

#### 5.1.1 Refactor cơ sở — Bước đầu tiên (P0)
- ✅ Bắt buộc refactor dùng `useTaskListControls` hook (thay vì tự implement filter search/sort trong `useMemo`) — đảm bảo kết quả lọc thống nhất với Thiết kế/CNTT
- ✅ Thêm `onDuplicate` action theo pattern [thiet-ke.tsx:L195-L220](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/thiet-ke.tsx#L195-L220): parse `task.assignments` → gộp riêng `kiem_soat` đầu tiên → lọc các `nhan_su_*` sắp xếp theo số đuôi → còn lại map vào `primary` người thực hiện
- ✅ Thay `handleExportTasks` copy 260 dòng → gọi `exportTasksToExcel(filteredTasks, { group: 'cv_chung', fileName: 'Cong_Viec_Chung' })` từ utils

#### 5.1.2 Default Columns Table — 6 cột mặc định (ẩn còn lại Column Picker)
```ts
// DEFAULT_GROUP_COLUMNS.cv_chung
columns = {
  id: true,              // STT/ID (sticky trái)
  title: true,           // Tiêu đề + Priority dot (sticky thứ 2)
  group: false,          // ❌ LUÔN ẨN — vì luôn CV-chung
  customColumns: [
    {
      key: 'kiem_soat',  // Cột 3: Người kiểm soát
      label: 'Kiểm soát',
      render: (t) => Avatar+Name của assignment.stageType='kiem_soat' đầu tiên
    },
    {
      key: 'nhan_su',    // Cột 4: Nhân sự (tổng hợp pill số N + hover tooltip tên từng người)
      label: 'Nhân sự',
      render: (t) => {
        const arr = assignments.filter(a => a.stageType.startsWith('nhan_su_'));
        return <Badge className="bg-group-cvchung/15 text-group-cvchung">×{arr.length}</Badge>
               + AvatarStack(arr.slice(0,3), '+N' còn lại);
      }
    },
    { key: 'progress_bar' }, // Tiến độ bar % thay text
    { key: 'due_highlight' },// Hạn hoàn thành (nếu overdue → text-danger bold + icon ⚠)
  ],
  vote: false,          // Ẩn mặc định → bật trong Column Picker "Đánh giá"
  receivedDate: false,  // Ẩn mặc định
  actualCompletedAt: false, // Ẩn mặc định
  // ... Còn 6 trường khác: người tạo, note, mô tả, giai đoạn, tác phẩm, archived → Cột Picker
}
```

#### 5.1.3 TaskDialog — Tab 2 "PHÂN CÔNG ĐA VAI TRÒ" (Inject extraTabs)
```
Tab 2 [Phân công đa vai trò]:
┌───────────────────────────────────────────────┐
│ 🛡 CARD — NGƯỜI KIỂM SOÁT (1 người / unique) │
│ [Select single user] + Ngày nhận / Hạn / Ngày HT / Progress % riêng  │
├───────────────────────────────────────────────┤
│ 👥 DANH SÁCH NHÂN SỰ (N người, expandable)    │
│ [＋ Thêm Nhân sự 1] [＋ Thêm Nhân sự 2] [＋...] │ ← tự động sinh stageType nhan_su_1 / _2 / _3
│ Mỗi Nhân sự 1 card nhỏ: Select + 3 ngày + Progress │
├───────────────────────────────────────────────┤
│ ⚡ CARD — NGƯỜI THỰC HIỆN CHÍNH (primary)     │
│ [Select single user] + Ngày nhận / Hạn / Ngày HT / Progress %  │
└───────────────────────────────────────────────┘
```

#### 5.1.4 Kanban WIP Limits (đặc thù CV-chung)
- In Progress cột → WIP = Tổng số × 3 nhân sự tối đa mỗi người (hoặc config tổng theo nhóm)
- Not Started cột → Warning nếu > 25 tasks (badge [32/25] màu warning)

---

### 5.2 BIÊN TẬP (`/bien-tap`)
| Thông tin | Giá trị |
|---|---|
| **File** | [bien-tap.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/bien-tap.tsx) |
| **Accent bar** | 4px `bg-primary` (Xanh gốm 197° = màu mặc định app ✅) |
| **Hero Icon** | `BookOpenCheck` màu primary |
| **Hero mô tả** | "Quy trình 3 giai đoạn biên tập Hán Nôm · BTV 1 → BTV 2 → Người đọc duyệt · Loại bông (Round Type) · Liên kết tác phẩm & hợp đồng" |
| **Đã có tốt** | 2 Tabs lớn `tasks` / `progress` với component [bien-tap-work-progress.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/bien-tap-work-progress.tsx) ✅ · `showRoundTypeFilter=true` ✅ · Duplicate handler có parse workflow rounds ✅ |
| **Vai trò đặc thù** | `btv1` (Biên tập viên 1) + `btv2` (Biên tập viên 2) + `doc_duyet` (Người đọc duyệt) — 3 vai trò cố định 1 người mỗi loại |

#### 5.2.1 Refactor cơ sở (P0)
- ✅ utils export tasks (giữ nguyên option headers có "Loại bông", "Tác phẩm liên quan", "Hợp phần", "GĐ") — export function chung nhận tham số `extraHeaders`
- ✅ Copy getStatusColor/getPriorityColor → utils

#### 5.2.2 Default Columns Table — 6 cột đặc thù
```ts
columns = {
  id: true,
  title: true,           // sticky
  group: false,          // LUÔN ẨN
  customColumns: [
    {
      key: 'round_type',  // ✅ Cột đặc trưng BIÊN TẬP: Pills loại bông màu
      label: 'Loại bông',
      sortable: true,
      render: (t) => {
        const rt = parseCurrentRoundType(t.workflow);
        if (!rt) return '—';
        const toneMap = { 'Bông 1': 'bg-primary/15 text-primary',
                          'Bông 2': 'bg-group-admin/15 text-group-admin', // đỏ gốm
                          'Bông 3': 'bg-group-thuky/30 text-yellow-800' };
        return <Pill className={toneMap[rt] ?? 'muted'}>{rt}</Pill>;
      }
    },
    {
      key: 'work_link',   // Cột: Tác phẩm liên quan — clickable sang Tab Thu-ky Works
      label: 'Tác phẩm',
      render: (t) => <LinkPill to="/thu-ky-hop-phan/danh-muc-tac-pham#w={t.relatedWorkId}"
                        icon="BookMarked" label={getWorkTitle(t.relatedWorkId).slice(0,24)+'…'}/>
    },
    {
      key: 'btv1_avatar', // Cột BTV 1 (avatar + name — bold vì vai trò đầu)
      label: 'BTV 1',
      render: (t) => getAssignmentByType(t.assignments, 'btv1') Avatar+Name
    },
    {
      key: 'workflow_stepper_mini', // ✅ Cột WORKFLOW MINI 3 BƯỚC inline (thay status text)
      label: 'Quy trình',
      render: (t) => <StepperMini3 btv1={completed?} btv2={completed?} doc={completed?}
                            activeStage={findActiveStage(t)} />
    }
  ],
  progress: true,        // Tiến độ bar
  dueDate: true,         // Hạn overdue đỏ
  // Ẩn: assignee (đã chia 2 cột BTV1 + Tác phẩm), vote (column picker), received, actual
}
```

#### 5.2.3 TaskDialog — Tab 2 "WORKFLOW BIÊN TẬP 3 GIAI ĐOẠN" (Inject extraTabs)
```
Tab 2 [Quy trình 3 bước]:
┌──────────────────────────────────────────────────────────┐
│ Horizontal Stepper lớn: [ BTV1 ⟶ BTV2 ⟶ Đọc duyệt ]     │
├──────────────────────────────────────────────────────────┤
│ 🔹 Round Type hiện tại: Pills 3 màu (Bông 1 / Bông 2 / Bông 3)
│    (chọn = trigger round change select trong form)
│
│ 📘 CARD BTV 1 (completed → green filled, active → border pulse)
│  · Người thực hiện [Select BTV1]
│  · Ngày nhận / Hạn / Ngày hoàn thành thực tế
│  · Tiến độ % BTV1 riêng (number input)
│  · Lời bình ngắn BTV1 [textarea 2 dòng] ← workflow comment đầu ra
│
│ 📗 CARD BTV 2 (tương tự)
│
│ 📕 CARD ĐỌC DUYỆT (tương tự, có thể switch on/off nếu không cần)
└──────────────────────────────────────────────────────────┘
```

#### 5.2.4 Tab "Theo dõi tiến độ theo tác phẩm" (BienTapWorkProgress — polish)
- Thêm **Mini Heatmap** trên mỗi Work card: 52 tuần nhỏ gradient màu primary theo số task hoàn thành tuần đó (same pattern Team page heatmap nhưng mini hơn)
- Thêm Quick Filter pills ngay đầu tab (trên Progress table): `[Tất cả] [Bông 1 đang làm] [Bông 2 đang làm] [Chuyển in] [Đã hoàn thành]` (tương đương roundType + stageWork)
- Click 1 Work row → mở **Right-side Drawer** (component `Drawer` đã có shadcn) hiển thị 8 progress badges pipeline (giống Thu-ky `buildWorkProgressBadges`) + 3 công việc biên tập gần nhất của work đó

---

### 5.3 THIẾT KẾ (`/thiet-ke`)
| Thông tin | Giá trị |
|---|---|
| **File** | [thiet-ke.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/thiet-ke.tsx) |
| **Accent bar** | 4px `bg-group-thietke` (Tím 270°) |
| **Hero Icon** | `Palette` màu group-thietke |
| **Hero mô tả** | "4 vai trò · KTV chính + Trợ lý N + BTV phê duyệt + Kiểm soát · Sao chép kế thừa phân công" |
| **Đã có tốt** | useTaskListControls ✅, Duplicate parse 4 roles ✅ (`__thietKeKtvChinh`, `__thietKeTroLyList`, `__thietKeBtv`, `__thietKeKiemSoat`), Permission check 3 cấp ✅ |
| **Vai trò đặc thù** | `ktv_chinh` (1) + `tro_ly_1`..`tro_ly_N` (multi) + `btv` phê duyệt (1) + `kiem_soat` (1) = TỔNG 4 loại cố định |

#### 5.3.1 Refactor & Fix bug (P0)
- `utils` import chung cho export/color (P0)
- `hasGroupPermission` predicate (đang viết riêng trong thiet-ke.tsx) → extract vào utils nhận params `(role, userDisplayName, userId, allowedGroupCodes, allowedGroupNames, allowedRoles)` → 5 trang dùng chung

#### 5.3.2 Default Columns — 6 cột đặc trưng Thiết kế
```ts
columns = {
  id: true,
  title: true,             // sticky
  group: false,            // LUÔN ẨN
  customColumns: [
    {
      key: 'ktv_chinh',    // Cột BOLD, màu tím đặc biệt
      label: 'KTV chính',
      render: (t) => <span className="font-semibold text-group-thietke">
                       Avatar+Name(getKtvChinh(t))</span>
    },
    {
      key: 'so_tro_ly',    // Cột pill số lượng Trợ lý (badge ×N tím nhạt)
      label: 'Trợ lý',
      render: (t) => {
        const list = t.assignments.filter(a=>a.stageType.startsWith('tro_ly_'));
        return <>
          <Badge className="bg-group-thietke/15 text-group-thietke mr-2">×{list.length}</Badge>
          <AvatarStack list={list.slice(0,3)} size="sm" />
        </>
      }
    },
    {
      key: 'btv_pheduyet',  // Cột BTV phê duyệt
      label: 'BTV duyệt',
      render: (t) => Avatar+Name of stageType='btv' (thietke namespace)
    },
    { key: 'progress_bar' }, // Tiến độ bar
    { key: 'due' },          // Hạn overdue đỏ
  ]
}
```

#### 5.3.3 Duplicate action nâng cao (ConfirmDialog trước khi chạy)
Click "Sao chép" → Bật ConfirmDialog với **2 Switch toggle** (trước khi chạy):
```
Bạn sắp tạo bản sao của task "[Tiêu đề task]".

Chọn thành phần muốn sao chép:
  ☑ Sao chép KTV chính & Trợ lý (Mặc định: BẬT)
  ☑ Sao chép BTV phê duyệt & Kiểm soát (Mặc định: BẬT)

          [Hủy]       [Tạo bản sao]
```
→ Switch tắt nào thì initial values of Duplicate không copy vai trò tương ứng (để user assign lại)

#### 5.3.4 TaskDialog — Tab 2 "PHÂN CÔNG 4 VAI TRÒ" (Grid 2×2 cards)
```
Tab 2 [Phân công 4 vai trò] : Grid md:grid-cols-2 gap-4
┌─────────────────────┬─────────────────────┐
│ 👑 KTV CHÍNH (1)    │ 🛡 KIỂM SOÁT (1)    │
│ [Select user]       │ [Select user]       │
│ Ngày/Hạn/HT/Progress│ Ngày/Hạn/HT/Progress│
├─────────────────────┼─────────────────────┤
│ 👥 TRỢ LÝ (×N)      │ ✅ BTV PHÊ DUYỆT (1)│
│ [＋ Thêm TL 1/2/3...]│ [Select user]       │
│ ×N cards nhỏ stacked│ Ngày/Hạn/HT/Progress│
└─────────────────────┴─────────────────────┘
```

---

### 5.4 CNTT (`/cntt`)
| Thông tin | Giá trị |
|---|---|
| **File** | [cntt.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/cntt.tsx) |
| **Accent bar** | 4px `bg-group-cntt` (Xanh đậm kỹ thuật 215°) |
| **Hero Icon** | `ServerCog` màu group-cntt |
| **Hero mô tả** | "Hỗ trợ kỹ thuật phần mềm · Quét trùng lặp Hán Nôm đa nhân sự song song · Kiểm soát bản quyền" |
| **Đã có tốt** | useTaskListControls ✅, useConfirmDialog ✅ (khác Thiết kế dùng AlertDialog state standalone — nhưng nên gộp dùng 1) |
| **INCLUDED_GROUPS** | `["CNTT", "Quét trùng lặp"]` |
| **Vai trò đặc thù** | `ktv_*` / `technical` role list → nhiều Kỹ thuật viên parallel |
| **Thiếu** | Duplicate action ❌, Group split visible ❌ |

#### 5.4.1 Refactor & Missing features (P0/P1)
- ✅ **Thêm `onDuplicate`**: Tìm assignments có loại `technical`, `ktv_*`, `assignee` → giữ nguyên tất cả (duplicate global, không cần mapping đặc thù như TK hay BT)
- ✅ **Permission predicate CNTT hiện có** rộng hơn roles `technical OR group it/kỹ thuật/cntt OR group name match` → gộp vào utils `hasGroupPermission`
- ✅ Copy `handleExportTasks` → utils
- ✅ **Group Split Toggle 2 giá trị (dưới Hero, trên Stats)** (ĐẶC TRƯNG CNTT QUAN TRỌNG):
```
Segmented Toggle 2 giá trị (thay cho user phải vô group filter deep chọn):
  [ ⚙️ Tất cả CNTT (active → bg-group-cntt/15) ]  [ 🔍 Chỉ Quét trùng lặp ]
→ Khi user click → modify hook groupFilter = ["CNTT","Quét trùng lặp"] (default) hoặc ["Quét trùng lặp"] chỉ lọc nhóm đó.
→ Hiện tại user phải click Group Filter dropdown rồi chọn; Toggle này = shortcut filter phổ biến.
```

#### 5.4.2 Default Columns — 6 cột CNTT
```ts
columns = {
  id: true,
  title: true,                 // sticky
  customColumns: [
    {
      key: 'ky_thuat_vien',     // Cột nhiều KTV song song
      label: 'Kỹ thuật viên',
      render: (t) => MultiAvatarStack(technicalRoleAssignments(t), 5) + Pill ×N
    },
    {
      key: 'group_type',        // Cột pill phân biệt loại công việc
      label: 'Loại',
      render: (t) => (t.group === 'Quét trùng lặp')
        ? <Badge className="bg-cyan-400/20 text-cyan-700">🔍 Quét TL</Badge>
        : <Badge className="bg-group-cntt/15 text-group-cntt">⚙️ CNTT</Badge>
    },
    { key: 'progress_bar' },
    { key: 'due' },
  ],
  group: false,  // ẨN — vì cột group_type custom đã hiển thị rõ 2 loại
}
```

#### 5.4.3 TaskDialog — Tab 2 "KỸ THUẬT VIÊN PARALLEL"
```
Tab 2 [Kỹ thuật viên đa người]:
  Multi Select nhiều user + [＋ Thêm KTV]
  Render mỗi người 1 row nhỏ:
    [Avatar A] [Ngày nhận] [Hạn] [Tiến độ % (riêng của người này)] [Trạng thái riêng]
  → Vì Quét trùng lặp nhiều người làm song song trên 1 task.
```

#### 5.4.4 TaskDialog — Tab 3 "KẾT QUẢ (Đặc thù Quét trùng lặp)"
- Nếu task.group == "Quét trùng lặp" → hiện Tab 3 bổ sung:
  - Upload area (nếu backend sau này) / Link file Report kết quả (text input URL)
  - Số lượng tài liệu đã quét, Số trùng lặp phát hiện, Tỷ lệ trùng lặp % (3 fields custom task.meta nếu có)

---

### 5.5 THƯ KÝ HỢP PHẦN (`/thu-ky-hop-phan`)
| Thông tin | Giá trị |
|---|---|
| **File** | [thu-ky-hop-phan.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/thu-ky-hop-phan.tsx) (Hiện ~3970 dòng, lớn nhất) |
| **Accent bar** | 4px `bg-group-thuky` (Vàng đất 38°) |
| **Hero Icon** | `ScrollText` màu group-thuky |
| **Hero mô tả** | "4 modules nghiệp vụ · Công việc + Danh mục tác phẩm + HĐ dịch thuật + HĐ hiệu đính · Tài chính & công nợ" |
| **Tabs hiện có (đã tốt)** | 4 Tabs: `tasks` / `works` / `translation` (TC) / `proofreading` (PC) ✅ ✅ ✅ ✅ |
| **Feature đã implement SIÊU TỐT (GỮ NGUYÊN, CHỈ POLISH)** | Finance Summary by `useQueries` batch ✅, `outstandingById` map ✅, `paymentInfoById` 3 cấp (Adv1/Adv2/Settlement) ✅, `buildWorkProgressBadges` 8 badges pipeline ✅ ✨, Column Visibility `tcColumnVis` ✅, Bulk delete Works ✅, Import Works Excel ✅, Permission gates "Chưa gán hợp phần" ✅, Pagination ✅, `pathToTab` sync URL ✨ |

#### 5.5.1 Refactor State (P0 NHẤT cho file này)
→ **32 state khai báo trong 1 file Lines L790-L897** → Tách 3 hooks vào thư mục `client/src/hooks/`:
| File hook mới | Chứa state/filter/sort/memo |
|---|---|
| **`use-thu-ky-tasks-tab.ts`** | `tasksSearch`, `taskFilters`, `taskSortBy/Dir`, `tasksPage`, `taskViewMode` (table/board), `selectedTask`, `taskDialogMode`, `deleteTaskTarget`, `isCreateTaskOpen`, `isExportingTasks` + `paginatedTasks` memo |
| **`use-thu-ky-works-tab.ts`** | `worksSearch`, `worksComponentFilter`, `worksStageFilter`, `worksProgressFilter`, `worksSortCols` (multi), `worksPage`, `selectedWorkIds`, `workDialog`, `worksImportOpen`, `tcColumnVis` object (7 cột finance ẩn/hiện), `paginatedWorks`, `allSelectedOnPage` memo, `workTcIdsForOutstanding` query builder, `outstandingByTcIdForWorks` map, `getWorkContractNumbers/Translators/sumTcMoneyForWork/getOutstandingForWork` |
| **`use-thu-ky-contracts-tab.ts`** | `tcSearch`, `tcComponentFilter`, `tcStageFilter`, `tcTranslatorSearch`, `tcQuickFilter`, `tcSortCols` (multi 22 col), `tcPage`, `tcDialog`, `deleteTcConfirmOpen/Target` · **Cùng biến cho PC:** `pcSearch`, `pcComponentFilter`, `pcStageFilter`, `pcQuickFilter`, `pcSortCols`, `pcPage`, `pcDialog`, `deletePcConfirmOpen/Target` · Memos: `paginatedTc`, `paginatedPc`, `worksFinanceQueries` (TC list), `paymentsQueries` → `outstandingById`, `paymentInfoById`, `pcOutstandingById`, `pcPaymentInfoById` |

→ Sau refactor: file thu-ky-hop-phan.tsx giảm từ ~4000 dòng → ~1200 dòng (chỉ còn phần render UI + inject 3 hooks vào từng Tab) = Dễ maintain, dễ debug

#### 5.5.2 Tab 1 — Công việc (Tasks tab)
Áp dụng **Unified Group Template** (như 5 nhóm kia) cho Tab 1 này (đã có gần giống, chỉ cần:
- Thêm Hero Accent vàng + Icon,
- Bộ lọc 2-tier Popover,
- Thêm cột custom `Liên kết HĐ` Pill vàng (nếu `relatedContractId` = render `<Pill bg-group-thuky/25>HĐ Số: ${contractNo}</Pill>` clickable mở Tab TC filter đến HĐ đó).

#### 5.5.3 Tab 2 — Danh mục Tác phẩm (Works tab ✨ ĐẶC TRƯNG NHẤT CỦA THƯ KÝ)
Đã có `buildWorkProgressBadges` 8 pipeline badges → **Render thành HORIZONTAL PIPELINE STEPPER NGAY TRÊN TOOLBAR** (filter nhanh theo pipeline stage):
```
Pipeline Stepper 8 bước (Click bước nào = Filter works có badge đó):
 [🖊 Ký HĐ] → [📊 KT tiến độ] → [🎓 Thẩm định] → [✅ Nghiệm thu] 
      → [💸 Quyết toán] → [✍️ Hiệu đính] → [📘 Biên tập] → [🎨 Thiết kế]
   Mỗi bước có số đếm badge: [🖊 120] [📊 95] ... [🎨 40]
```

##### (b) Preset Column Views — 3 Nút nhanh (thay user phải toggle 7 cột finance 1-1):
Toolbar trên Works table thêm:
```
Preset columns:  [☰ Cơ bản (8 cột)]  [💰 Tài chính đầy đủ (bật 7 cột tiền)]  [📊 Số liệu ước tính (chỉ base/estimate word/page)]
→ Click nhanh = set tcColumnVis object tương ứng.
```

##### (c) Card View Works (thêm Toggle Table ↔ Card Grid):
Toggle Group `[📋 Table] [🖼 Cards]`. Card View (Grid responsive 1/2/3 col):
```
Work Card:
┌────────────────────────────────────────┐
│ 🏷 Mã tài liệu                         │
│ TIÊU ĐỀ VI (font-display bold 18px)    │
│ Tiêu đề Hán Nôm (font serif smaller)   │
│ [Hợp phần · Giai đoạn Pill]            │
│ ─────────────────────────────────────  │
│ 8 Pipeline Badges mini (như inline)    │
│ ─────────────────────────────────────  │
| 2 dòng Số liệu:                        |
|   Số chữ gốc · Số chữ ước tính         |
|   Giá trị HĐ · ✔ Đã ứng · 🔴 Công nợ   |
└────────────────────────────────────────┘
→ Click Card → mở WorkDialog detail (đã có sẵn workDialog state)
```

#### 5.5.4 Tab 3 & 4 — Hợp đồng Dịch thuật (TC) & Hiệu đính (PC)
Chung 2 cải tiến cho cả 2 tabs TC & PC:

##### (a) Quick Filter Segmented badges (thay Select 5 giá trị)
ToolBar filter hiện Quick Filter là state `all/valid/completed/expiring/expired` → Render segmented badges có số đếm:
```
 [📚 120 Tất cả]  [✔️ 80 Hợp lệ]  [✅ 25 Hoàn thành]
 [⏳ 10 Sắp hết hạn (≤90 ngày)]  [🔴 5 Quá hạn (đỏ gốm)]
```

##### (b) Row Expandable → Finance Summary Card inline
Row Table contract hiện có cột tiền rời rạc → Thêm `⌄` mũi tên expand row đầu tiên:
```
Click expand row → hiện subrow 1 Card 3 cột finance:
  ┌──────────────────────────────────────────────────────────┐
  │ 💎 GIÁ TRỊ HĐ: 25,420,000 ₫              │
  │ 💵 ĐÃ ỨNG (Adv1+2 tổng): 15,252,000 ₫ (60%) [progress bar 60%]  │
  │ 🔴 CÔNG NỢ CÒN LẠI: 10,168,000 ₫ (nếu > 0 → nền đỏ nhạt + text-danger bold)  │
  │  │ Chi tiết: Ứng 1: 7,626,000 (01/01) · Ứng 2: 7,626,000 (01/04) │
  │  │ Quyết toán: 0 ₫ (chưa có)              │
  └──────────────────────────────────────────────────────────┘
```

##### (c) Card Grid View Contracts (thêm Toggle Table/Cards)
Tương tự Work Card, nhưng format hợp đồng:
```
Contract Card:
┌────────────────────────────────────────┐
│ SỐ HĐ TC-2026-00124 (bold 20px Vàng)   │
│ 📘 Tác phẩm: Lược đồ ... (truncate 2 dòng)
│ [Hợp phần Pill] [Dịch giả Avatar+Name]
│ ─────────────────────────────────────  │
│ Progress bar: Tỷ lệ hoàn thành 62% (bar green 62%)
│ [⏳ Sắp hết hạn · 18 ngày] Warning pill (nếu applicable)
│ ─────────────────────────────────────  │
│ 3 Finance boxes:
│   💎 Giá trị     💵 Đã ứng      🔴 Công nợ
│   25,420K       15,252K       10,168K
└────────────────────────────────────────┘
```

##### (d) Export Contract TC & PC → Gộp utils chung
2 hàm `handleExportTranslationContracts` ~330 dòng + `handleExportProofreadingContracts` ~300 dòng → 1 util `exportContractsToExcel(list, type: 'TC'|'PC', {includeFinance: true, includePayments: true})`

#### 5.5.5 Permission gates (Empty State chuẩn hóa)
Hiện có 2 `Alert` component đơn thuần → đổi thành **Full-page Empty State có Icon + CTA**:
- "Không có quyền" → Illustration Shield đỏ + "[Liên hệ Admin]" (trỏ đến link /admin/users nếu có quyền, nếu không thì hiển thị email quản trị)
- "Chưa được gán hợp phần" → Illustration Lock vàng + "[Tới trang Quản lý người dùng]" (chỉ hiện nếu user có quyền admin, ngược lại text hướng dẫn liên hệ)

---

### 5.6 NHÓM — TEAM PERFORMANCE (`/team`)
| Thông tin | Giá trị |
|---|---|
| **File** | [team.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/team.tsx) |
| **Accent bar**| Không có bar cố định — mỗi member card có ring màu theo role chính người đó |
| **Hero Icon** | `UsersRound` + Mô tả: "Hiệu suất thành viên · Theo dõi công việc & đánh giá theo thời gian" |
| **Hiện trạng tốt** | Grid 1/2/3 col responsive md ✅, 3 số Total/Completed/Active ✅, Efficiency bar % ✅ (lines L228-L248) |

#### 5.6.1 Page Header Toolbar (Mới — thêm 4 controls trên cùng)
```
Trên đầu trang Team, ngay trên Grid cards:
[Left]
  🔍 Search theo tên / email (input)

  Pills filter theo Vai trò (đều có badge số đếm):
    [18 Tất cả] [3 Quản lý] [6 BT] [4 KTV] [2 CNTT] [2 Thư ký] [3 Cộng tác viên]
    (Mỗi pill filter theo roleId / groupId như Admin users badges đã làm)

  Time range Selector (4 giá trị):
    [Tháng này ↓]  [Quý này]  [Năm nay]  [Tất cả]
    (Khi đổi Range → cập nhật memberStats theo date filter tasks created/updated trong khoảng)

[Right]
  Sort by dropdown:
    [Hiệu suất ⬇] / [Tổng nhiệm vụ ⬆] / [Hoàn thành ⬇] / [Quá hạn ⬆]
```

#### 5.6.2 Team Summary Stat Bar (Mới — 4 badges tổng thể trên cùng grid)
```
[👥 Thành viên: 18]  [✅ Đã hoàn thành tháng này: 240]  [🔴 Quá hạn: 8]  [📈 Hiệu suất TB: 82%]
 → 4 badges này tính = aggregation ALL member stats.
```

#### 5.6.3 Member Card — Nội dung nâng cấp từ 5 phần tử → 8 phần tử
Hiện tại mỗi card: Avatar + 3 số + 1 bar (5 phần). → **Mở rộng thành:**
```
Member Card (font-display cho số):
┌────────────────────────────────────────────────────┐
│ [Avatar 56px] Ring màu role (BT=primary, TK=tim, CNTT=xanh đậm, Thư ký=vàng)  │
│  NGUYỄN VĂN A (font-display 17px BOLD)             │
│  email@donvi.vn (text-xs muted)                    │
│  Role badges (2-3 pills nhỏ): [Biên tập viên · Trưởng ban...]
├────────────────────────────────────────────────────┤
│ 3 số liệu (keep + tăng font 24px display):
│  [📊 TỔNG 120] [✅ HOÀN THÀNH 105 bg-green-50] [⚡ ĐANG LÀM 8 bg-blue-50]
├────────────────────────────────────────────────────┤
│ 2 MINI PROGRESS BARS (thay 1 bar):
│   Xanh lá · Hoàn thành 87% [░░░░░░░░░▒ 87/100]
│   Xanh primary · Đang làm 7%  [▒░░░░░░░░░ 8/100]
│   (Đỏ · Quá hạn nếu có % -> bar thứ 3 nếu > 0)
├────────────────────────────────────────────────────┤
│ 🔥 MINI HEATMAP 12 THÁNG (PHẦN WOW CHÍNH)
│   12 cột × 5 hàng = 60 tuần mini squares 5px×5px
│   Mỗi ô màu gradient theo số task HOÀN THÀNH tuần đó:
│     0 = bg-muted rất nhạt → 1-3 = primary/10 → 4-6 = /30 → 7+ = /60 solid
│   Label dưới: T1 T2 T3 ... T12 (12 tháng)
│   Label trái: (empty, chỉ grid), label phải: legend [Ít · Nhiều]
├────────────────────────────────────────────────────┤
│ 3 Badges đánh giá + gần đây:
│   [⭐ Đánh giá TB: 4.3/5] · [3 task tuần này] · [🔴 1 overdue]
├────────────────────────────────────────────────────┤
│ [Xem chi tiết] Button variant outline full-w → Mở Drill-down Modal │
└────────────────────────────────────────────────────┘
```
→ Mobile breakpoint (< md): Heatmap 12 tháng → bọc trong `ScrollArea` horizontal scroll.

#### 5.6.4 Drill-down Modal "Chi tiết hiệu suất [Tên người dùng]" (MỚI TOÀN BỘ)
Modal 80%w (shadcn Dialog size lg) 4 Tabs:
```
Drill Down Member Modal:
HEADER: [Avatar 64px Ring màu] + Nguyễn Văn A + Email + Role badges
─────────────────────────────────────────────────────────────────
TAB 1 — CÔNG VIỆC GẦN NHẤT
  Table 10 công việc gần nhất (tasks mà userId này nằm trong assignments):
    ID | Tiêu đề | Nhóm (color pill) | Trạng thái | Hạn | Đánh giá
  Filter nhanh trên tab: [Tất cả] [Hoàn thành] [Đang làm] [Quá hạn]
  Pagination 10 dòng mặc định

TAB 2 — BIỂU ĐỔ THEO THỜI GIAN (Mini Line chart)
  Dùng Recharts (đã có sẵn dashboard) — Line chart 12 tháng:
    Line xanh lá = Số Hoàn thành / tháng
    Line đỏ = Số Quá hạn / tháng
    Line xám = Tổng nhiệm vụ nhận / tháng
  → Tooltip hover có số chính xác

TAB 3 — ĐÁNH GIÁ VOTE
  Pie chart nhỏ 4 phần:
    Tốt 50% / Khá 35% / Không tốt 10% / Không hoàn thành 5%
  + Tổng số công việc đã được vote: 78

TAB 4 — PHÂN BỔ NHÓM
  Pill badges phái viên phân bổ:
    Nhóm: [Biên tập] [CNTT]
    Hợp phần đảm nhiệm (nếu Thư ký): [Kinh Điển Tạng 1] [Kinh Điển Tạng 2] [Từ điển Hán Nôm]
    Các tác phẩm đang đảm nhiệm: [34 tác phẩm → click filter đến trang Thu-ky Works]
```

---

### 5.7 QUẢN TRỊ — Admin Dashboard & Users
| Thông tin | Giá trị |
|---|---|
| **Files** | [admin-dashboard.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/admin-dashboard.tsx) (Tab Tasks hiện tại giống Group page, + Tab Users = [admin-users.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/admin-users.tsx) nested) |
| **Accent bar** | 4px `bg-group-admin` (Đỏ gốm 15°) |
| **Hero Icon** | `ShieldAlert` màu group-admin |
| **Hero mô tả** | "Tổng quan hệ thống · Quản lý tài khoản · Phân quyền vai trò · Audit logs" |
| **Điểm đã SIÊU TỐT (Admin-users)** | 7 Stats Card clickable filter ✅, `Popover+Combobox` Role/Group/Component đa chọn ✅, `Create/Edit/Reset Password` 3 dialogs ✅, Mobile `Card ↔ Desktop Table` switch theo useIsMobile ✅ ✨, Role-assignment Thư ký theo ComponentId ✅, Password requirement 5 checkmarks ✅ |

#### 5.7.1 Admin Dashboard — Tab `tasks` (ĐỔI NỘI DUNG TOÀN BỘ — thay vì lặp lại Group page)
Hiện tại Tab 1 Admin Dashboard gần giống 1 trang group (TaskStats + TaskFilters + TaskTable audit ALL tasks toàn hệ thống).
→ **Thay bằng TRANG TỔNG QUAN HỆ THỐNG 4 KHỐI RIÊNG:**

```
ADMIN DASHBOARD (Tab 1 = Tổng quan):

KHỐI 1 — OVERVIEW STATS 4 Cards:
  [👥 TỔNG USERS: 18 · 15 active]  [✅ TỔNG TASKS 7 NGÀY: 86 · 68 hoàn thành]
  [🔐 SỐ LOGIN 7 NGÀY: 142]       [🚨 BÁO LỖI: 0 (nếu có → đỏ + list)]

KHỐI 2 — TASKS THEO NHÓM (Horizontal Bar Chart — Recharts, màu theo group accent):
    Biên tập ████████████████████░░ 68/80 (85%)
    Thiết kế ████████████████░░░░░░ 50/80 (62%)
    Công việc chung █████████░░░░░░░ 42/80 (52%)
    CNTT ██████████░░░░░░░░░░░░░░░░░ 28/80 (35%)
    Thu ký ████████░░░░░░░░░░░░░░░░░ 22/80 (27%)
  → Trục Y = 5 nhóm, trục X = Số task HOÀN THÀNH / tháng này (bar filled) + tổng (bar nền)

KHỐI 3 — USERS THEO VAI TRÒ (Donut Chart):
  4 phần: Manager 15% · BT 33% · Thư ký 11% · Cộng tác 22% · Khác 19%
  → Click 1 phần = filter qua Tab Users badgeFilter tương ứng

KHỐI 4 — ACTIVITY LOG GẦN NHẤT (Table 10 dòng):
  Thời gian · Ai (avatar + tên) · Hành động (Tạo task "..." / Sửa HĐ TC-00124 / Đổi mật khẩu cho user X / Tạo user mới...)
  "Xem đầy đủ Audit Log" (link hoặc mở rộng)

──────────────────────────────────────────────────────
→ Tab 2 cũ "Audit công việc toàn hệ thống" (Tab 2 MỚI):
  Giữ nguyên nội dung Tab 1 cũ (TaskStats + TaskTable TẤT CẢ tasks ALL groups)
  → Nên đổi tên Tab từ "Công việc" → "Audit CV toàn hệ thống" để phân biệt.
→ Tab 3 = "Người dùng" (Giữ nguyên AdminUsersPage)
```

#### 5.7.2 Admin Users — Tinh chỉnh 10 điểm (90% đã tốt → polish 10% còn lại)
| # | Hiện trạng | ✅ Cải tiến đề xuất |
|---|---|---|
| U1 | 7 Stats cards hardcode màu (ví dụ Thư ký `bg-amber-200/60`) | → Đổi sang dùng group accent: `bg-group-thuky/25 text-group-thuky` (đồng bộ palette) |
| U2 | Chỉ có Search + 7 Badges filter | → Thêm **Advanced Filter Popover (gear icon)** 4 trường: ① Group filter pills multi-select ② Department text search ③ Created date range (from → to) ④ Toggle "Chưa hoạt động >30 ngày" (tính lastLoginAt nếu có DB field) |
| U3 | Role hiện `u.roles.map(r=>r.name).join(", ")` text thuần | → Đổi sang **Pill badges có MÀU theo role code chuẩn**: Admin=`bg-admin/15` + Shield icon · Manager=`bg-indigo-400/15` + shield · Editor(BT)=`bg-primary/15` + book icon · Secretary(Thư ký)=`bg-group-thuky/25` + clipboard · Partner(Cộng tác)=`bg-teal-400/15` + handshake · Staff = `bg-muted/50` |
| U4 | Cột "Người tạo" luôn "—" | → ẨN CỘT NÀY (hoặc backend sau này bổ sung createdBy userId thì map displayName như admin-dashboard tab tasks đã làm ở creatorNameById) |
| U5 | Table 10 cột quá rộng 2 action buttons text | → 8 cột MẶC ĐỊNH: Avatar+Name · Email · Role badges · Group pills · Phòng ban · [🟢 Hoạt động / 🔴 Tắt] · Ngày tạo · **Thao tác (3 icons only)** = [✏️ Edit] [🔑 Password] [🔒 Lock/Unlock] (bỏ text gọn bảng 30%) |
| U6 | Missing Bulk actions | → Thêm Checkbox đầu mỗi row + **Bulk toolbar floating** khi có user được chọn: `(Đã chọn 5) [☑ Kích hoạt] [⛔ Khóa] [🔑 Reset mật khẩu mặc định (gửi mail)] [➕ Gán role] [➕ Gán group]` · (Nếu backend chưa có bulk PATCH → disable tạm + tooltip "Sắp có") |
| U7 | Create Dialog: Tạo mật khẩu thủ công | → Thêm Toggle **"Tạo mật khẩu ngẫu nhiên & gửi mail kích hoạt" (Mặc định BẬT)** + Button **[🎲 Random]** 1-click generate pass đủ 5 yêu cầu, tự điền 2 ô, có nút Copy |
| U8 | Password Dialog 5 checkmarks ✅ tốt | → Thêm 1 nút "[🎲 Generate]" tương tự Create Dialog (đỡ quản trị viên phải nghĩ mật khẩu) |
| U9 | Edit Dialog Combobox 3 cấp (Role/Group/Component) đã tốt ✅ | → Giữ nguyên, chỉ sửa màu combobox item selected theo palette. Đổi màu "Tên Hợp phần" (Component) pill màu vàng đất group-thuky |
| U10 | Card view Mobile (breakpoint md) → 3 dòng action buttons dọc | → Gộp 3 nút Sửa / Đổi mk / Khóa → 1 `⋮` Dropdown Menu có 3 options (gọn mobile) |

#### 5.7.3 Admin Users — Password Dialog Enhance (Chi tiết)
```
Dialog "Đặt mật khẩu mới":
  Mật khẩu mới: [••••••••••••] [👁 Show/Hide] [🎲 Generate 1-click]
  Xác nhận:     [••••••••••••] [👁 Show/Hide]
  [Copy to Clipboard]

→ 5 checkmark yêu cầu mật khẩu:
  ✅ Tối thiểu 8 ký tự
  ✅ Có chữ hoa
  ✅ Có chữ thường
  ✅ Có số
  ✅ Có ký tự đặc biệt

→ Button [Hủy] · [Đặt mật khẩu]
```

---

## 6. CHECKLIST THỐNG NHẤT TOÀN CỤC — 20 CÔNG VIỆC G1-G20

| # | Công việc | Ưu tiên | Files ảnh hưởng |
|---|---|---|---|
| **G1** | **Overwrite Palette `index.css` 16 biến (giấy cổ, xanh gốm, đỏ gốm, vàng đất, 6 group accent, 5 status)** | 🔝 **P0** | [index.css#L7-L71](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/index.css#L7-L71) + tailwind.config.ts |
| **G2** | **Đổi Sidebar active màu tím `bg-violet-100` → `bg-primary/12 text-primary`** | 🔝 **P0** | [layout.tsx#L448](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/layout.tsx#L448) |
| **G3** | **Remove handler auto-close sidebar khi click outside** | 🔝 **P0** | [layout.tsx#L160-L190](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/layout.tsx#L160-L190) |
| **G4** | **Refactor 6× `handleExportTasks` → 1 util `exportTasksToExcel(tasks, {group, fileName, extraHeaders, roleParser})`** | 🔝 **P0** | [lib/utils.ts](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/lib/utils.ts) (add function) + 6 page group replace |
| **G5** | **Refactor 6× getStatusColor/getPriorityColor → 2 utils trả về HSL `status-*` variables** | 🔝 **P0** | lib/utils.ts + 6 page group replace |
| **G6** | **Refactor CV-chung & Dashboard dùng `useTaskListControls` hook (thay tự implement filter logic useMemo)** | 🟡 **P1** | [cv-chung.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/cv-chung.tsx) · [dashboard.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/dashboard.tsx) · Có thể mở rộng hook tham số `scopeFilter` cho Dashboard (ALL groups) |
| **G7** | **Phân tầng Bộ lọc theo 2-tier Progressive Disclosure:** 3 controls ngoài màn hình (Search / Status Quick / Assignee chips) + 9-12 nâng cao trong Popover + Indicator Badge "N filters" (reset nhanh khi click) | 🟡 **P1** | `task-filters.tsx` component rewrite + 5 Group pages + Dashboard |
| **G8** | **Tab hóa Dashboard 3 Tab:** `[🏠 Tổng quan]` (Greeting + 2 cards + 5 badges + 2 pie + Trend line 7 ngày; 40% page length) · `[📊 Thống kê chi tiết]` (2 bar charts + group distribution, không có task list) · `[📋 Danh sách công việc]` (Section full task, filter 2-tier đã làm ở G7) → Giảm page length 80% | 🟡 **P1** | [dashboard.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/dashboard.tsx) L570-L1015 tách thành 3 `<TabsContent>` |
| **G9** | **Tab hóa TaskDialog 4 khu vực:** Tab1 Tổng quan / Tab2 Phân công (injectable `extraTabs` prop cho 5 nhóm) / Tab3 Liên kết Work+Contract / Tab4 Lịch sử & Comments | 🟡 **P1** | [task-dialog.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/task-dialog.tsx) (L1-L300+) |
| **G10** | **Làm lại Login 2 cột Brand Identity:** Cột TRÁI (60% w, nền gradient xanh gốm + đỏ gốm, hình minh họa sách kinh điển/Logo lớn + Slogan dự án: *"Văn phòng Dự án Kinh điển phương Đông"* + 3 bullet core value "Số hóa · Dịch thuật · Bảo tồn di sản"). Cột PHẢI (40% w, card white 640px max-width: Login form Google + Email/Password + Forgot) | 🟡 **P1** | [login.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/login.tsx) (L1-L203) |
| **G11** | **Skeleton Loading toàn hệ thống:** Tạo 3 wrapper components thay mọi `<Loader2 animate-spin>`: (a) `TaskTableSkeleton` (table head placeholder + 10 shimmer rows) (b) `CardGridSkeleton N` (N cards placeholder cho team page/admin stats) (c) `FullPageSkeleton` (hero + stats + data area shimmer). Dùng shadcn `ui/skeleton.tsx` đã có sẵn. | 🟡 **P1** | Tạo `components/skeletons/` 3 files, rồi thay 100% Loader2 trong 8 trang page |
| **G12** | **Kanban WIP Limits + Drop zone:** Column config mặc định `{ notStarted: ∞, pending: ∞, inProgress: 8, completed: ∞, cancelled: ∞ }`. Mỗi column header hiển thị `[Tasks hiện tại / WIP]` badge; nếu `≥ WIP → badge warning`. Column 0 task → placeholder lớn "Kéo thả task vào đây 📥" | 🟢 **P2** | [task-kanban-board.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/task-kanban-board.tsx) |
| **G13** | **Calendar cải tiến:** Thêm Week numbers cột 1 · Thêm Public holiday VN indicator (config trong utils `isPublicHoliday(date)` trả về name) · Thêm Overdue cell đỏ nền highlight khi task.status≠Completed & due<today | 🟢 **P2** | [task-calendar-view.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/task-calendar-view.tsx) |
| **G14** | **Empty State đa dạng CTA (thay text "không có dữ liệu" đơn):** (a) Dashboard Empty: "📭 Chưa có công việc" + CTA "[＋ Tạo công việc đầu tiên]" + "[Import Excel CV mẫu]". (b) Team 0 member: Illustration 👥 CTA "[Mời người dùng → Quản trị → Users]". (c) Notif 0: "🔔 Không có thông báo mới" CTA "[Bật thông báo qua Email]". (d) Generic Table Empty: Component `<EmptyState icon={...} title={...} description={...} ctaLabel={...} ctaOnClick={...} />` | 🟢 **P2** | Tạo `components/empty-state.tsx` generic; áp dụng 3 trang + Kanban column trống + Calendar view tháng không có task |
| **G15** | **Notification v2:** (a) Phân nhóm theo ngày trong Notif Panel ("Hôm nay", "Hôm qua", "Tuần trước", "Cũ hơn") (b) Action trực tiếp trên notif: `[Mark done]` (nếu là task assigned) (c) Search input trong notif panel (lọc theo từ khóa) (d) Toggle nhóm notif: tắt thông báo "Cảnh báo hạn công việc" / "Thay đổi phân công" / "Cập nhật hợp đồng" nhóm riêng | 🟢 **P2** | `layout.tsx` Notif dropdown · `use-notifications.ts` hook cấu hình nhóm |
| **G16** | **Mobile responsive fix 2 điểm:** (a) Double scroll bug TaskTable: bọc `Table` trong `<ScrollArea orientation="horizontal">` shadcn + set table minWidth 1000px fixed + sticky header. (b) Icon-only Toggle Group buttons (md breakpoint) tăng min-height/width 44px theo tiêu chí Material Design (dễ tap trên mobile). | 🟢 **P2** | `task-table.tsx` + CSS global toggle group rules |
| **G17** | **Column Picker gear icon MẶC ĐỊNH TaskTable:** Hiện chỉ Thu-ky Works tab có `tcColumnVis` custom. → Thêm vào `TaskTable` component prop `columnPicker = true` mặc định, có `presetViews = { "Cơ bản": {...colsMap}, "Đầy đủ": {...allTrue} }`, export utils `DEFAULT_GROUP_COLUMNS[groupCode]` | 🟢 **P2** | `task-table.tsx` + 5 pages group (đổi truyền columns= sang dùng preset) |
| **G18** | **Performance (P3):** (a) Dashboard 3 biểu đồ → wrap `React.lazy(() => import('./components/charts/...'))` fallback `<Skeleton />` (b) TaskTable 500+ tasks → virtualization `@tanstack/react-virtual` (đã có @tanstack/react-query trong stack, nên cùng ecosystem dễ) (c) Dedupe `useTasks()` gọi 3 lần cùng params trên 1 page → `staleTime: 5 phút` mặc định QueryClient | 🔵 **P3** | `queryClient.ts` · dashboard charts separate files · task-table optional virtualize prop |
| **G19** | **Command Palette Ctrl+K (P3 - tùy chọn cao cấp):** Mở global search + quick switcher → gõ "Đăng Xuất", "/cv-chung" filter qua trang Công việc chung, "Tạo task BT..." mở TaskDialog tab Biên tập. Pattern shadcn `Command` component đã có sẵn. | 🔵 **P3** | Tạo `components/command-palette.tsx` + listener `Ctrl+K` trong `layout.tsx` |
| **G20** | **Toast duration chuẩn hóa:** Đặt default `duration: 4000` trong `use-toast.ts` hook / Toaster wrapper provider. Loại bỏ mọi `duration: xxx` hardcode trong từng file (giữ lại chỉ có toast lỗi mới 6000). | 🟢 **P2** | `use-toast.ts` / Toaster config |

---

## 7. LỘ TRÌNH THỰC THI 4 GIAI ĐOẠN — ĐỘ ƯU TIÊN

### 🔴 GIAI ĐOẠN 1 — NỀN TẢNG TOÀN CỤC (P0 · Ưu tiên NHẤT · Ước tính 1-2 tuần)
**Mục tiêu:** Đổi palette, xóa 6 duplicate function lớn, thống nhất control hook → Sau giai đoạn này, app look & feel đã mới & codebase gọn 1500+ dòng.
> **QA check cuối giai đoạn:** Trên 5 trang group filter 1 tiêu chí (ví dụ Status = In Progress) → Kết quả trả về PHẢI giống nhau 100% vì cùng dùng 1 hook.

1. G1 (Palette CSS + Tailwind extend)
2. G2 (Sidebar active màu) + G3 (Sidebar remove auto-close)
3. G4 (`exportTasksToExcel` utils) → Thay 6 trang
4. G5 (`getStatusColor/getPriorityColor` utils HSL) → Thay 6 trang
5. G6 (Refactor CV-chung + Dashboard dùng useTaskListControls)
6. G20 (Toast duration chuẩn)
7. **Regression test 5 trang + Dashboard + Login xem có lỗi màu/filter không**

---

### 🟠 GIAI ĐOẠN 2 — NHÓM PAGE & DASHBOARD TÁI CẤU TRÚC (P1 · 2-3 tuần)
**Mục tiêu:** Rút gọn cognitive load (Dashboard 3 tab), tái cấu trúc 5 trang Unified Group Template, Tab hóa TaskDialog, Login 2 cột.
> **QA check:** Trên 5 trang group → 4 phần Hero / Stats / Toolbar / Data view có bố cục giống hệt 80%, chỉ khác màu accent và cột default 6 mục.

8. G7 (Phân tầng Filter 2-tier Popover + Indicator)
9. G8 (Dashboard 3 Tabs)
10. G9 (TaskDialog 4 tabs + injectable `extraTabs`)
11. G10 (Login 2 cột Brand Identity)
12. G11 (Skeleton Loading toàn bộ 8 trang)
13. **Áp dụng Unified Group Template lần lượt 5 trang:** CV-chung → Biên tập → Thiết kế → CNTT → Tab 1 Thu-ky (từng trang 1, regression)
14. Thêm **Duplicate action** ở 2 trang thiếu (CV-chung, CNTT)
15. **Default Columns preset + Column Picker gear** (G17 áp dụng sớm cùng với Template)
16. User Acceptance Test 1 vòng trên 5 nhóm nghiệp vụ

---

### 🟡 GIAI ĐOẠN 3 — NÂNG CAO ĐẶC TRƯNG TỪNG TRANG (P2 · 2-3 tuần)
**Mục tiêu:** Cải thiện đặc thù nghiệp vụ deep cho Thu-ky (nặng nhất), Team (heatmap + drilldown), Admin (tổng quan hệ thống + bulk), 3 nhóm còn Workflow UI riêng.

17. **Thu-ky hợp phần (nặng nhất 40% effort P2):**
   - Tách 3 hooks state (5.5.1) → thu-ky file từ 4000 → 1200 dòng
   - Works tab: Pipeline Stepper 8 giai đoạn (filter nhanh) + Preset Column Views 3 mức + Card View
   - TC/PC tabs: Quick badges filter (5 trạng thái) + Row expandable Finance inline + Card Grid View
   - Export TC/PC gộp utils chung
   - Empty state permission gates (2 cảnh báo)
18. **Team page:** Toolbar filter 4 controls + Team Summary bar · Member card 8 phần tử (đặc biệt Heatmap 12 tháng) · Drill-down Modal 4 tabs (Công việc / Biểu đồ thời gian / Đánh giá / Phân bổ) · Skeleton + Empty State
19. **Admin:** Tổng quan hệ thống 4 khối (tab 1 mới) · Admin users polish 10 điểm (U1-U10)
20. **Biên tập:** Workflow Stepper 3 bước inline trên Table row · TaskDialog Tab 2 "Quy trình 3 bước" Round type pills · Progress tab polish (Heatmap + Quick Filter pills + Right Drawer work detail)
21. **Thiết kế:** Duplicate confirm 2 switches · 4 vai trò TaskDialog Grid 2×2 · Cột "Số trợ lý ×N" badge
22. **CNTT:** Segmented CNTT / Quét trùng lặp Toggle · Multi-assignee parallel Tab · Kết quả Quét trùng lặp Tab
23. **Kanban G12, Calendar G13, Empty State G14, Notif v2 G15, Mobile fix G16**

---

### 🔵 GIAI ĐOẠN 4 — DELIGHT & PERFORMANCE (P3 · LÀM KHI CÓ THỜI GIAN RẢNH)
24. G18: Performance (Lazy Dashboard charts, Table Virtualization 500+ tasks, Query dedupe staleTime)
25. G19: Command Palette Ctrl+K Quick Switcher
26. Micro-interactions: Hover lift cards (translate-y -1 + shadow), Badge pop animation khi filter thay đổi, Progress bar fill animation trên page load
27. Keyboard shortcuts (Ctrl+N tạo task, Ctrl+E export, Ctrl+F focus search, Esc đóng dialogs)
28. Cross-tab sync (BroadcastChannel API: Tab A tạo task mới → Tab B, C khác auto refresh trong 5s)
29. Lighthouse Audit: Đảm bảo Performance > 90, Accessibility > 90, Best Practices > 90 (thời gian ban đầu Dashboard thấp do nhiều chart DOM → sau khi lazy code splitting sẽ đạt)

---

## 8. FILE MAPPING — MỖI THAY ĐỔI LIÊN KẾT FILE MÃ NGUỒN

> Checklist tham chiếu nhanh khi thực thi từng bước

### 🆕 Files MỚI cần tạo (0破坏 existing, chỉ thêm):
| File mới | Mục đích |
|---|---|
| `client/src/components/empty-state.tsx` | Generic Empty State (G14) |
| `client/src/components/skeletons/task-table.tsx` | 3 Skeleton wrappers (G11) |
| `client/src/components/skeletons/card-grid.tsx` | ^ |
| `client/src/components/skeletons/full-page.tsx` | ^ |
| `client/src/hooks/use-thu-ky-tasks-tab.ts` | Refactor Thu-ky 32 state → split (5.5.1) |
| `client/src/hooks/use-thu-ky-works-tab.ts` | ^ |
| `client/src/hooks/use-thu-ky-contracts-tab.ts` | ^ |
| `client/src/components/workflow-stepper-mini.tsx` | Component Stepper 3 bước (Bientap inline row) |
| `client/src/components/pipeline-stepper-8.tsx` | Stepper 8 giai đoạn (Thu-ky Works tab toolbar) |
| `client/src/components/heatmap-12m.tsx` | Heatmap 12 tháng chung (Team cards + Bientap progress) |
| `client/src/components/ui/drawer.tsx` | Bổ sung nếu chưa có (Right-side Drawer Work Bientap) |
| `client/src/components/command-palette.tsx` | G19 Ctrl+K (P3) |

### ✏️ Files SỬA — Ưu tiên P0 trước:
| File | Thay đổi chính | Giai đoạn |
|---|---|---|
| [client/src/index.css](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/index.css) | Overwrite 16 CSS variables palette | P0 · G1 |
| [tailwind.config.ts](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/tailwind.config.ts) | Extend colors `group.*` & `status.*` | P0 · G1 |
| [client/src/components/layout.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/layout.tsx) | L160-L190: Remove click outside · L448: Đổi active violet → primary | P0 · G2+G3 |
| [client/src/lib/utils.ts](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/lib/utils.ts) | Thêm 3 block: `exportTasksToExcel`, `getTaskStatusColor`, `getTaskPriorityColor`, `DEFAULT_GROUP_COLUMNS[6 groups]`, `hasGroupPermission` predicate | P0 · G4+G5 |
| [client/src/pages/cv-chung.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/cv-chung.tsx) | Dùng useTaskListControls + thêm Duplicate + default columns 6 cột + utils export | P0 · G4-G6 |
| [client/src/pages/dashboard.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/dashboard.tsx) | Dùng useTaskListControls + Tab hóa 3 khu vực | P1 · G6+G8 |
| [client/src/hooks/use-toast.ts](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/hooks/use-toast.ts) | Default duration 4000ms | P0 · G20 |
| [client/src/components/task-filters.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/task-filters.tsx) | Rewrite: 3 ngoài + 9 nâng cao trong Popover + Indicator Badge | P1 · G7 |
| [client/src/components/task-dialog.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/task-dialog.tsx) | 4 Tabs + `extraTabs` inject prop | P1 · G9 |
| [client/src/pages/login.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/login.tsx) | 2 cột Brand Identity + Form | P1 · G10 |
| [client/src/components/task-table.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/task-table.tsx) | Column Picker mặc định + Preset Views + ScrollArea horizontal + Sticky cols | P1-P2 · G16-G17 |
| [client/src/components/task-kanban-board.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/task-kanban-board.tsx) | WIP Limits + Dropzone placeholder | P2 · G12 |
| [client/src/components/task-calendar-view.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/components/task-calendar-view.tsx) | Week numbers + Holiday + Overdue đỏ | P2 · G13 |
| [client/src/pages/thu-ky-hop-phan.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/thu-ky-hop-phan.tsx) | Tách 3 state hook → 1200 dòng · 4 Tabs polish Pipeline/Row expand/Card View | P2 · 5.5.1-5.5.5 |
| [client/src/pages/bien-tap.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/bien-tap.tsx) | Stepper 3 bước + Round pills + Workflow Tab + Drawer | P2 · 5.2 |
| [client/src/pages/thiet-ke.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/thiet-ke.tsx) | Duplicate confirm 2 switch + 4 vai trò Grid | P2 · 5.3 |
| [client/src/pages/cntt.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/cntt.tsx) | Segmented CNTT/Quét TL + Duplicate + Parallel Tab | P2 · 5.4 |
| [client/src/pages/team.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/team.tsx) | Toolbar filter · Card 8 phần tử (Heatmap 12 tháng) · Drill-down Modal 4 tabs | P2 · 5.6 |
| [client/src/pages/admin-dashboard.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/admin-dashboard.tsx) | Tổng quan hệ thống 4 khối · đổi tên tab 2 "Audit CV" | P2 · 5.7.1 |
| [client/src/pages/admin-users.tsx](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/pages/admin-users.tsx) | 10 điểm polish U1-U10 (Role badges màu / Bulk / Advanced filter / Random password gen / Mobile dropdown) | P2 · 5.7.2 |
| [client/src/lib/queryClient.ts](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/client/src/lib/queryClient.ts) | Dedupe staleTime 5 phút mặc định | P3 · G18 |

---

## 9. TIÊU CHÍ CHẤT LƯỢNG KHI TRIỂN KHAI (Acceptance Criteria)

### 🎨 Thiết kế / Trực quan
- **WCAG AA Contrast:** Mọi text/foreground trên nền tương phản ≥ 4.5:1 (đặc biệt `muted-foreground` trước đây fail đã fix trong palette mới `--muted-foreground: 25 12% 42%`)
- **Không có 2 màu giống nhau 2 nhóm:** 6 Accent bar trái nhóm phải khác biệt nhận diện mắt thường ngay lập tức (dùng Hue difference ≥30° đảm bảo)

### 🔧 Kỹ thuật / Code
- **Zero console warnings React** (không có `unique key` warning, `useEffect` missing dep — dùng ESLint React Hooks)
- **Sau khi refactor utils:** Tất cả 6 trang group gọi `exportTasksToExcel` từ utils, KHÔNG còn file nào định nghĩa riêng hàm này. Chạy test 1 round xuất Excel từ cả 6 trang → File mở đúng, có style header bold, merge cells đúng.
- **Bundle size không tăng > 10%:** Do chủ yếu refactor (xóa code duplicate) → Size bundle *phải giảm*, nếu tăng thì chỉ do thêm component Skeleton rất nhẹ.
- **Performance Lighthouse trên Dashboard:** Sau G8 + G18 → Performance score > 85 (trước đó có thể <70 vì 8 blocks 1 lần render).

### 👥 Nghiệp vụ
- **Feature parity Duplicate:** 4 nhóm (CV-chung, Biên tập, Thiết kế, CNTT) đều có nút Sao chép hoạt động đúng role mapping đặc thù.
- **Filters nhất quán:** Lọc "Status = In Progress + Priority = High" trên Dashboard và 5 trang group → Kết quả tổng số lượng công việc giống nhau (chỉ khác biệt là trong nhóm đó / tất cả nhóm).
- **Thu-ky sau tách 3 hooks:** Toàn bộ 4 Tab hoạt động giống 100% demo cũ (ko có lỗi filter/sort/pagination), chỉ khác chỗ code gọn hơn và có thêm Pipeline Stepper / Row finance.

---

> 🔚 **TÀI LIỆU HOÀN CHỈNH — Lưu tại:** [UI_UX_REDESIGN_PLAN.md](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/Docs/UI_UX_REDESIGN_PLAN.md)
>
> Trước khi bắt đầu Giai đoạn 1, hãy đảm bảo chạy `npm install` (nếu thêm `@tanstack/react-virtual` sau này) và có 1 database backup test (đề xuất backup local PG18 trước khi triển khai Frontend — vì Frontend không sửa DB nên không cần restore, chỉ đề xuất phòng ngừa sau này).