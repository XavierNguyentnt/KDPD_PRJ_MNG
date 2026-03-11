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
```

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

## 9) Xử lý lỗi thường gặp

### 9.1 403 Forbidden: invalid origin

Nguyên nhân: `CSRF_CHECK=true` nhưng `CSRF_ORIGIN` không khớp URL bạn truy cập.

Cách xử lý:

- Nếu mở `http://localhost:5000` thì `CSRF_ORIGIN=http://localhost:5000`
- Nếu mở `http://192.168.19.4:5000` thì `CSRF_ORIGIN=http://192.168.19.4:5000`
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
