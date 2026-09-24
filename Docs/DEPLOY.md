# Hướng dẫn triển khai (Production) – KDPD_PRJ_MNG

Tài liệu này tổng hợp toàn bộ quy trình từ chuẩn bị PostgreSQL, restore dữ liệu, cấu hình `.env`, build và chạy production trên máy chủ Ubuntu.

## 1) Yêu cầu hệ thống

- Ubuntu Server (khuyến nghị 22.04/24.04)
- Node.js 20+ và npm
- Git
- PostgreSQL (khuyến nghị 17; 16 vẫn dùng được nhưng có thể vướng một số dòng `SET` khi restore dump từ Neon)

Kiểm tra nhanh:

```bash
node -v
npm -v
git --version
psql --version
```

## 2) Lấy code và cài dependencies

```bash
cd ~/Task-Project
git clone <URL_REPO> KDPD_PRJ_MNG
cd KDPD_PRJ_MNG
npm ci
```

Nếu đã có repo và muốn cập nhật code:

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
git fetch --all --prune
git pull --rebase

# ⚠️ BƯỚC BẮT BUỘC (bỏ qua sẽ lỗi 502 Bad Gateway):
#  - Cập nhật dependencies (phòng trường hợp có package mới như googleapis)
#  - Rebuild lại dist/index.cjs + static assets cho code mới
npm ci
npm run build

# Sau đó mới restart service
sudo systemctl restart kdpd

# Kiểm tra 10s xem có crash lặp lại không:
sleep 8 ; sudo systemctl status kdpd --no-pager
```

**Nếu BỎ QUA bước `npm run build`:** file `dist/index.cjs` vẫn là bản cũ không chứa các
hàm mới (như `startBackupScheduler`, `restoreFromDumpUpsert`, …) → Node.js throw
`SyntaxError: Unexpected token 'import'` hoặc `Module not found` → Service liên tục
crash → Port 5000 không có app lắng nghe → Nginx trả **502 (Bad Gateway)**.


## 3) Thiết lập PostgreSQL local

### 3.1 Cài PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql postgresql-client
sudo systemctl enable --now postgresql
```

### 3.2 Tạo user và database cho ứng dụng

```bash
sudo -u postgres psql
```

Chạy trong `psql`:

```sql
CREATE USER kdpd_user WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE kdpd_db OWNER kdpd_user;
\q
```

### 3.3 Restore dữ liệu từ file backup có sẵn trên máy

Trong repo thường có các file backup ở `attached_assets/DB Backup/*.sql` (có thể có thêm trong `attached_assets/DB Backup/Old DB/`).

1. Chọn file backup mới nhất:

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
ls -lh "attached_assets/DB Backup"/*.sql
ls -lh "attached_assets/DB Backup/Old DB"/*.sql
```

2. Luôn restore vào DB sạch để tránh lỗi trùng bảng/dữ liệu:

```bash
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='kdpd_db' AND pid <> pg_backend_pid();"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS kdpd_db;"
sudo -u postgres psql -c "CREATE DATABASE kdpd_db OWNER kdpd_user;"
```

3. Restore:

```bash
psql "postgresql://kdpd_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/kdpd_db" \
  -f "attached_assets/DB Backup/<TEN_FILE_BACKUP>.sql" \
  2>&1 | tee restore.log
```

Ghi chú:

- Dump lấy từ Neon có thể chứa nhiều object nội bộ (roles/schemas/extensions) không tồn tại trên Postgres local. Nếu bạn restore để phục vụ ứng dụng KDPD, các lỗi kiểu `role "neon_*" does not exist` có thể xuất hiện nhưng thường không ảnh hưởng đến các bảng ứng dụng trong schema `public`.
- Không dùng `-v ON_ERROR_STOP=1` khi restore dump Neon kiểu này, vì sẽ dừng sớm và không tạo đủ schema/data.

4. Kiểm tra các bảng ứng dụng đã vào DB chưa:

```bash
psql "postgresql://kdpd_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/kdpd_db" -c "\dt public.*"
psql "postgresql://kdpd_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/kdpd_db" -c "select count(*) from public.users;"
```

Kỳ vọng: có các bảng như `users`, `tasks`, `roles`, `task_assignments`, `session`, ...

## 4) Tạo và cấu hình `.env`

### 4.1 Kiểm tra có `.env` chưa

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
ls -la .env
```

Nếu chưa có:

```bash
touch .env
```

### 4.2 Sửa `.env`

Mở file bằng `nano`:

```bash
nano .env
```

Mẫu cấu hình tối thiểu (PostgreSQL local):

```env
DATABASE_URL=postgresql://kdpd_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/kdpd_db
PORT=5000
NODE_ENV=production
SESSION_SECRET=CHANGE_ME_TO_RANDOM_LONG_STRING

# Nếu chạy HTTP (không có TLS), phải set false để cookie session không bị trình duyệt chặn
SESSION_SECURE=false

# Bật CSRF check (khuyến nghị), nhớ set đúng origin bạn đang truy cập
CSRF_CHECK=true
CSRF_ORIGIN=http://localhost:5000
TRUST_PROXY=1
```

Lưu ý quan trọng khi viết `.env`:

- Không dùng backtick (`...`) hoặc thêm khoảng trắng thừa quanh dấu `=`.
- `CSRF_ORIGIN` phải khớp chính xác URL bạn mở trên trình duyệt (scheme + host + port).
- Nếu bạn truy cập bằng IP LAN (ví dụ `http://192.168.19.4:5000`) thì đặt `CSRF_ORIGIN=http://192.168.19.4:5000`.
- `CSRF_ORIGIN` hỗ trợ nhiều origin (phân tách bằng dấu phẩy). Ví dụ:
  - `CSRF_ORIGIN=http://task.kdpd.local,https://<TEN_NGROK>.ngrok-free.dev`

## 5) Build và chạy production

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
npm ci
npm run build
npm start
```

Ứng dụng chạy mặc định ở:

- Local: `http://localhost:5000`
- LAN: `http://<IP_SERVER>:5000` (trên Linux, server bind `0.0.0.0`)

## 6) Chạy dưới dạng service (systemd) – khuyến nghị

Ví dụ tạo service `kdpd.service` (chỉnh đường dẫn cho đúng):

```ini
[Unit]
Description=KDPD Project Management
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/kdpd-project/Task-Project/KDPD_PRJ_MNG
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
User=kdpd-project

[Install]
WantedBy=multi-user.target
```

Kích hoạt:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kdpd
sudo systemctl status kdpd --no-pager
journalctl -u kdpd -n 200 --no-pager
```

### 6.1 Tuỳ chọn khác để chạy nền (không cần mở terminal)

Nếu không dùng systemd, có thể dùng một trong các phương án dưới đây.

#### PM2 (quản lý process Node)

```bash
sudo npm i -g pm2
cd /home/kdpd-project/Task-Project/KDPD_PRJ_MNG
pm2 start npm --name kdpd -- start

# Tự khởi động khi reboot
pm2 startup systemd
pm2 save

# Theo dõi và quản lý
pm2 logs kdpd
pm2 status
pm2 restart kdpd
pm2 stop kdpd
```

#### tmux (giữ phiên làm việc)

```bash
sudo apt install -y tmux
tmux new -s kdpd
cd /home/kdpd-project/Task-Project/KDPD_PRJ_MNG
npm start
# Tách phiên: Ctrl+B rồi D
tmux attach -t kdpd
```

#### nohup (đơn giản)

```bash
cd /home/kdpd-project/Task-Project/KDPD_PRJ_MNG
nohup npm start > app.out 2>&1 &
```

Ghi chú: `nohup` không tự khởi động khi reboot và khó quản lý log/phiên bản hơn. Nên ưu tiên **systemd** hoặc **PM2** cho production.

## 7) Truy cập bằng domain nội bộ (port 80, không cần :5000)

Mục tiêu: truy cập từ các máy khác trong LAN bằng URL dạng `http://task.kdpd.local/`.

### 7.1 Tạo DNS nội bộ (hoặc chỉnh hosts)

Bạn cần đảm bảo các máy trong LAN phân giải `task.kdpd.local` về IP LAN của máy chạy server (ví dụ `192.168.19.4`).

- Cách nhanh (trên từng máy client): thêm vào file hosts:
  - Windows: `C:\Windows\System32\drivers\etc\hosts`
  - Linux/macOS: `/etc/hosts`

  Nội dung:

  ```text
  192.168.19.4 task.kdpd.local
  ```

- Cách chuẩn: cấu hình DNS nội bộ (router/DHCP DNS, Pi-hole/AdGuard Home, DNS server) với A record `task.kdpd.local -> 192.168.19.4`.

### 7.2 Cấu hình `.env` cho domain

Vì bạn truy cập bằng port 80, CSRF origin phải khớp đúng domain:

```env
CSRF_CHECK=true
CSRF_ORIGIN=http://task.kdpd.local
TRUST_PROXY=1
SESSION_SECURE=false
```

Ghi chú:

- Không dùng backtick (`...`) và không viết hoa khác nhau (`Task.kdpd.local` ≠ `task.kdpd.local`).
- `SESSION_SECURE=false` là bắt buộc nếu chạy HTTP (không có TLS), để cookie session không bị trình duyệt chặn.

### 7.3 Cài Nginx reverse proxy port 80 → 5000

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

Tạo file cấu hình:

```bash
sudo nano /etc/nginx/sites-available/task.kdpd.local
```

Nội dung:

```nginx
server {
  listen 80;
  server_name task.kdpd.local;

  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Enable site và reload:

```bash
sudo ln -sf /etc/nginx/sites-available/task.kdpd.local /etc/nginx/sites-enabled/task.kdpd.local
sudo nginx -t
sudo systemctl reload nginx
```

Nếu dùng UFW:

```bash
sudo ufw allow 80/tcp
sudo ufw status
```

Sau cùng, đảm bảo service app vẫn chạy ở port 5000 (`systemctl status kdpd` hoặc `npm start`), rồi truy cập: `http://task.kdpd.local/`.

## 8) Backup dữ liệu (Ubuntu, PostgreSQL 17)

Mục tiêu: tạo file backup định kỳ để có thể restore lại DB khi cần.

### 8.1 Backup nhanh (plain SQL)

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
mkdir -p backups

pg_dump "postgresql://kdpd_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/kdpd_db" \
  -F p \
  --no-owner --no-acl \
  -f "backups/kdpd_db_$(date +%F_%H%M).sql"
```

### 8.2 Backup dạng custom (khuyến nghị: nhỏ hơn, restore nhanh hơn)

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
mkdir -p backups

pg_dump "postgresql://kdpd_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/kdpd_db" \
  -F c \
  --no-owner --no-acl \
  -f "backups/kdpd_db_$(date +%F_%H%M).dump"
```

Restore từ file `.dump`:

```bash
createdb -U kdpd_user -h localhost -p 5432 kdpd_db_restore
pg_restore -U kdpd_user -h localhost -p 5432 -d kdpd_db_restore --no-owner --no-acl "backups/<TEN_FILE>.dump"
```

### 8.3 Backup tự động bằng cron (mỗi đêm 01:30)

1. Tạo script backup:

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
mkdir -p scripts backups

cat > scripts/backup_db.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "$0")/../backups" && pwd)"
mkdir -p "$BACKUP_DIR"

pg_dump "postgresql://kdpd_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/kdpd_db" \
  -F c \
  --no-owner --no-acl \
  -f "$BACKUP_DIR/kdpd_db_$(date +%F_%H%M).dump"

find "$BACKUP_DIR" -type f -name 'kdpd_db_*.dump' -mtime +14 -delete
EOF

chmod +x scripts/backup_db.sh
```

2. Thêm cron:

```bash
crontab -e
```

Thêm dòng:

```cron
30 1 * * * /home/kdpd-project/Task-Project/KDPD_PRJ_MNG/scripts/backup_db.sh >> /home/kdpd-project/Task-Project/KDPD_PRJ_MNG/backups/backup.log 2>&1
```

Ghi chú:

- Cấu hình cron trên sẽ giữ lại backup 14 ngày gần nhất.
- Nếu không muốn hardcode mật khẩu trong URL, có thể dùng biến môi trường `DATABASE_URL` từ `.env` (cần đảm bảo cron load được env), hoặc dùng `.pgpass`.

## 8.4 Đồng bộ schema DB theo code (Drizzle)

Khi cập nhật code có thay đổi schema (ví dụ thêm cột mới), cần đồng bộ vào PostgreSQL.

Ví dụ chạy `drizzle-kit push` bằng `DATABASE_URL`:

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
export DATABASE_URL='postgresql://kdpd_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/kdpd_db'
npm run db:push
```

Ghi chú:

- Lệnh này sẽ áp schema ở `shared/schema.ts` vào DB hiện tại.
- Nếu user DB không đủ quyền, cần dùng user có quyền DDL (ALTER TABLE, CREATE EXTENSION, ...).

## 8.5 Thêm cột created_by cho tasks (phân quyền xóa công việc)

Mục tiêu: chỉ người tạo task mới được phép xóa task.

### 8.5.1 Thêm cột + khóa ngoại bằng psql (Ubuntu)

```bash
export DATABASE_URL='postgresql://kdpd_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/kdpd_db'
psql "$DATABASE_URL"
```

Trong prompt `psql`:

```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id)
  ON DELETE SET NULL;
```

Nếu báo `already exists` ở phần constraint thì nghĩa là khóa ngoại đã được tạo trước đó.

### 8.5.2 Cách chạy an toàn (chỉ thêm constraint nếu chưa tồn tại)

PostgreSQL không hỗ trợ cú pháp `ADD CONSTRAINT IF NOT EXISTS`. Nếu cần idempotent, dùng `DO $$`:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_created_by_fkey'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;
END $$;
```

### 8.5.3 Kiểm tra

```bash
psql "$DATABASE_URL" -c "\d tasks"
```

Ghi chú:

- Các task đã có trước khi thêm cột sẽ có `created_by = NULL` nên theo rule “chỉ người tạo mới xóa” thì sẽ không ai xóa được các task cũ này, trừ khi bạn backfill dữ liệu hoặc thêm ngoại lệ.

## 9) Xử lý lỗi thường gặp

### 9.1 403 Forbidden: invalid origin

Nguyên nhân: `CSRF_CHECK=true` nhưng `CSRF_ORIGIN` không khớp URL bạn truy cập.

Cách xử lý:

- Nếu mở `http://localhost:5000` thì `CSRF_ORIGIN=http://localhost:5000`
- Nếu mở `http://192.168.19.4:5000` thì `CSRF_ORIGIN=http://192.168.19.4:5000`
- Nếu cần mở đồng thời nhiều domain (ví dụ domain nội bộ + ngrok) thì tách bằng dấu phẩy:
  - `CSRF_ORIGIN=http://task.kdpd.local,https://<TEN_NGROK>.ngrok-free.dev`
- Restart server sau khi sửa `.env`

### 9.2 401 Unauthorized liên tục sau khi login

Nguyên nhân phổ biến: cookie session bị trình duyệt chặn vì cấu hình `Secure` trên HTTP.

Cách xử lý:

- Đảm bảo `.env` có `SESSION_SECURE=false` khi chạy HTTP.
- Xóa cookie/site data của domain rồi login lại.

### 9.3 Database not configured

Nguyên nhân: server không đọc được `.env` hoặc `DATABASE_URL` rỗng.

Checklist:

- `.env` nằm đúng thư mục root project (cùng cấp `package.json`)
- `DATABASE_URL=...` không có backtick/space thừa
- restart process sau khi sửa `.env`

### 9.4 Kiểm tra đang dùng DB local hay Neon

Kiểm tra nhanh trong `.env`:

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
grep -n '^DATABASE_URL=' .env
```

- `@localhost:5432` → PostgreSQL local
- `ep-...neon.tech` / `-pooler` → Neon

Hoặc hỏi DB trực tiếp:

```bash
psql "$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)" -c "select inet_server_addr(), inet_server_port(), current_database(), current_user;"
```

## 10) Tích hợp Google Calendar (OAuth + đồng bộ)

Mục tiêu: cho phép người dùng kết nối Google Calendar và đồng bộ các công việc trong hệ thống thành sự kiện trên Google Calendar.

### 10.1 Chuẩn bị phía Google Cloud Console

1. Chọn đúng Project đang dùng (cùng project chứa `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).
2. Bật API:
   - APIs & Services → Library → **Google Calendar API** → Enable
3. Cấu hình OAuth Consent Screen (Google Auth Platform):
   - Audience/Publishing status: **Testing** (không cần verify cho môi trường nội bộ)
   - Data Access → Scopes: thêm các scope:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.readonly`
   - Audience → Test users: thêm các tài khoản Google sẽ dùng thử
4. Credentials → OAuth 2.0 Client IDs:
   - Tạo hoặc sửa client loại **Web application**
   - Authorized redirect URIs: thêm đúng callback URL của hệ thống (xem 10.2)

### 10.2 Chọn callback URL (tránh dùng `.local`)

Google không chấp nhận redirect URI dạng domain nội bộ `.local` (ví dụ `task.kdpd.local`). Bạn có 3 lựa chọn:

- **Localhost (chỉ phù hợp khi thao tác trên chính máy chạy app hoặc dùng SSH tunnel):**
  - `http://localhost:5000/api/google-calendar/oauth2/callback`
- **Tunnel public (ngrok/Cloudflare Tunnel) – phù hợp khi ISP chặn port 80/443 hoặc không muốn mở port:**
  - `https://<TEN_NGROK>.ngrok-free.dev/api/google-calendar/oauth2/callback`
  - Lưu ý: ngrok free có thể đổi domain khi restart tunnel → cần cập nhật lại redirect URI và `.env`.
- **Domain public ổn định (khuyến nghị production):**
  - `https://oauth.<DOMAIN_THAT>/api/google-calendar/oauth2/callback`

### 10.3 Cấu hình `.env` cho Google Calendar

Thêm vào `.env` (không dùng backtick, không thêm khoảng trắng thừa quanh dấu `=`):

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALENDAR_REDIRECT_URI=https://<CALLBACK_DOMAIN>/api/google-calendar/oauth2/callback
```

Ghi chú:

- `GOOGLE_REDIRECT_URI` và `GOOGLE_REFRESH_TOKEN` (nếu có) là cho luồng Gmail mailer, không dùng cho Calendar sync.
- Nếu chạy HTTP (không có TLS), giữ `SESSION_SECURE=false` để cookie session không bị trình duyệt chặn.

### 10.4 Đồng bộ schema DB cho các bảng Google Calendar

Nếu code có thay đổi schema (thêm `google_calendar_accounts`, `google_calendar_event_links`), chạy:

```bash
cd ~/Task-Project/KDPD_PRJ_MNG
export DATABASE_URL='postgresql://kdpd_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/kdpd_db'
npm run db:push
```

Nếu cập nhật tính năng Thông báo (đánh dấu quan trọng), cần thêm cột `is_important`:

```sql
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS is_important boolean NOT NULL DEFAULT false;
```

### 10.5 Cách kết nối và đồng bộ trong UI

1. Mở màn **Lịch** → tab **Đồng bộ**
2. Bấm **Kết nối Google Calendar**
3. Sau khi kết nối:
   - Bật/tắt **Tự động đồng bộ**
   - Nhập `calendarId` (mặc định `primary`, hoặc dán “ID lịch” của lịch KDPD dạng `...@group.calendar.google.com`)
   - Bấm **Đồng bộ ngay** để đẩy các task hiện có (được giao cho user) lên Google Calendar

### 10.6 Lưu ý & lỗi thường gặp

- `401 Unauthorized. Please log in.` tại callback:
  - Bạn đang gọi callback trên domain (ngrok/tunnel) nhưng chưa đăng nhập trên chính domain đó.
  - Cách đúng: mở app bằng chính domain callback (ngrok/tunnel), đăng nhập, rồi bấm “Kết nối Google Calendar”.
- `403 Forbidden: invalid origin` khi login qua ngrok:
  - Do `CSRF_CHECK=true` và origin không nằm trong `CSRF_ORIGIN`.
  - Giờ `CSRF_ORIGIN` hỗ trợ nhiều origin bằng dấu phẩy, ví dụ:
    - `CSRF_ORIGIN=http://task.kdpd.local,https://<TEN_NGROK>.ngrok-free.dev`
- `redirect_uri_mismatch`:
  - Redirect URI trong Google Cloud Console phải khớp 100% với `GOOGLE_CALENDAR_REDIRECT_URI` (scheme/host/path).
- `ERR_NGROK_6024` (ngrok browser warning):
  - Ngrok có thể chèn trang cảnh báo lần đầu. Nếu chặn callback OAuth, hãy “Continue” một lần, hoặc dùng domain ổn định/paid/tunnel khác.


## 11) Phụ lục A — Troubleshooting nâng cao: Các lỗi thường gặp từ lần triển khai cuối

Phần này tổng hợp các lỗi thực tế xảy ra khi update code lên máy chủ Ubuntu task.kdpd.local (tháng 9/2026), nguyên nhân gốc + cách xử lý step-by-step.

---

### 11.1 502 Bad Gateway — Tổng quan 7 nguyên nhân + 1 Runbook 1 trang

> **502 Bad Gateway** từ Nginx nghĩa là: **Nginx (port 80) chạy khỏe nhưng không thể kết nối được Node.js app ở backend port 5000**.
> Tức 99% trường hợp là **backend Node.js đã crash hoặc chưa start** (không phải lỗi Nginx).

#### Nguyên nhân P0-P2 phổ biến (từ cao đến thấp):

| # | Nguyên nhân | Dấu hiệu nhận biết (lệnh chẩn đoán) | Fix 1 dòng / Runbook |
|---|---|---|---|
| **1** (P0) | Bỏ qua bước `npm run build` sau `git pull` | `journalctl -u kdpd -n 50` có `SyntaxError` / `Module not found` (ví dụ `startBackupScheduler` không tồn tại) | `npm ci && npm run build && sudo systemctl restart kdpd` |
| **2** (P0) | `.env` bị lỗi CRLF (mã hóa Windows) khi copy từ máy Windows | Kiểm tra: `cat -A .env | head -20` thấy ký tự `^M` ở cuối mọi dòng | `sed -i 's/\r$//' .env` rồi restart |
| **3** (P0) | File `.env` bị **gộp 2-3 dòng vào 1** (do terminal width nhỏ tự wrap ký tự `>` copy/paste) | `grep -E '^[A-Z0-9_]+=.*>.*=' .env` ra kết quả | Dùng `kdpd-generate-clean-env.sh` tạo lại env sạch heredoc |
| **4** (P0) | `DATABASE_URL` bị cắt thiếu `:5433/kdpd_db?schema=public` và gộp luôn `PORT=5000` | `grep -E '^DATABASE_URL=.*>PORT=' .env` | Sửa thành: `postgresql://kdpd_user:PASS@localhost:5433/kdpd_db?schema=public` |
| **5** (P1) | `CSRF_ORIGIN` bị gộp với `GOOGLE_CALENDAR_REDIRECT_URI` + `TRUST_PROXY=1` trong 1 dòng | `grep -nE '^CSRF_ORIGIN=.*anneliese.*TRUST_PROXY' .env` | Tách 3 dòng riêng biệt, các origin phân cách bằng dấu phẩy |
| **6** (P1) | Backend Node.js không có service manager (`systemctl status kdpd` = `not-found`) | `ss -lntp | grep ':5000'` = empty, `ps aux | grep node` = 0 dòng | Dùng `kdpd-one-click-fix.sh` TỰ TẠO `/etc/systemd/system/kdpd.service` + enable |
| **7** (P2) | Lỗi runtime import.meta.url undefined khi build thành `dist/index.cjs` (format CJS) | `journalctl` có `TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string or an instance of URL. Received undefined at fileURLToPath` | Pull commit mới nhất (fix fallback chain 3 bước ESM → CJS __dirname global → process.argv) |

#### 🚀 Runbook 1-trang sửa 502 NHANH NHẤT (luôn chạy khi gặp 502):

```bash
cd ~/Task-Project/KDPD_PRJ_MNG

# BƯỚC 1: XEM LÝ DO CRASH THẬT (QUAN TRỌNG NHẤT)
journalctl -u kdpd -n 100 --no-pager | tail -60

# BƯỚC 2: SẠCH ENV + PULL CODE MỚI
sed -i 's/\r$//' .env
git stash push -u -m "local before 502 fix"
git pull --rebase origin main
git stash pop

# BƯỚC 3: REBUILD 100%
npm ci
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# BƯỚC 4: (NẾU CHƯA CÓ SYSTEMD SERVICE) TẠO + START VĨNH VIỄN
chmod +x kdpd-one-click-fix.sh
sudo bash ./kdpd-one-click-fix.sh 2>&1 | tee 502-fix.log

# BƯỚC 5: KIỂM TRA 20s SAU
sleep 20
sudo systemctl status kdpd --no-pager                # active (running) 👍
ss -lntp | grep ':5000'                                # có LISTEN 👍
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:5000/login
# => HTTP 302 hoặc HTTP 200 = BACKEND KHỎE. Hard refresh browser.
```

---

### 11.2 ENV bị lỗi CRLF (Windows line endings → Linux)

**Triệu chứng:** Các lỗi rất quái như:
- `DATABASE_URL` parse sai hostname (có `\r` ở cuối user/password gây auth fail)
- `SESSION_SECRET` có ký tự \r ở cuối → session sign fail
- `NODE_ENV` = `production\r` → không match production string trong code

**Chẩn đoán:**
```bash
cat -A .env | head -30
# → Mọi dòng kết thúc bằng ^M$ thay vì $ đơn thuần → lỗi CRLF
```

**Fix vĩnh viễn (1 dòng):**
```bash
sed -i 's/\r$//' .env
```

**Ngăn ngừa tương lai:**
```bash
git config core.autocrlf input           # Trên Linux/Mac (chuyển về LF khi commit)
git config core.autocrlf true            # Trên Windows (checkout CRLF, commit LF)
# Hoặc dùng file .gitattributes:
echo '* text=auto eol=lf' >> .gitattributes
```

---

### 11.3 `.env` bị gộp nhiều dòng vào 1 (wrap ký tự `>` khi copy/paste terminal nhỏ)

**Triệu chứng (dễ nhận biết nhất):** grep ra các dòng có chứa dấu `>` xen giữa 2 `KEY=VALUE`:
```bash
grep -nE '^[A-Z0-9_]+=.*>.*[A-Z0-9_]+=' .env
# Ví dụ output lỗi:
# 3:DATABASE_URL=postgresql://kdpd_user:xxx@localhost>PORT=5000
# 15:CSRF_ORIGIN=http://task.kdpd.local,https://brotherlike-*>TRUST_PROXY=1
```

**Nguyên nhân:** Copy-paste từ màn hình terminal/SSH client có chiều rộng nhỏ (< 100 cột). Terminal tự downline dòng và thêm dấu `>` ở đầu dòng tiếp theo → khi paste ra thì dấu `>` đó nằm GIỮA 2 biến env khác nhau.

**Fix 2 cách:**
- ✅ **Cách 1 (Khuyến nghị):** Dùng script heredoc tự tạo env 100% sạch: `bash kdpd-generate-clean-env.sh`. Script ghi từng dòng bằng `cat << 'ENVEOF' > .env` nên 100% không bị wrap, không bị CRLF, không backtick.
- Cách 2 (thủ công): Mở nano, kiểm tra từng dòng 1, đảm bảo mỗi biến env đúng 1 line.

**Cách kiểm tra env OK:**
```bash
# Không có output gì = GOOD
grep -cE '^[A-Z0-9_]+=.*>.*[A-Z0-9_]+=' .env | grep -cE '^0$'

# 3 biến quan trọng đúng format không dấu >:
grep -E '^(DATABASE_URL|CSRF_ORIGIN|GOOGLE_CALENDAR_REDIRECT_URI)=' .env
```

---

### 11.4 Cross-Origin-Opener-Policy header bị ignore (untrusted origin) trên HTTP LAN

**Triệu chứng:** DevTools Console có warning màu vàng:
```
The Cross-Origin-Opener-Policy header has been ignored, because the URL's origin was untrustworthy.
```

**Nguyên nhân:** Browser chỉ tôn trọng COOP/CORP headers trên origin **"potentially trustworthy"**:
- ✅ HTTPS (bất kỳ host nào)
- ✅ `localhost` / `127.0.0.1`
- ❌ HTTP LAN như `http://task.kdpd.local` / `http://192.168.x.x/` → **untrusted** → browser ignore header và log warning.

**Fix (đã commit vào middleware.ts `securityHeaders()`):**
- Chỉ gửi 2 headers COOP + CORP khi `isHttps === true` HOẶC `host === localhost/127.0.0.1/::1`.
- HTTP LAN → **không gửi 2 headers này** → warning biến mất hoàn toàn.
- Các header an toàn khác (X-Frame-Options, X-Content-Type-Options, Permissions-Policy, Referrer-Policy) **vẫn giữ nguyên mọi origin** (hoạt động đúng).

---

### 11.5 GitHub Push Protection GH013 — Push contain secrets (Google Client ID / Secret)

**Triệu chứng:** `git push origin main` bị reject:
```
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote:   GITHUB PUSH PROTECTION — Push cannot contain secrets
        —— Google OAuth Client ID —— path: kdpd-generate-clean-env.sh:77
        —— Google OAuth Client Secret —— path: kdpd-generate-clean-env.sh:78
```

**Nguyên nhân:** Lần đầu viết script generate env, tôi 2 dòng Google CID/SEC thật hardcode vào file bash. GitHub Secret Scanning match pattern và chặn push.

**Fix đã commit (3 thay đổi):**
1. Trong `kdpd-generate-clean-env.sh`: Đổi 2 dòng hardcode thành placeholder `__G_CLIENT_ID_PLACEHOLDER__` + prompt nhập khi chạy script. Đọc mặc định từ `.env.backup` (nếu có) theo function `extract_old_env`. Cuối script dùng `sed -i` thay placeholder bằng giá trị user vừa nhập.
2. Thêm vào `.gitignore`: pattern tránh commit các file chứa secrets thật sinh thời gian chạy:
   ```
   .env.backup-*
   kdpd-*-report.log
   kdpd-*-fix*.log
   ```
3. Tạo file `.env.example` (63 dòng) 100% placeholder, không chứa giá trị thật — cho người mới clone: `cp .env.example .env` rồi điền.

**Push lại sau amend commit (xoá secret khỏi lịch sử push):**
```bash
# Sau khi fix code sạch secret:
git add -A
git commit --amend --no-edit
git push --force-with-lease origin main    # Chỉ force những commits chưa được ai pull
```

---

### 11.6 Runtime crash: `TypeError: The "path" argument must be of type string. Received undefined at fileURLToPath`

**Triệu chứng (exit code 1 ngay sau start, không đến bước listen port 5000):**
```
Database connection initialized (Neon/Postgres)
TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string or an instance of URL. Received undefined
    at fileURLToPath (node:internal/url:1645:11)
    at .../dist/index.cjs:213:7391
```

**Nguyên nhân:** Code cũ backup.ts `__dirname = path.dirname(fileURLToPath(import.meta.url))`.
- ESM dev (`npx tsx server/index.ts`) → `import.meta.url` = `file:///.../backup.ts` → OK.
- Production build CJS bundle `dist/index.cjs` → esbuild set `import.meta = {}` (warning `empty-import-meta`) → `.url` = **undefined** → crash.

**Fix (đã commit backup.ts L84-L108):**
Chain 3 fallback đa dạng format runtime:
```ts
let __dirname: string;
{
  const imu = (typeof import.meta !== "undefined" && import.meta && import.meta.url) || undefined;
  if (imu && typeof imu === "string") {
    __dirname = path.dirname(fileURLToPath(imu));                    // ESM
  } else if (typeof globalThis.__dirname === "string") {
    __dirname = globalThis.__dirname;                                // CJS bundle (Node inject)
  } else {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
    __dirname = entry ? path.dirname(entry) : process.cwd();         // Fallback cuối
  }
}
```

**Verify fix hoạt động:**
Build production CJS → start → xem log:
```bash
npm run build
timeout 180s npm start 2>&1 | head -50
# -> Không còn TypeError, in ra "Server listening on port 5000..." → OK
```

---

### 11.7 Không có systemd service quản lý (service manager = manual / ?)

**Triệu chứng:**
```bash
sudo systemctl status kdpd
# → Unit kdpd.service could not be found.
# → kdpd-one-click-fix.sh in report: "Service manager = manual / ?"
ss -lntp | grep ':5000'
# → Empty (không có process lắng nghe)
```

**Nguyên nhân:** Trước đó app được start bằng `tmux` hoặc `nohup npm start &` bằng tay. Sau khi update code kill process cũ quên start lại → 502 mãi mãi.

**Fix vĩnh viễn (tạo systemd service 1 lần):**
Để project có sẵn template [Docs/kdpd.service](file:///d:/Vincent/DEV/KDPD_PRJ_MNG/Docs/kdpd.service). Dùng `kdpd-one-click-fix.sh` sẽ tự render 4 tham số ĐỘNG theo máy thật (User, Group, WorkingDirectory, ExecStart node_abs_path), copy vào `/etc/systemd/system/kdpd.service`, sau đó:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kdpd
# Sau đó server REBOOT app sẽ tự start lại không cần can thiệp thủ công
```

**Manual create service (nếu không muốn dùng script):**
```bash
sudo tee /etc/systemd/system/kdpd.service << 'EOF'
[Unit]
Description=KDPD Project Node.js Server
After=network.target postgresql.service nginx.service

[Service]
Type=simple
User=kdpd-project
Group=kdpd-project
WorkingDirectory=/home/kdpd-project/Task-Project/KDPD_PRJ_MNG
EnvironmentFile=/home/kdpd-project/Task-Project/KDPD_PRJ_MNG/.env
# Sửa <PATH_NODE_ABS> = output của `which node` (hoặc which trong nvm)
ExecStart=<PATH_NODE_ABS> dist/index.cjs
Restart=always
RestartSec=5
# Limit:
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now kdpd
sudo systemctl status kdpd --no-pager        # → active (running) ✅
```

---

### 11.8 `npm warn install-scripts ... bcrypt ... esbuild ...` — allowScripts block postinstall

**Triệu chứng:** Khi `npm ci` hoặc `npm install` có warning:
```
npm warn install-scripts 6 packages have install scripts not yet covered by allowScripts:
  esbuild@0.18.20 (postinstall: node install.js)
  bcrypt@6.0.0 (install: node-gyp-build)
  bufferutil@4.1.0 (install: node-gyp-build)
```

**Nguyên nhân:** Từ npm 10+ có tính năng "allow-scripts" mặc định deny mọi lifecycle script (postinstall/install) cho những package chưa được approve — để ngăn chặn supply chain attack.

**Cách xử lý (khi nào cần approve):**
- ✅ **Nếu build OK và runtime không báo lỗi** → BỎ QUA (chỉ là warning, không block chức năng).
- ❌ **Nếu build fail hoặc runtime throw** `Cannot find module esbuild-linux-x64` / `bcrypt_lib.node`:
  ```bash
  # Phê duyệt 1 lúc 6 packages (chỉ cần approve 1 lần vĩnh viễn, lưu vào package.json)
  npm install-scripts approve esbuild bcrypt bufferutil @esbuild/linux-x64 @esbuild/win32-x64 @esbuild/darwin-arm64
  # Sau đó cài lại để script chạy thật:
  npm ci
  # Hoặc rebuild riêng bcrypt bindings:
  npm rebuild bcrypt
  ```
- Hoặc dùng cách cũ (disable toàn bộ allow-scripts, kém an toàn hơn):
  ```bash
  npm config set ignore-scripts false
  npm ci
  ```

---

### 11.9 `git pull --rebase origin main` bị chặn `cannot pull with rebase: You have unstaged changes.`

**Triệu chứng:**
```bash
git pull --rebase origin main
error: cannot pull with rebase: You have unstaged changes.
error: Please commit or stash them.
```

**Nguyên nhân:** Working tree có thay đổi tracked hoặc untracked — git không rebase được vì lo sợ ghi đè thay đổi local của bạn.

**Chẩn đoán xem có thay đổi gì cần giữ không:**
```bash
git status
git diff --name-status
```

Thường trong production sẽ có 2 nhóm (giống trường hợp lần cuối):

| Nhóm | Ví dụ | Có giữ? | Xử lý |
|---|---|---|---|
| **Tracked modified** | `kdpd-generate-clean-env.sh`, `package.json`, `package-lock.json` | ❌ **Không giữ** — bản mới đã push lên GitHub rồi | `git restore <files>` hoặc `git stash push ... <files>` sau đó **drop stash** |
| **Untracked** | `uploads/avatars/*.jpg`, `build.log`, `.env.backup` | ✅ **Cần GIỮ** — là dữ liệu thời gian chạy thực tế của user | Không động, chúng nằm ngoài git, git pull sẽ không ghi đè |

**Cách xử lý ĐÚNG NHẤT (10 lệnh tóm gọn):**
```bash
# Giấu tracked changes (các script + package) — KHÔNG động untracked
git stash push -- keep-index -- \
  kdpd-generate-clean-env.sh kdpd-one-click-fix.sh package.json package-lock.json

# Pull code mới
git pull --rebase origin main

# BỎ stashed bản CŨ (không pop — vì chúng ta muốn bản MỚI từ github)
git stash drop

# Verify untracked vẫn còn (avatars + build.log):
git status

# Build lại như thường
npm run build
```

**Nếu lười liệt kê tên file → hard reset tracked, giữ nguyên untracked:**
```bash
# ⚠️ Chỉ dùng khi chắc chắn không có thay đổi local nào cần giữ
git checkout -- .           # Restore mọi tracked files về trạng thái HEAD
git pull --rebase origin main
```

---

### 11.10 PostgreSQL CREATEDB permission denied (chức năng Restore backup)

**Triệu chứng (khi Preview Restore hoặc Upsert Restore lần đầu):**
```
ERROR: permission denied to create database (SQLSTATE 42501)
→ Quyền CREATEDB bị thiếu. Hướng dẫn cấp quyền (chạy 1 lần bằng superuser postgres):
    psql -U postgres -p 5433 -c "ALTER USER kdpd_user CREATEDB;"
```

**Nguyên nhân:** Restore Upsert/Preview cần quyền `CREATE DATABASE` để tạo DB tạm (`restore_tmp_<rand>`) làm sandbox — không đụng chạm gì `public` schema của DB chính `kdpd_db`. User `kdpd_user` mặc định không có quyền này (chỉ superuser `postgres` có).

**Fix vĩnh viễn (chạy 1 lần DUY NHẤT = vĩnh viễn):**
```bash
sudo -u postgres psql -p 5433 -c "ALTER USER kdpd_user CREATEDB;"
# Bằng chứng quyền đã có:
sudo -u postgres psql -p 5433 -c "\du kdpd_user"
# → List of roles Attributes phải có "Create DB" ✅
```

**Nếu chạy lệnh trên mà báo role "kdpd_user" không tồn tại:**
- Kiểm tra đúng user trong `DATABASE_URL`: `grep -E '^DATABASE_URL=' .env | cut -d: -f2 | cut -c3-`
- Kiểm tra đúng port Postgres: `ss -lntp | grep postgres` hoặc `grep -E '^DATABASE_URL=' .env | grep -oE '@localhost:[0-9]+'`

---

### 11.11 Backup Module — 403 Forbidden toàn bộ /api/backup/* (Passport context sai)

**Triệu chứng:**
```
admin-backup-panel.tsx GET /api/backup/config 403 Forbidden
GET /api/backup/files 403
POST /api/backup/trigger 403
```

**Nguyên nhân gốc:** Hàm `requireAdmin()` trong backup.ts cũ đọc user từ `req.session.user` thay vì `req.user`. Passport.js chỉ inject thông tin user vào `req.user` sau khi middleware `requireAuth` chạy xong — `req.session.user` là rỗng → role check luôn false → trả 403.

**Fix đã commit:**
Viết lại `userHasAdminRole()` clone đúng pattern chuẩn middleware `userHasRole` 4 cấp check:
1. `role?.name === UserRole.ADMIN` (enum)
2. `role?.code?.toLowerCase() === "admin"`
3. `role?.name?.toLowerCase() === "admin"`
4. Normalize tiếng Việt không dấu name có chứa "quantrivien" hoặc "admin"

Fallback string: `req.user.role.toLowerCase() === "admin"`.

---

### 11.12 pg_dump lỗi: `'C:\Program' is not recognized as an internal or external command` (Windows)

**Triệu chứng (trên Windows dev):**
```
Sao lưu thất bại pg_dump thoát mã 1. Stderr:
'C:\Program' is not recognized as an internal or external command, operable program or batch file.
```

**Nguyên nhân gốc:** Code cũ `spawn(pgDumpPath, args, { shell: process.platform === "win32" })`.
- `shell: true` trên Windows gọi `cmd.exe /C "..."` → cmd.exe parse command line theo khoảng trắng đầu tiên → executable bị cắt = `C:\Program` (thiếu phần ` Files\PostgreSQL\17\bin\pg_dump.exe`).

**Fix vĩnh viễn đã commit:**
- `shell: false` **LUÔN cho mọi platform** (Node.js gọi trực tiếp `CreateProcessW` trên Windows hỗ trợ path chứa khoảng trắng ngay cả khi không có dấu ngoặc kép).
- Mở rộng detect pg_dump path cho cả `Program Files (x86)` + versions 12..18 + Linux Debian `/usr/lib/postgresql/*/bin` + RHEL `/usr/pgsql-*/bin` + Homebrew macOS.

---

### 11.13 Backup trigger 500 Internal Server Error (generic message không rõ lý do)

**Nguyên nhân 2 phần:**
1. Backend catch block chỉ trả `JSON { message: err.message }` 1 dòng ngắn, không append các hướng dẫn 3 dòng context (pg_dump path không tìm thấy, permission denied, password sai,...).
2. Frontend Toast Shadcn mặc định `white-space: normal` = collapse newline → 3 dòng hint bị nhét thành 1 dòng khó đọc.

**Fix 3 tầng đồng bộ (đã commit):**
| Tầng | Thay đổi |
|---|---|
| **Server runBackup()** | `console.error` full stack trace ra terminal backend (kèm stderr pg_dump). |
| **Server routes trigger catch** | Double log (backup.ts logger + routes.ts logger) + JSON message có chứa 3 dòng gợi ý (`\n\n→ Hướng dẫn 1\n→ Hướng dẫn 2...`). |
| **Client toast mutations** | Thêm arbitrary Tailwind selector giữ newline + scroll overflow: `className="[&_[data-slot=toast-description]]:whitespace-pre-wrap text-[12px] max-h-[42vh] overflow-auto"` + `console.error` client side để DevTools thấy rõ. |

Sau fix: Toast đỏ hiện đầy đủ nguyên nhân + 3 dòng gợi ý cách fix cụ thể.

---

### 11.14 Build OOM (heap out of memory) khi build client trên máy 2GB RAM

**Triệu chứng:**
```
<--- Last few GCs --->
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

**Nguyên nhân:** Vite build + esbuild server cần heap ≥ 3-4 GB cho 3384 module transforms. Máy chủ production tầm 2-4 GB cần tăng Node.js heap size thủ công.

**Fix 2 cách:**
```bash
# Cách 1: Biến môi trường (dùng tạm thời lệnh build)
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Cách 2: Export vĩnh viễn vào .bashrc / .profile
echo 'export NODE_OPTIONS="--max-old-space-size=4096"' >> ~/.bashrc
source ~/.bashrc
npm run build
```

Nếu 4GB vẫn lỗi → tăng 8192 (yêu cầu máy thật có ≥ 8GB).

---

### 11.15 Nginx upstream connect failed (Connection refused)

**Triệu chứng:** `sudo tail -f /var/log/nginx/error.log`:
```
connect() failed (111: Connection refused) while connecting to upstream, client: 192.168.x.x, server: task.kdpd.local, request: "GET / HTTP/1.1", upstream: "http://127.0.0.1:5000/"
```

**Kiểm tra 3 lệnh:**
```bash
# 1) Service kdpd có active?
sudo systemctl status kdpd --no-pager

# 2) Port 5000 có LISTEN thật trên loopback không?
ss -lntp | grep ':5000'

# 3) Curl backend trực tiếp (bỏ qua Nginx) — kết quả HTTP 2xx/3xx = backend khỏe
curl -sv http://127.0.0.1:5000/login 2>&1 | tail -15
```

**Fix phổ biến theo lỗi tìm được:**
- service kdpd inactive = **11.7** tạo service systemd
- Port 5000 không LISTEN = **11.1 Runbook 502 full**
- Curl ra Connection refused nhưng port 3000 listen = → sửa `.env` → `PORT=5000` (nếu bạn muốn giữ 3000 thì sửa nginx upstream proxy_pass thành http://127.0.0.1:3000 rồi `sudo nginx -t && sudo nginx -s reload`)

---

### 11.16 EADDRINUSE: address already in use :::5000

**Triệu chứng:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Nguyên nhân:** Process Node.js cũ chiếm port 5000 chưa chết (ví dụ kill trước đó không dùng SIGTERM/SIGKILL), hoặc có service khác dùng port 5000.

**Fix:**
```bash
# Tìm process chiếm port 5000
sudo ss -lntp | grep ':5000'
# Hoặc: sudo lsof -i :5000 -sTCP:LISTEN

# Kill PID đó (thay <PID> = số thật)
sudo kill -TERM <PID>
sleep 2 ; sudo kill -KILL <PID>  # (nếu vẫn còn)

# Hoặc kill ALL các node process (cẩn thận nếu máy có nhiều app node):
pkill -9 -f "node dist/index.cjs"

# Sau đó start lại:
sudo systemctl restart kdpd
```

---

### 11.17 Client fetch 502 khi backend healthy (check proxy_pass port mismatch)

**Triệu chứng khó chịu:** `curl 127.0.0.1:5000/login` ra **HTTP 302** (backend khỏe) nhưng browser vẫn báo 502, log nginx vẫn Connection refused.

**Nguyên nhân:** app backend thực tế chạy ở `PORT=3000` (do `.env` set PORT khác) nhưng nginx site-available vẫn hardcode `proxy_pass http://127.0.0.1:5000;`.

**Fix 2 dòng:**
```bash
# 1) Tìm port thật app backend đang listen:
ss -lntp | grep node
# Hoặc: grep PORT= .env

# 2) Sửa nginx vhost:
sudo nano /etc/nginx/sites-available/kdpd
# Sửa proxy_pass http://127.0.0.1:<PORT_THẬT>;

# 3) Test syntax OK rồi reload:
sudo nginx -t && sudo systemctl reload nginx
```

---

### 11.18 npm ci vs npm install — Cái nào dùng khi nào?

| Công việc | Nên dùng | Lý do |
|---|---|---|
| **Fresh install** (clone repo mới, trên server production CI/CD) | `npm ci` | Strict 100% theo `package-lock.json` → cài đúng phiên bản từng package 100%. Giữ nguyên lockfile, không update version gì cả. |
| **Muốn add package mới** hoặc update deps | `npm install [pkg]` | Sửa `package.json` + update lockfile |
| **Sau git pull** update code có thể thay đổi `package.json` / `package-lock.json` | **`npm ci`** (QUAN TRỌNG) | Đảm bảo node_modules khớp 100% lockfile → không có chuyện "package A ver 1.2 cũ vẫn còn, code mới cần 1.3" |

> ✅ Luôn dùng `npm ci` trước mỗi bước `npm run build` khi update code lên production (có trong Runbook mục **11.1**).

---

### 11.19 Avatar uploads (hoặc uploads/files) bị mất sau khi git reset / clean

**Triệu chứng:** Sau khi `git clean -fd` hoặc hard reset mạnh → các user upload avatar trước đó mất hết, UI avatar lỗi 404.

**Nguyên nhân:** Thư mục `uploads/avatars/*.jpg` là **untracked files** (không commit vào git, vì file này sinh thời gian chạy per-user). Lệnh `git clean -fd` sẽ xoá **tất cả untracked files** (dù là dữ liệu user).

**Ngăn chặn:**
1. **Luôn chạy** `git clean -nd` **TRƯỚC** `-fd` (dry run preview — chỉ in ra danh sách sẽ xoá, **chưa xoá thật**). Xem danh sách nếu thấy `uploads/` hoặc `data/` → **đừng clean -fd**.
2. Add `uploads/` vào `.gitignore` project-wide:
   ```bash
   echo 'uploads/' >> .gitignore
   git add .gitignore && git commit -m "gitignore uploads dir produced at runtime"
   ```
3. Dùng `git stash push -u` thay cho `git clean` khi cần làm sạch working tree (stash giữ lại untracked files ở kho tạm git có thể khôi phục sau).

**Khôi phục nếu đã lỡ xoá:** Xem log file của user report ảnh avatar nào mất → yêu cầu họ upload lại. Nếu có folder backup `~/backups/uploads/` trước đó → copy ngược lại.

---

### 11.20 Dùng PM2 thay vì systemd (nếu team đã quen PM2)

Trong hầu hết các case production, systemd là tốt hơn (đi kèm OS, không cần thêm dependency, tự start sau reboot mà không cần PM2 resurrect). Nhưng nếu bạn đã cấu hình PM2 cho các service khác và muốn thống nhất:

```bash
npm install -g pm2
cd ~/Task-Project/KDPD_PRJ_MNG

# Start app 1 lần, set name kdpd:
pm2 start dist/index.cjs --name kdpd --env production

# Save PM2 process list để reboot auto-start:
pm2 save
pm2 startup systemd
# → Copy output lệnh sudo env PATH=... systemctl enable pm2-xxx và chạy nó

# Các lệnh quản lý:
pm2 status kdpd
pm2 logs kdpd --lines 100
pm2 restart kdpd
pm2 reload kdpd   # (zero-downtime, nếu có cluster)
```

---

### 11.21 Google OAuth Client ID / Secret bị cắt khi copy/paste

**Triệu chứng:**
```
GOOGLE_CLIENT_ID=676277385515-ev3msglulb0f2scpiv33mjmoeh81gvtl.apps.go>
GOOGLE_REFRESH_TOKEN=1//04GtThbdc743OCgYIARAAGAQSNwF-L9Ir-BcMbvpg_uwxE>
```
→ Ký tự cuối bị cắt bởi `>` wrap terminal. OAuth sẽ báo `invalid_client` hoặc `unauthorized_client`.

**Fix:** Luôn verify 2 regex pattern sau khi paste env:
```bash
# Google CID: phải kết thúc bằng .apps.googleusercontent.com
grep -qE '^GOOGLE_CLIENT_ID=.+\.apps\.googleusercontent\.com$' .env || echo "CID bị cắt!"

# Google SECRET (GOCSPX- prefix 33 chars):
grep -qE '^GOOGLE_CLIENT_SECRET=(GOCSPX-[A-Za-z0-9_-]{24})$' .env || echo "Client Secret có vẻ không chuẩn"
```

Cách tốt nhất: luôn dùng script `kdpd-generate-clean-env.sh` để nhập từng trường 1 theo prompt.

---

## 12) Quick reference: Trang lệnh nhanh tay

Bảng tóm tắt các lệnh hay dùng nhất khi vận hành production:

```bash
# 🔧 Xem trạng thái dịch vụ
sudo systemctl status kdpd postgresql nginx --no-pager

# 📄 Xem log app Node.js (100 dòng cuối + theo dõi realtime)
journalctl -u kdpd -n 100 --no-pager
journalctl -u kdpd -f

# 🧪 Kiểm tra app khỏe
ss -lntp | grep -E ':(5000|5432|5433|80)'
curl -sS -o /dev/null -w "HTTP %{http_code}  %{time_total}s\n" http://127.0.0.1:5000/login

# 🔄 Full rebuild + restart production (sau git pull)
cd ~/Task-Project/KDPD_PRJ_MNG
sed -i 's/\r$//' .env
git stash push -u -m "temp before rebuild"
git pull --rebase origin main
git stash pop
npm ci
NODE_OPTIONS="--max-old-space-size=4096" npm run build 2>&1 | tee build.log
sudo systemctl restart kdpd
sleep 10 && sudo systemctl status kdpd --no-pager

# 🗂️ PostgreSQL user CREATEDB (cho Restore Backup feature)
sudo -u postgres psql -p 5433 -c "ALTER USER kdpd_user CREATEDB;"
sudo -u postgres psql -p 5433 -c "\du kdpd_user" | grep Create

# ⚠️ Nginx syntax check + reload
sudo nginx -t
sudo systemctl reload nginx
```
