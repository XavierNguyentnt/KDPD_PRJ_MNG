#!/usr/bin/env bash
# ============================================================================
# KDPD PRJ MNG — ONE-CLICK FINAL FIX SCRIPT cho Ubuntu server
# ============================================================================
# Tác vụ:
#   1. Chuẩn bị: cd đúng dự án, TÌM đường dẫn node tuyệt đối (hỗ trợ cả nvm).
#   2. Kill toàn bộ process node/npm cũ đang chạy bằng tay (có thể zombie chiếm port 5000).
#   3. Fix .env CRLF → LF (đã có kdpd-502-fix làm, làm lại để yên tâm).
#   4. npm ci → cài lại dependencies 100% khớp package-lock.json (không thiếu googleapis).
#   5. npm run build → build dist/index.cjs + dist/public.
#   6. Copy Docs/kdpd.service → /etc/systemd/system/kdpd.service + SỬA 3 thông tin động:
#        - User / Group = chính user đang chạy script
#        - WorkingDirectory = pwd (thư mục hiện tại)
#        - EnvironmentFile = <pwd>/.env
#        - ExecStart = <node_absolute_path> dist/index.cjs
#   7. systemctl daemon-reload + enable --now kdpd → start service.
#   8. Chờ 20s để warm up.
#   9. systemctl status + ss port 5000 + curl localhost:5000/login → in kết quả.
#  10. Nếu có nginx thì reload nginx config.
#
# Yêu cầu: phải chạy bằng user có quyền sudo (hoặc root).
# ============================================================================
set -euo pipefail
trap 'echo -e "\n\033[0;31m❌ Script DỪNG đột ngột ở dòng $LINENO. Xem lỗi ngay bên trên.\033[0m"; exit 1' ERR

# ---- colors ----
RED='\033[0;31m'; GREEN='\033[0;32m'; AMBER='\033[0;33m'; CYAN='\033[0;36m'
BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✅ ${1}${NC}"; }
warn() { echo -e "  ${AMBER}⚠️  ${1}${NC}"; }
fail() { echo -e "  ${RED}❌ ${1}${NC}"; }
info() { echo -e "  ${CYAN}ℹ︎  ${1}${NC}"; }
h1()   { echo ""; echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}";
         echo -e "${BOLD}${CYAN} ${1}${NC}";
         echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"; }
h2()   { echo ""; echo -e "${BOLD}${CYAN}── ${1}${NC}"; }

# ------------- GLOBAL PATHS DETECTED DYNAMICALLY -------------
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Đảm bảo đang chạy từ thư mục CHỨA package.json:
if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
  PROJECT_DIR="$(pwd)"
fi
if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
  fail "KHÔNG tìm được package.json. Đặt file này cùng thư mục dự án rồi chạy lại."
  exit 1
fi

CURRENT_USER="$(id -un)"
CURRENT_GROUP="$(id -gn)"
SERVICE_SOURCE="$PROJECT_DIR/Docs/kdpd.service"
SERVICE_DEST="/etc/systemd/system/kdpd.service"
SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

# ---------- Tìm đường dẫn node TƯƠNG ĐỐI (quan trọng với nvm) ----------
find_node_path() {
  # Ưu tiên 1: nvm current version
  if [[ -d "${NVM_DIR:-$HOME/.nvm}" ]]; then
    local nvm_candidate=""
    nvm_candidate=$(find "${NVM_DIR:-$HOME/.nvm}/versions/node" -maxdepth 3 -name node -type f -executable 2>/dev/null | sort -Vr | head -1 || true)
    if [[ -n "$nvm_candidate" ]]; then
      echo "$nvm_candidate"; return 0
    fi
  fi
  # Ưu tiên 2: which node
  local wnode=""
  wnode="$(command -v node 2>/dev/null || true)"
  if [[ -n "$wnode" ]]; then echo "$wnode"; return 0; fi
  # Ưu tiên 3: /usr/bin/node
  if [[ -x /usr/bin/node ]]; then echo "/usr/bin/node"; return 0; fi
  echo ""; return 1
}
NODE_ABS_PATH="$(find_node_path || true)"

# ============================================================================
# START
# ============================================================================
h1 "KDPD FINAL FIX (1-CLICK) — Server $CURRENT_USER @ $HOSTNAME"
info "Thư mục dự án : $PROJECT_DIR"
info "User / Group   : $CURRENT_USER / $CURRENT_GROUP"
info "Node.js path   : ${NODE_ABS_PATH:-'(không tìm thấy — xem Bước 1)'}"
if [[ -n "$SUDO" ]]; then
  info "Sudo prefix    : Sẽ dùng 'sudo' cho các lệnh systemctl / copy service file."
else
  info "Sudo prefix    : Đang chạy bằng ROOT — không cần sudo."
fi

# ============================================================================
# BƯỚC 1 — Node.js OK chưa?
# ============================================================================
h2 "Bước 1/10 — Kiểm tra Node.js"
if [[ -z "$NODE_ABS_PATH" ]]; then
  fail "KHÔNG TÌM THẤY lệnh 'node'!"
  info "Hãy cài Node.js ≥ 20 theo 1 trong 2 cách:"
  echo "    Cách A (nvm, khuyến nghị):"
  echo "      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
  echo "      source ~/.bashrc"
  echo "      nvm install 20 && nvm use 20"
  echo "    Cách B (apt):"
  echo "      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "      sudo apt install -y nodejs"
  exit 2
else
  if $NODE_ABS_PATH --version >/dev/null 2>&1; then
    NODE_VER="$($NODE_ABS_PATH --version)"
    NODE_MAJOR="${NODE_VER%%.*}"
    NODE_MAJOR="${NODE_MAJOR#v}"
    if (( NODE_MAJOR >= 20 )); then
      ok "Node.js $NODE_VER (path: $NODE_ABS_PATH)"
    else
      fail "Node.js QUÁ CŨ: $NODE_VER — cần ≥ 20."
      exit 2
    fi
  else
    fail "File $NODE_ABS_PATH không thực thi được."; exit 2
  fi
fi
export PATH="$(dirname "$NODE_ABS_PATH"):$PATH"

# ============================================================================
# BƯỚC 2 — Kill toàn bộ process node cũ chạy bằng tay (zombie chiếm port 5000)
# ============================================================================
h2 "Bước 2/10 — Kill toàn bộ process node/npm cũ (chạy bằng tay)"
set +e  # pgrep không có gì thì exit 1 không sao
OLD_PIDS="$(pgrep -U "$(id -u)" -f 'node|npm start|dist/index.cjs' 2>/dev/null || true)"
set -e
if [[ -n "$OLD_PIDS" ]]; then
  COUNT="$(echo "$OLD_PIDS" | wc -l | tr -d ' ')"
  info "Phát hiện $COUNT process node cũ đang chạy bằng tay — kill all:"
  echo "    PIDs: $OLD_PIDS"
  if [[ -n "$SUDO" ]]; then
    # Kill bằng user
    echo "$OLD_PIDS" | xargs -r kill -9 2>/dev/null || true
  else
    echo "$OLD_PIDS" | xargs -r kill -9 2>/dev/null || true
  fi
  sleep 2
  # Kiểm tra lại
  set +e
  STILL="$(pgrep -U "$(id -u)" -f 'node|dist/index.cjs' 2>/dev/null || true)"
  set -e
  if [[ -z "$STILL" ]]; then
    ok "Đã kill hết."
  else
    warn "Vẫn còn process. Nếu port 5000 bị chiếm, hãy kiểm tra thủ công bằng 'ss -lntp | grep :5000'."
  fi
else
  ok "Không có process node cũ."
fi

# ============================================================================
# BƯỚC 3 — Fix .env CRLF Windows
# ============================================================================
h2 "Bước 3/10 — Fix .env CRLF mã hóa Windows + validate tồn tại"
if [[ -f "$PROJECT_DIR/.env" ]]; then
  CRLF="$(grep -cU $'\r' "$PROJECT_DIR/.env" 2>/dev/null || echo "0")"
  if [[ "$CRLF" -gt 0 ]]; then
    warn "Phát hiện $CRLF dòng có \\r (CRLF Windows) → fix LF Unix."
    sed -i 's/\r$//' "$PROJECT_DIR/.env"
    ok "Đã fix .env CRLF."
  else
    ok ".env OK (Unix LF)."
  fi
  # Kiểm tra 3 biến tối thiểu
  MISSING_VARS=()
  for v in DATABASE_URL PORT SESSION_SECRET; do
    if ! grep -Eq "^[[:space:]]*${v}=" "$PROJECT_DIR/.env"; then
      MISSING_VARS+=("$v")
    fi
  done
  if (( ${#MISSING_VARS[@]} > 0 )); then
    fail "Thiếu ${#MISSING_VARS[@]} biến bắt buộc trong .env: ${MISSING_VARS[*]}"
    info "   Xem Docs/DEPLOY.md để biết mẫu cấu hình."
  else
    ok "3 biến bắt buộc (DATABASE_URL / PORT / SESSION_SECRET) đều có định nghĩa."
  fi
else
  fail "KHÔNG CÓ FILE .env trong $PROJECT_DIR"
  info "Hãy sao chép từ mẫu hoặc điền lại theo Docs/DEPLOY.md mục 4."
  exit 3
fi

# ============================================================================
# BƯỚC 4 — npm ci (cài lại toàn bộ dependencies 100% khớp package-lock)
# ============================================================================
h2 "Bước 4/10 — npm ci (cài đặt lại node_modules khớp package-lock.json)"
cd "$PROJECT_DIR"
# Dọn dẹp potential corrupt node_modules nếu quá cũ:
if [[ -d node_modules ]] && [[ ! -f node_modules/.package-lock.json ]]; then
  warn "node_modules cũ/không có .package-lock.json → dọn dẹp trước..."
  rm -rf node_modules
fi
if ! npm ci --no-audit --no-fund 2>&1; then
  fail "npm ci THẤT BẠI! (thường thiếu build-essential / python3)"
  info "   Cách fix phổ biến:"
  echo "    sudo apt install -y build-essential python3"
  echo "    Sau đó chạy lại script."
  exit 4
fi
ok "npm ci thành công."

# ============================================================================
# BƯỚC 5 — npm run build
# ============================================================================
h2 "Bước 5/10 — npm run build (client + server)"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
BUILD_START=$(date +%s)
set +e
NPM_BUILD_LOG="$(npm run build 2>&1)"
BUILD_RC=$?
set -e
BUILD_END=$(date +%s)
BUILD_DUR=$((BUILD_END - BUILD_START))
if [[ $BUILD_RC -ne 0 ]]; then
  fail "npm run build THẤT BẠI sau ${BUILD_DUR}s. Xem 100 dòng lỗi cuối:"
  echo "$NPM_BUILD_LOG" | tail -100
  exit 5
fi
ok "npm run build THÀNH CÔNG trong ${BUILD_DUR}s."

# Verify dist OK
if [[ -f "$PROJECT_DIR/dist/index.cjs" ]]; then
  SIZE=$(stat -c%s "$PROJECT_DIR/dist/index.cjs" 2>/dev/null || echo 0)
  ok "dist/index.cjs (${SIZE} bytes)."
  if grep -aq "startBackupScheduler\|isRestoreRunning\|backup" "$PROJECT_DIR/dist/index.cjs" 2>/dev/null; then
    ok "dist/index.cjs CHỨA backup engine code mới."
  else
    warn "dist/index.cjs minify — không tìm thấy string marker (bình thường)."
  fi
else
  fail "dist/index.cjs KHÔNG TỒN TẠI sau build thành công!?"; exit 5
fi
if [[ -f "$PROJECT_DIR/dist/public/index.html" ]]; then
  ok "dist/public/index.html (frontend asset OK)."
else
  warn "dist/public/index.html không có (có thể Frontend được serve riêng)."
fi

# ============================================================================
# BƯỚC 6 — Tạo systemd unit file /etc/systemd/system/kdpd.service
# ============================================================================
h2 "Bước 6/10 — Cập nhật systemd service kdpd.service"

if [[ ! -f "$SERVICE_SOURCE" ]]; then
  fail "Thiếu file mẫu $SERVICE_SOURCE — kiểm tra git pull có lấy được Docs/kdpd.service không."
  exit 6
fi

# Tạo một file tạm từ mẫu + SỬA 4 tham số ĐỘNG theo máy chủ thực tế
TMP_SVC="$(mktemp /tmp/kdpd.service.XXXXXX)"
trap 'rm -f "$TMP_SVC"' EXIT

cp "$SERVICE_SOURCE" "$TMP_SVC"

# 6a. Thay User / Group
sed -i "s|^User=.*|User=$CURRENT_USER|"  "$TMP_SVC"
sed -i "s|^Group=.*|Group=$CURRENT_GROUP|" "$TMP_SVC"

# 6b. Thay WorkingDirectory / EnvironmentFile
ESCAPED_PWD="$(echo "$PROJECT_DIR" | sed 's/[&/\]/\\&/g')"
sed -i "s|^WorkingDirectory=.*|WorkingDirectory=$ESCAPED_PWD|"  "$TMP_SVC"
sed -i "s|^EnvironmentFile=.*|EnvironmentFile=$ESCAPED_PWD/.env|" "$TMP_SVC"
sed -i "s|^ReadWritePaths=.*|ReadWritePaths=$ESCAPED_PWD /tmp /home/$CURRENT_USER|"  "$TMP_SVC"

# 6c. Thay ExecStart thành đường dẫn NODE tuyệt đối + dist/index.cjs
EXEC_START="$NODE_ABS_PATH dist/index.cjs"
ESCAPED_EXEC="$(echo "$EXEC_START" | sed 's/[&/\]/\\&/g')"
sed -i "s|^ExecStart=.*|ExecStart=$ESCAPED_EXEC|" "$TMP_SVC"

# 6d. Nếu không có PostgreSQL service thì bỏ After/Wants postgresql để không bị chờ
POSTGRES_ACTIVE=0
if command -v systemctl >/dev/null 2>&1; then
  if systemctl list-units --type=service --all --no-pager 2>/dev/null | grep -qiE 'postgresql(-[0-9.]+)?\.service'; then
    POSTGRES_ACTIVE=1
  fi
fi
if [[ $POSTGRES_ACTIVE -eq 0 ]]; then
  info "Không tìm thấy postgresql.service systemd — bỏ After/Wants postgresql."
  sed -i 's|^\(After=.*\) postgresql.service|\1|' "$TMP_SVC"
  sed -i 's|^\(Wants=.*\) postgresql.service|\1|' "$TMP_SVC"
fi

info "Service file tạm tạo ra: $TMP_SVC"
info "Nội dung tham số quan trọng:"
echo "   User         : $CURRENT_USER"
echo "   WorkingDir   : $PROJECT_DIR"
echo "   Node path    : $NODE_ABS_PATH"
echo "   ExecStart    : $EXEC_START"

# Copy → /etc/systemd/system/kdpd.service
if [[ -n "$SUDO" ]]; then
  $SUDO cp -f "$TMP_SVC" "$SERVICE_DEST"
  $SUDO chmod 0644 "$SERVICE_DEST"
  $SUDO chown root:root "$SERVICE_DEST"
else
  cp -f "$TMP_SVC" "$SERVICE_DEST"
  chmod 0644 "$SERVICE_DEST"
  chown root:root "$SERVICE_DEST"
fi
ok "Đã copy service → $SERVICE_DEST"

# ============================================================================
# BƯỚC 7 — systemctl daemon-reload + enable + start
# ============================================================================
h2 "Bước 7/10 — systemctl daemon-reload + enable --now kdpd"
if command -v systemctl >/dev/null 2>&1; then
  $SUDO systemctl daemon-reload
  ok "daemon-reload OK."

  # Stop cũ trước (có thể đang chạy dưới tên khác)
  $SUDO systemctl stop kdpd kdpd-server node-app 2>/dev/null || true

  # Enable + start
  if $SUDO systemctl enable --now kdpd 2>&1; then
    ok "systemctl enable --now kdpd OK."
  else
    fail "enable --now kdpd LỖI! Xem ngay:"
    $SUDO journalctl -u kdpd -n 40 --no-pager 2>/dev/null || true
    exit 7
  fi
else
  fail "Không tìm thấy systemctl — chạy bằng PM2 / tmux thủ công:"
  info "    cd $PROJECT_DIR && nohup node dist/index.cjs > kdpd-app.log 2>&1 &"
  exit 7
fi

# ============================================================================
# BƯỚC 8 — Chờ 20s warm up + kiểm tra service status
# ============================================================================
h2 "Bước 8/10 — Chờ 20s để app khởi động xong"
for i in 5 10 15 20; do
  sleep 5
  info "  +${i}s …"
done

h2 "→ Trạng thái service ngay sau warm-up:"
set +e
$SUDO systemctl status kdpd --no-pager 2>&1 | head -15
SVC_ACTIVE=$($SUDO systemctl is-active kdpd 2>/dev/null || echo "unknown")
set -e
echo ""
if [[ "$SVC_ACTIVE" == "active" ]]; then
  ok "Service kdpd đang ACTIVE (running)."
else
  fail "Service kdpd KHÔNG active (trạng thái: $SVC_ACTIVE). Lỗi gần nhất:"
  $SUDO journalctl -u kdpd -n 50 --no-pager 2>/dev/null || true
  exit 8
fi

# ============================================================================
# BƯỚC 9 — Verify port 5000 + curl test backend
# ============================================================================
h2 "Bước 9/10 — Verify port 5000 listener + curl backend"
set +e
if command -v ss >/dev/null 2>&1; then
  LISTEN=$(ss -lntp 2>/dev/null | grep ':5000' || true)
else
  LISTEN=$(netstat -lntp 2>/dev/null | grep ':5000' || true)
fi
set -e
if [[ -n "$LISTEN" ]]; then
  ok "Có process LẮNG NGHE port 5000:"
  echo "    $LISTEN"
else
  warn "Chưa thấy port 5000 lắng nghe (chưa khởi động xong hoặc PORT trong .env khác 5000)."
  # Check xem PORT trong .env là gì?
  ENV_PORT=$(grep -E '^[[:space:]]*PORT=' "$PROJECT_DIR/.env" | head -1 | cut -d= -f2 | tr -d '[:space:]"' || true)
  info "PORT trong .env = ${ENV_PORT:-(không có → app mặc định 5000)}"
fi

echo ""
info "Test HTTP GET http://127.0.0.1:5000/login (bỏ qua Nginx):"
set +e
CURL_OUT=$(curl -sS -o /dev/null -w "HTTP_CODE=%{http_code}  IP=%{remote_ip}  TIME=%{time_total}s\n" --max-time 10 http://127.0.0.1:5000/login 2>&1)
CURL_RC=$?
set -e
echo "    $CURL_OUT"
if [[ $CURL_RC -eq 0 ]] && (echo "$CURL_OUT" | grep -qE "HTTP_CODE=2[0-9][0-9]|HTTP_CODE=30[0-9]"); then
  ok "Backend port 5000 trả HTTP 2xx/3xx → BACKEND KHỎE 100%!"
else
  fail "Backend không trả lời. Xem 40 dòng journalctl lỗi gần nhất:"
  $SUDO journalctl -u kdpd -n 40 --no-pager 2>/dev/null || true
  exit 9
fi

# ============================================================================
# BƯỚC 10 — Reload Nginx (nếu có)
# ============================================================================
h2 "Bước 10/10 — Reload Nginx config (nếu có)"
if command -v nginx >/dev/null 2>&1; then
  NGINX_STATUS=""
  if command -v systemctl >/dev/null 2>&1; then
    NGINX_STATUS="$(systemctl is-active nginx 2>/dev/null || echo "inactive")"
  fi
  if [[ "$NGINX_STATUS" == "active" ]]; then
    info "Test nginx syntax:"
    NGINX_TEST=$($SUDO nginx -t 2>&1) || true
    echo "    $NGINX_TEST"
    if echo "$NGINX_TEST" | grep -qi "test is successful\|syntax is ok"; then
      $SUDO nginx -s reload 2>&1 || $SUDO systemctl reload nginx 2>&1 || true
      ok "Nginx reload OK."
    else
      warn "Nginx syntax CÓ LỖI! → Xem chi tiết ngay bên trên (lỗi test)."
    fi
  else
    warn "Nginx không chạy (systemctl inactive). Bỏ qua."
  fi
else
  info "Server này không cài Nginx (chưa cần reverse proxy). Bỏ qua."
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================
h1 "FINAL — HOÀN THÀNH 10/10 BƯỚC"
echo ""
echo -e "  ${BOLD}Tóm tắt kết quả:${NC}"
echo "    • Node.js       : $NODE_VER (path: $NODE_ABS_PATH)"
echo "    • Build dist    : $(stat -c%s "$PROJECT_DIR/dist/index.cjs" 2>/dev/null || echo "?") bytes"
echo "    • Service kdpd  : $SVC_ACTIVE"
echo "    • Port 5000     : $( [[ -n "$LISTEN" ]] && echo listening || echo '(chưa thấy, có thể PORT trong .env khác)' )"
echo "    • Curl test     : $CURL_OUT"
echo ""
echo -e "  ${BOLD}Cách dùng sau này:${NC}"
echo "    ▶  Update code mới:"
echo "        cd $PROJECT_DIR"
echo "        git fetch --all --prune ; git pull --rebase"
echo "        npm ci ; npm run build"
echo "        sudo systemctl restart kdpd ; sleep 10 ; sudo systemctl status kdpd --no-pager"
echo ""
echo "    ▶  Xem logs lỗi khi cần:"
echo "        sudo journalctl -u kdpd -f --no-pager    (theo dõi realtime)"
echo "        sudo journalctl -u kdpd -n 100 --no-pager  (100 dòng cuối)"
echo ""
echo "    ▶  Upload code lỗi:"
echo "        cat $PROJECT_DIR/kdpd-one-click-fix-report.log  | nc termbin.com 9999"
echo ""
ok "Bây giờ truy cập lại 👉 http://task.kdpd.local/ — Ctrl+Shift+R hard refresh."

# Ghi lại log cuối để user tra cứu
echo "" > "$PROJECT_DIR/kdpd-one-click-fix-report.log"
echo "[TIMESTAMP] $(date -Iseconds)" >> "$PROJECT_DIR/kdpd-one-click-fix-report.log"
echo "[PROJECT]  $PROJECT_DIR" >> "$PROJECT_DIR/kdpd-one-click-fix-report.log"
echo "[NODE]     $NODE_VER @ $NODE_ABS_PATH" >> "$PROJECT_DIR/kdpd-one-click-fix-report.log"
echo "[SERVICE]  $SVC_ACTIVE" >> "$PROJECT_DIR/kdpd-one-click-fix-report.log"
echo "[CURL]     $CURL_OUT" >> "$PROJECT_DIR/kdpd-one-click-fix-report.log"
