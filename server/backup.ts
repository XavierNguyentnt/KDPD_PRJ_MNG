/**
 * Database Backup Engine — cho KDPD Dự án
 *
 * Export:
 *  - runBackupManual(): Promise<BackupFile>     (trigger thủ công từ nút Admin)
 *  - loadBackupConfig() / saveBackupConfig(cfg) (lưu vào data/backup-config.json)
 *  - listBackupFiles(): Promise<BackupFile[]>  (quét thư mục backups/)
 *  - deleteBackupFile(filename): Promise<void>
 *  - getBackupDownloadPath(filename): string   (absolute file path)
 *  - startBackupScheduler(): void               (khởi động mỗi 60s, check lịch trình)
 *
 * Thiết kế:
 *  - Không dùng node-cron (giảm dependency mới) → setInterval 60s check giờ phút.
 *  - pg_dump spawn giống neon-backup.ts, format `-F c` (custom compressed) cho pg_restore tiện.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import type { IncomingMessage } from "http";
import type { Session } from "express-session";
import type { Request } from "express";
import { google } from "googleapis";
import type { UserWithRolesAndGroups } from "@shared/schema";
import { UserRole } from "@shared/schema";
import { pool as _pgPool } from "./db.js";
const pgPool = _pgPool as import("pg").Pool | null;

// ---------------------------------------------------------------------------
// Types (không depend shared schema để module độc lập)
// ---------------------------------------------------------------------------
export type BackupStorageMode = "local" | "gdrive" | "onedrive";
export type BackupScheduleMode = "off" | "daily" | "weekly" | "monthly";

export interface BackupConfig {
  /** Nơi lưu file backup: máy chủ local / Google Drive / OneDrive */
  storageMode: BackupStorageMode;
  /** Đường dẫn thư mục local (storageMode === local), default: ./backups */
  localFolderPath: string;
  /** Link / ID thư mục Google Drive (người dùng tự nhập URL share) */
  gdriveFolderLink: string;
  /** Link / ID thư mục OneDrive */
  onedriveFolderLink: string;
  /** Tắt / Hằng ngày / Hằng tuần / Hằng tháng */
  scheduleMode: BackupScheduleMode;
  /** Giờ chạy backup (0-23), default: 2 (2h sáng) */
  scheduleHour: number;
  /** Phút (0-59), default: 0 */
  scheduleMinute: number;
  /** Hằng tuần: Thứ mấy chạy (0 Chủ Nhật → 6 Thứ 7), default: 1 Thứ 2 */
  scheduleWeekday: number;
  /** Hằng tháng: Ngày mấy trong tháng (1-28), default: 1 */
  scheduleDayOfMonth: number;
  /** ISO timestamp lần chạy cuối (dùng scheduler check) */
  lastRunAt: string | null;
  /** Tên file backup cuối cùng chạy */
  lastFileName: string | null;
  /** Có giữ tối đa N bản backup gần nhất không (auto xoá cũ) */
  keepLastN: number;
}

export interface BackupFile {
  filename: string;
  sizeBytes: number;
  createdAtISO: string;
  prettySize: string;
  storageMode: BackupStorageMode;
  trigger: "manual" | "schedule";
}

export interface BackupRunLogEntry {
  startedAtISO: string;
  endedAtISO: string | null;
  status: "running" | "success" | "failed";
  filename: string | null;
  error: string | null;
  trigger: "manual" | "schedule";
  uploadedTo?: "gdrive" | "onedrive" | null;
  uploadFileId?: string | null;
  uploadError?: string | null;
}

// ---------------------------------------------------------------------------
// Paths & defaults
// ---------------------------------------------------------------------------
// Lấy __dirname đa dạng runtime format (ESM / CJS bundled / direct node run):
//   - ESM:  import.meta.url là file:// URL
//   - CJS (dist/index.cjs):  import.meta.url = undefined (esbuild warning)
//     nhưng global __dirname được Node.js inject cho CJS
//   - Fallback cuối cùng:  process.argv[1] (entry point file) hoặc process.cwd()
let __dirname: string;
{
  const imu = (typeof import.meta !== "undefined" && import.meta && (import.meta as { url?: string }).url) || undefined;
  if (imu && typeof imu === "string") {
    __dirname = path.dirname(fileURLToPath(imu));
  } else if (typeof (globalThis as { __dirname?: string }).__dirname === "string") {
    __dirname = (globalThis as { __dirname: string }).__dirname;
  } else {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
    __dirname = entry ? path.dirname(entry) : process.cwd();
  }
}
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const CONFIG_FILE = path.join(DATA_DIR, "backup-config.json");
const LOG_FILE = path.join(DATA_DIR, "backup-run-log.json");
const DEFAULT_BACKUPS_DIR = path.join(PROJECT_ROOT, "backups");

const DEFAULT_CONFIG: BackupConfig = {
  storageMode: "local",
  localFolderPath: DEFAULT_BACKUPS_DIR,
  gdriveFolderLink: "",
  onedriveFolderLink: "",
  scheduleMode: "off",
  scheduleHour: 2,
  scheduleMinute: 0,
  scheduleWeekday: 1,
  scheduleDayOfMonth: 1,
  lastRunAt: null,
  lastFileName: null,
  keepLastN: 14,
};

ensureDirSync(DATA_DIR);
ensureDirSync(DEFAULT_BACKUPS_DIR);

function ensureDirSync(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function prettySize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ---------------------------------------------------------------------------
// Config & Log load/save
// ---------------------------------------------------------------------------
export function loadBackupConfig(): BackupConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw || "{}") as Partial<BackupConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (_) {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveBackupConfig(partial: Partial<BackupConfig>): BackupConfig {
  const cur = loadBackupConfig();
  const next: BackupConfig = { ...cur, ...partial };
  ensureDirSync(DATA_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function loadRunLog(): BackupRunLogEntry[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf8") || "[]") as BackupRunLogEntry[];
  } catch (_) {
    return [];
  }
}

function appendRunLog(entry: BackupRunLogEntry): void {
  const list = loadRunLog();
  list.unshift(entry);
  const trimmed = list.slice(0, 50);
  ensureDirSync(DATA_DIR);
  fs.writeFileSync(LOG_FILE, JSON.stringify(trimmed, null, 2), "utf8");
}

export function getRunLog(): BackupRunLogEntry[] {
  return loadRunLog();
}

// ---------------------------------------------------------------------------
// pg_dump / pg_restore path helper (cross-platform: Windows / macOS / Linux)
// Lưu ý: Trên Windows, PostgreSQL thường cài tại C:\Program Files\PostgreSQL\VER\bin
//   vì path chứa dấu cách (Program Files), LUÔN dùng shell:false khi spawn
//   (Node.js gọi trực tiếp CreateProcessW, không qua cmd.exe → không bị tách command).
//   Trên Linux: tìm /usr/lib/postgresql/*/bin (Debian/Ubuntu) hoặc /usr/pgsql-*/bin
//   (RHEL/CentOS/Fedora), cuối cùng fallback /usr/bin hoặc PATH system.
// ---------------------------------------------------------------------------
function detectLinuxPgBin(binName: "pg_dump" | "pg_restore"): string | null {
  try {
    const exists = (p: string) => fs.existsSync(p);
    // 1. Debian / Ubuntu / pop-os: /usr/lib/postgresql/{ver}/bin/{pg_dump,pg_restore}
    const versions = ["18", "17", "16", "15", "14", "13", "12", "11"];
    for (const v of versions) {
      const p = path.join("/usr/lib/postgresql", v, "bin", binName);
      if (exists(p)) return p;
    }
    // 2. RHEL / CentOS / Rocky / Fedora
    for (const v of versions) {
      const p = path.join(`/usr/pgsql-${v}`, "bin", binName);
      if (exists(p)) return p;
    }
    // 3. Homebrew (macOS/Linux brew): /opt/homebrew/bin, /usr/local/bin
    const brewPaths = [
      `/opt/homebrew/bin/${binName}`,
      `/usr/local/bin/${binName}`,
      `/usr/bin/${binName}`,
    ];
    for (const p of brewPaths) if (exists(p)) return p;
    return null;
  } catch {
    return null;
  }
}

function getPgDumpPath(): string {
  // 1. User override env cao nhất ưu tiên
  if (process.env.PG_DUMP_PATH?.trim()) {
    return process.env.PG_DUMP_PATH.trim();
  }
  if (process.platform === "win32") {
    const programDirs = [
      process.env.ProgramW6432 || process.env.ProgramFiles || "C:\\Program Files",
      process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
    ].filter(Boolean) as string[];
    const versions = ["18", "17", "16", "15", "14", "13", "12"];
    for (const programDir of programDirs) {
      for (const v of versions) {
        const p = path.join(programDir, "PostgreSQL", v, "bin", "pg_dump.exe");
        if (fs.existsSync(p)) {
          return p;
        }
      }
    }
    return "pg_dump.exe";
  }
  // macOS / Linux
  const linuxPath = detectLinuxPgBin("pg_dump");
  if (linuxPath) return linuxPath;
  return "pg_dump";
}

/** pg_restore lives in the same bin directory as pg_dump.
 *  Override env: PG_RESTORE_PATH (hoặc tự động tìm theo binName pg_restore giống pg_dump)
 */
function getPgRestorePath(): string {
  if (process.env.PG_RESTORE_PATH?.trim()) {
    return process.env.PG_RESTORE_PATH.trim();
  }
  if (process.platform === "win32") {
    const programDirs = [
      process.env.ProgramW6432 || process.env.ProgramFiles || "C:\\Program Files",
      process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
    ].filter(Boolean) as string[];
    const versions = ["18", "17", "16", "15", "14", "13", "12"];
    for (const programDir of programDirs) {
      for (const v of versions) {
        const p = path.join(programDir, "PostgreSQL", v, "bin", "pg_restore.exe");
        if (fs.existsSync(p)) return p;
      }
    }
    return "pg_restore.exe";
  }
  // macOS / Linux
  const linuxPath = detectLinuxPgBin("pg_restore");
  if (linuxPath) return linuxPath;
  return "pg_restore";
}

/**
 * Kiểm tra pg_dump / pg_restore có tồn tại không.
 * Nếu là absolute path → fs.existsSync.
 * Nếu là simple name (PATH system) → không check (để OS báo ở proc.on("error")).
 */
function assertPgBinaryExists(binPath: string, binLabel: "pg_dump" | "pg_restore"): void {
  if (binPath.includes(path.sep) || (process.platform === "win32" && binPath.includes("\\"))) {
    if (!fs.existsSync(binPath)) {
      const hints: string[] = [];
      hints.push(`Không tìm thấy ${binLabel} tại: ${binPath}`);
      if (binLabel === "pg_dump") {
        hints.push(
          "→ Mở file .env, đặt biến PG_DUMP_PATH, ví dụ:",
          process.platform === "win32"
            ? '     PG_DUMP_PATH="C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe"'
            : '     PG_DUMP_PATH="/usr/lib/postgresql/16/bin/pg_dump"',
        );
      } else {
        hints.push(
          "→ Mở file .env, đặt biến PG_RESTORE_PATH (thường cùng thư mục với pg_dump), ví dụ:",
          process.platform === "win32"
            ? '     PG_RESTORE_PATH="C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe"'
            : '     PG_RESTORE_PATH="/usr/lib/postgresql/16/bin/pg_restore"',
        );
      }
      hints.push(
        "→ Hoặc thêm thư mục bin PostgreSQL vào biến môi trường PATH, sau đó khởi động lại Terminal/VSCode.",
      );
      throw new Error(hints.join("\n"));
    }
  }
}

function parseDatabaseUrl(urlString: string): {
  host: string; port: string; user: string; password: string; database: string;
} {
  const u = new URL(urlString.replace(/^postgresql:\/\//i, "https://"));
  const database = u.pathname.replace(/^\//, "").split("?")[0] || "kdpd_db";
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
  };
}

function resolveBackupFolder(cfg: BackupConfig): string {
  // Normalize: chuyển \\ → /, trim, bỏ " (user dán từ .env có thể bao quanh quotes).
  const normalize = (s: string): string => s
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\/g, "/");

  const envLocalDir = process.env.BACKUP_LOCAL_DIR;
  if (envLocalDir?.trim()) {
    const raw = normalize(envLocalDir);
    // Windows absolute paths: starts with "X:/" (D:/Backup, C:/Backup,...)
    //   or starts with "//" (UNC share).
    const isAbsWin = /^[a-zA-Z]:\//.test(raw) || /^\/\//.test(raw) || raw.startsWith("/");
    const p = isAbsWin ? path.resolve(raw) : path.resolve(PROJECT_ROOT, raw);
    ensureDirSync(p);
    return p;
  }
  if (cfg.storageMode === "local" && cfg.localFolderPath?.trim()) {
    const raw = normalize(cfg.localFolderPath);
    const isAbsWin = /^[a-zA-Z]:\//.test(raw) || /^\/\//.test(raw) || path.isAbsolute(raw);
    const p = isAbsWin ? path.resolve(raw) : path.resolve(PROJECT_ROOT, raw);
    ensureDirSync(p);
    return p;
  }
  ensureDirSync(DEFAULT_BACKUPS_DIR);
  return DEFAULT_BACKUPS_DIR;
}

// ---------------------------------------------------------------------------
// Cloud upload helpers
// ---------------------------------------------------------------------------

function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "https://developers.google.com/oauthplayground";
  if (!clientId || !clientSecret || !refreshToken) return null;
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

/**
 * Extract folder ID from a Google Drive share URL.
 * Accept:
 *  - raw ID (33 chars)  → return as-is
 *  - https://drive.google.com/drive/folders/<id>?usp=share_link → extract <id>
 */
function parseDriveFolderIdFromLink(linkOrId: string): string | null {
  const s = (linkOrId || "").trim();
  if (!s) return null;
  const m1 = s.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m1 && m1[1]) return m1[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s;
  return null;
}

async function uploadToGoogleDrive(
  localFilePath: string,
  filename: string,
  folderLinkOrId: string,
): Promise<{ fileId: string; webViewLink: string | null }> {
  const auth = getGoogleOAuthClient();
  if (!auth)
    throw new Error(
      "Thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN trong .env (xem mục GOOGLE OAUTH trong file .env).",
    );

  const folder =
    process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() ||
    parseDriveFolderIdFromLink(folderLinkOrId);
  if (!folder)
    throw new Error(
      "Thiếu GOOGLE_DRIVE_FOLDER_ID trong .env hoặc chưa nhập Link/ID thư mục Google Drive trong phần cấu hình backup. Vào mục Nơi lưu → Google Drive dán link share thư mục Drive hoặc điền env GOOGLE_DRIVE_FOLDER_ID=",
    );

  const drive = google.drive({ version: "v3", auth });
  const media = {
    mimeType: "application/octet-stream",
    body: fs.createReadStream(localFilePath),
  };
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folder],
    },
    media,
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });
  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink || null,
  };
}

async function uploadToOneDrive(
  localFilePath: string,
  filename: string,
  _folderLinkOrId: string,
): Promise<{ fileId: string; webViewLink: string | null }> {
  const tenant = process.env.AZURE_TENANT_ID?.trim();
  const client = process.env.AZURE_CLIENT_ID?.trim();
  const folder =
    process.env.ONEDRIVE_FOLDER_ID?.trim() ||
    parseDriveFolderIdFromLink(_folderLinkOrId);
  if (!tenant || !client)
    throw new Error(
      "OneDrive chưa được cấu hình. Điền AZURE_TENANT_ID / AZURE_CLIENT_ID / ONEDRIVE_FOLDER_ID vào .env (MSAL App Registration). Hiện tại upload tự động lên OneDrive là stub — vui lòng dùng Google Drive (đã được hỗ trợ đầy đủ credentials).",
    );
  if (!folder)
    throw new Error(
      "Thiếu ONEDRIVE_FOLDER_ID trong .env hoặc Link thư mục OneDrive.",
    );
  throw new Error(
    "OneDrive driver: stub chưa implement MSAL upload. Hiện tại Google Drive đã hỗ trợ upload thực tế đầy đủ — chuyển storageMode=gdrive.",
  );
}

/**
 * Entry point upload cloud. Select driver by cfg.storageMode.
 * Returns: uploaded cloud info or null (storage == local, skip upload).
 * Always writes uploadError / uploadedTo flags to mutate logEntry object.
 */
async function tryUploadCloud(
  cfg: BackupConfig,
  localFilePath: string,
  filename: string,
  logEntry: BackupRunLogEntry,
): Promise<{ storage: "gdrive" | "onedrive" | null; fileId: string | null }> {
  logEntry.uploadedTo = null;
  logEntry.uploadFileId = null;
  logEntry.uploadError = null;

  if (cfg.storageMode === "local") return { storage: null, fileId: null };

  try {
    if (cfg.storageMode === "gdrive") {
      const r = await uploadToGoogleDrive(
        localFilePath,
        filename,
        cfg.gdriveFolderLink || "",
      );
      logEntry.uploadedTo = "gdrive";
      logEntry.uploadFileId = r.fileId;
      return { storage: "gdrive", fileId: r.fileId };
    }
    if (cfg.storageMode === "onedrive") {
      const r = await uploadToOneDrive(
        localFilePath,
        filename,
        cfg.onedriveFolderLink || "",
      );
      logEntry.uploadedTo = "onedrive";
      logEntry.uploadFileId = r.fileId;
      return { storage: "onedrive", fileId: r.fileId };
    }
    return { storage: null, fileId: null };
  } catch (uerr: any) {
    logEntry.uploadError =
      (uerr?.message || String(uerr)).slice(0, 800) || "Unknown upload error";
    throw uerr;
  }
}

// ---------------------------------------------------------------------------
// Run pg_dump backup
// ---------------------------------------------------------------------------
let _activeRun: Promise<BackupFile> | null = null;

export function runBackup(trigger: "manual" | "schedule" = "manual"): Promise<BackupFile> {
  if (_activeRun) return _activeRun;
  _activeRun = (async () => {
    const cfg = loadBackupConfig();
    const folder = resolveBackupFolder(cfg);
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL không tìm thấy trong .env.");
    const parsed = parseDatabaseUrl(dbUrl);
    const stamp = new Date();
    const stampStr =
      stamp.getFullYear().toString() +
      String(stamp.getMonth() + 1).padStart(2, "0") +
      String(stamp.getDate()).padStart(2, "0") +
      "_" +
      String(stamp.getHours()).padStart(2, "0") +
      String(stamp.getMinutes()).padStart(2, "0") +
      String(stamp.getSeconds()).padStart(2, "0");
    const filename = `kdpd_db_${stampStr}.dump`;
    const outFile = path.join(folder, filename);

    const logEntry: BackupRunLogEntry = {
      startedAtISO: new Date().toISOString(),
      endedAtISO: null,
      status: "running",
      filename,
      error: null,
      trigger,
    };
    appendRunLog(logEntry);

    try {
      await new Promise<void>((resolve, reject) => {
        const env = { ...process.env, PGPASSWORD: parsed.password };
        const args = [
          "-h", parsed.host, "-p", parsed.port, "-U", parsed.user, "-d", parsed.database,
          "-F", "c", "--no-owner", "--no-acl", "-f", outFile,
        ];
        const pgDumpPath = getPgDumpPath();
        try {
          assertPgBinaryExists(pgDumpPath, "pg_dump");
        } catch (assertErr) {
          reject(assertErr);
          return;
        }
        console.info(
          "[backup:pg_dump] Spawn pg_dump. Path=", pgDumpPath,
          "host=", parsed.host, "port=", parsed.port, "db=", parsed.database, "user=", parsed.user,
        );
        // QUAN TRỌNG: LUÔN dùng shell:false (mặc định Node.js) → trên Windows:
        //   Node gọi trực tiếp CreateProcessW → path có dấu cách (Program Files)
        //   KHÔNG bị cmd.exe tách thành "C:\Program" như lỗi 'C:\Program' is not recognized.
        //   Nếu để shell:true → cmd.exe parse line theo khoảng trắng → lỗi 100%
        //   khi pg_dump nằm trong Program Files (mặc định PostgreSQL).
        const proc = spawn(pgDumpPath, args, {
          env,
          stdio: ["ignore", "ignore", "pipe"],
          shell: false,
          windowsHide: true,
        });
        let stderrOut = "";
        proc.stderr?.on("data", (d) => { stderrOut += String(d); });
        proc.on("error", (err) => {
          const msg = String(err.message || err);
          const hints: string[] = [`pg_dump KHÔNG khởi động được: ${msg}`];
          if (/not found|ENOENT|not recognized|is not recognized/i.test(msg)) {
            hints.push(
              "→ Hướng dẫn sửa:",
              '  1. Mở file .env, thêm dòng: PG_DUMP_PATH="C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe"',
              "     (thay 16 bằng version PostgreSQL đã cài, kiểm tra trong Control Panel → Programs)",
              "  2. Hoặc thêm thư mục bin PostgreSQL vào PATH Windows, sau đó khởi động lại Terminal/VSCode.",
              `  3. Path Node.js đã dùng: ${pgDumpPath}`,
            );
          }
          reject(new Error(hints.join("\n")));
        });
        proc.on("close", (code) => {
          if (code === 0) return resolve();
          const stderrTrimmed = stderrOut.trim().slice(0, 800);
          const hints: string[] = [
            `pg_dump thoát mã ${code ?? "null"}. Stderr: ${stderrTrimmed}`,
          ];
          if (/password|authentication failed|pg_hba\.conf/i.test(stderrTrimmed)) {
            hints.push("→ Lỗi mật khẩu/quyền DB: Kiểm tra DATABASE_URL trong file .env (username, password, port đúng).");
          }
          if (/does not exist|database .* does not exist/i.test(stderrTrimmed)) {
            hints.push("→ Lỗi DB không tồn tại: Kiểm tra DATABASE_URL trong file .env có đúng tên DB kdpd_db không.");
          }
          if (/could not connect|Connection refused|no route/i.test(stderrTrimmed)) {
            hints.push(`→ Không kết nối được PostgreSQL server (${parsed.host}:${parsed.port}). Kiểm tra dịch vụ PostgreSQL đang chạy (services.msc → postgresql-x64-16 → Running).`);
          }
          reject(new Error(hints.join("\n")));
        });
      });

      const stat = fs.statSync(outFile);
      // Cross-platform permission: trên Linux/macOS chmod 600 (chỉ owner đọc/ghi)
      //   vì file .dump chứa dữ liệu nhạy cảm (email, passwd hash trong users, contracts).
      //   Trên Windows ignore lỗi chmod (ACLs quản lý riêng).
      try {
        if (process.platform !== "win32") {
          fs.chmodSync(outFile, 0o600);
        }
      } catch { /* ignore chmod lỗi trên hệ thống không hỗ trợ */ }
      const file: BackupFile = {
        filename,
        sizeBytes: stat.size,
        createdAtISO: stat.mtime.toISOString(),
        prettySize: prettySize(stat.size),
        storageMode: cfg.storageMode,
        trigger,
      };

      // Upload lên cloud nếu storageMode != local
      // Lưu ý: Lỗi upload KHÔNG làm hỏng toàn bộ backup (local file đã có).
      //   Ghi uploadError vào log, vẫn trả về status success cho phần dump DB.
      let uploadErr: Error | null = null;
      const logEntryUpload: BackupRunLogEntry = {
        ...logEntry,
        uploadedTo: null,
        uploadFileId: null,
        uploadError: null,
      };
      try {
        await tryUploadCloud(cfg, outFile, filename, logEntryUpload);
      } catch (uerr: any) {
        uploadErr = uerr instanceof Error ? uerr : new Error(String(uerr));
        console.warn(
          "[backup] Backup local OK nhưng upload cloud LỖI (vẫn giữ file local):",
          uerr?.message || uerr,
        );
      }

      // Log success + update lastRunAt
      const prevLog = loadRunLog();
      prevLog[0] = {
        ...logEntryUpload,
        status: "success",
        endedAtISO: new Date().toISOString(),
        filename,
        uploadError: uploadErr ? uploadErr.message.slice(0, 800) : null,
      };
      fs.writeFileSync(LOG_FILE, JSON.stringify(prevLog.slice(0, 50), null, 2), "utf8");
      saveBackupConfig({ lastRunAt: new Date().toISOString(), lastFileName: filename });

      // Auto xoá cũ nếu vượt quá keepLastN
      try {
        const list = await listBackupFiles();
        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime(),
        );
        for (let i = cfg.keepLastN; i < sorted.length; i++) {
          try { deleteBackupFile(sorted[i].filename); } catch { /* ignore */ }
        }
      } catch { /* ignore cleanup lỗi nhỏ */ }

      return file;
    } catch (err: any) {
      const errMsg: string = err?.message ?? String(err) ?? "Unknown error";
      // Log chi tiết lỗi ra TERMINAL BACKEND (quan trọng nhất: admin nhìn terminal
      // sẽ thấy lý do thật ngay lập tức, thay vì chỉ thấy 500 generic browser).
      console.error(
        "[backup:runBackup] ❌ FAILED. trigger=", trigger,
        "│ folder=", folder,
        "│ outFile=", outFile,
        "\n           ", errMsg,
      );
      try {
        if (outFile && fs.existsSync(outFile)) {
          fs.unlinkSync(outFile);
        }
      } catch { /* ignore cleanup partial file */ }
      const prevLog = loadRunLog();
      prevLog[0] = {
        ...prevLog[0],
        status: "failed",
        endedAtISO: new Date().toISOString(),
        error: errMsg,
      };
      fs.writeFileSync(LOG_FILE, JSON.stringify(prevLog.slice(0, 50), null, 2), "utf8");
      // Throw lại Error với message đầy đủ (gồm 3 dòng hints) → routes handler
      // catch lại và trả về JSON 500 → client toast hiển thị chính xác.
      throw new Error(errMsg);
    } finally {
      _activeRun = null;
    }
  })();
  return _activeRun;
}

export function isBackupRunning(): boolean {
  return _activeRun !== null;
}

// ---------------------------------------------------------------------------
// Files list / delete / download path
// ---------------------------------------------------------------------------
export async function listBackupFiles(): Promise<BackupFile[]> {
  const cfg = loadBackupConfig();
  const folder = resolveBackupFolder(cfg);
  if (!fs.existsSync(folder)) return [];
  const files = fs.readdirSync(folder).filter((f) =>
    f.endsWith(".dump") || f.endsWith(".sql") || f.endsWith(".backup") || f.endsWith(".tar"),
  );
  const out: BackupFile[] = [];
  for (const f of files) {
    try {
      const st = fs.statSync(path.join(folder, f));
      out.push({
        filename: f,
        sizeBytes: st.size,
        createdAtISO: st.mtime.toISOString(),
        prettySize: prettySize(st.size),
        storageMode: cfg.storageMode,
        trigger: f.includes("schedule") ? "schedule" : "manual",
      });
    } catch { /* skip unreadable */ }
  }
  out.sort((a, b) => new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime());
  return out;
}

export function deleteBackupFile(filename: string): void {
  const sanitized = String(filename).replace(/\/|\\|\.\./g, "");
  if (!sanitized) throw new Error("Tên file backup không hợp lệ.");
  const cfg = loadBackupConfig();
  const folder = resolveBackupFolder(cfg);
  const p = path.join(folder, sanitized);
  if (!fs.existsSync(p)) throw new Error(`Không tìm thấy file backup ${sanitized}`);
  fs.unlinkSync(p);
}

export function getBackupDownloadPath(filename: string): string {
  const sanitized = String(filename).replace(/\/|\\|\.\./g, "");
  if (!sanitized) throw new Error("Tên file backup không hợp lệ.");
  const cfg = loadBackupConfig();
  const folder = resolveBackupFolder(cfg);
  return path.join(folder, sanitized);
}

// ===========================================================================
// RESTORE ENGINE — Khôi phục dữ liệu từ file dump backup
//
// CHẾ ĐỘ (RestoreMode)
//   1. "upsert"  (AN TOÀN, MẶC ĐỊNH):
//        - Restore dump vào 1 TEMP SCHEMA riêng "restore_temp_<timestamp>_<rand>"
//        - Với mỗi bảng trong temp schema (cùng tên bảng public):
//            INSERT INTO public.<table> (cols)
//            SELECT cols FROM restore_temp.<table>
//            ON CONFLICT (id) DO NOTHING;
//        => Dữ liệu CŨ trong DB KHÔNG BỊ GHI ĐÈ 100% (theo đúng yêu cầu user).
//           Chỉ các dòng MỚI trong file dump (id chưa tồn tại) mới được thêm vào.
//        - Kết thúc DROP SCHEMA restore_temp_xxx CASCADE dọn dẹp.
//
//   2. "full"  (PHÁ HỦY — CHỈ khi admin confirm 2 lần, checkbox I UNDERSTAND):
//        - pg_restore --clean --if-exists (xoá toàn bộ object trong public)
//        - Restore toàn bộ dữ liệu 100% giống bản backup
//        => Sẽ MẤT HẾT dữ liệu mới thêm kể từ khi bản backup được tạo.
//
// Cross-platform: pg_restore spawn shell:false (giống pg_dump trên Win Program Files path)
// ===========================================================================

export type RestoreMode = "upsert" | "full";

export interface RestoreTableStats {
  /** Tên bảng, ví dụ: "users", "tasks" */
  tableName: string;
  /** Số dòng trong file dump (schema temp) */
  rowsInDump: number;
  /** Số dòng đã INSERT THÀNH CÔNG (mới, id chưa có) */
  rowsInserted: number;
  /** Số dòng BỊ BỎ QUA (id đã tồn tại → không ghi đè) */
  rowsSkipped: number;
  /** Số dòng hiện có trong public.<table> trước khi restore (preview only) */
  rowsInTargetBefore: number;
  /** Có lỗi khi chạy INSERT cho bảng này không? (null = OK) */
  error: string | null;
}

export interface RestoreStats {
  mode: RestoreMode;
  filename: string;
  startedAtISO: string;
  endedAtISO: string | null;
  tempSchemaName: string | null;
  totalTables: number;
  tablesProcessed: number;
  /** Tổng dòng trong file dump */
  totalRowsInDump: number;
  /** Tổng dòng mới đã INSERT thành công (chế độ upsert), hoặc tổng dòng đã restore (full) */
  totalRowsInserted: number;
  /** Tổng dòng bị bỏ qua vì id tồn tại (chỉ upsert) */
  totalRowsSkipped: number;
  perTable: RestoreTableStats[];
  success: boolean;
  error: string | null;
  /** full restore: số object đã drop/restore theo pg_restore */
  fullRestoreNote?: string;
}

// ---------------------------------------------------------------------------
// Generic pg binary spawn wrapper (cho pg_dump / pg_restore 2 mode)
// ---------------------------------------------------------------------------
type BinarySpawnOpts = {
  binPath: string;
  binLabel: "pg_dump" | "pg_restore";
  args: string[];
  envOverride?: NodeJS.ProcessEnv;
  label: string;
};

function spawnPgBinary({ binPath, binLabel, args, envOverride, label }: BinarySpawnOpts): Promise<void> {
  assertPgBinaryExists(binPath, binLabel);
  return new Promise<void>((resolve, reject) => {
    const env = { ...process.env, ...(envOverride || {}) };
    console.info(`[backup:${binLabel}] [${label}] spawn bin=`, binPath, "args=", args.join(" "));
    const proc = spawn(binPath, args, {
      env,
      stdio: ["ignore", "ignore", "pipe"],
      shell: false,
      windowsHide: process.platform === "win32",
    });
    let stderr = "";
    proc.stderr?.on("data", (d) => { stderr += String(d); });
    proc.on("error", (err) => {
      const msg = String(err.message || err);
      const hints = [`[${binLabel}] KHÔNG khởi động được: ${msg}`];
      if (/not found|ENOENT|not recognized/i.test(msg)) {
        hints.push(
          "→ Hướng dẫn:",
          process.platform === "win32"
            ? `  1. Điền ${binLabel.toUpperCase().replace("_", "")}_PATH trong .env (thường cùng thư mục pg_dump)`
            : `  1. sudo apt install postgresql-client (Debian/Ubuntu) / sudo dnf install postgresql (RHEL/Fedora)`,
          `  2. Path Node.js đang dùng: ${binPath}`,
        );
      }
      reject(new Error(hints.join("\n")));
    });
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      const trimmed = stderr.trim().slice(0, 1200);
      reject(new Error(`[${binLabel}] [${label}] thoát mã ${code ?? "null"}.\nStderr:\n${trimmed}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Information schema helpers (restore upsert mode)
// ---------------------------------------------------------------------------

async function getTablesInSchema(schemaName: string): Promise<string[]> {
  if (!pgPool) throw new Error("PostgreSQL pool không tồn tại. Kiểm tra DATABASE_URL trong .env.");
  const rs = await pgPool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name`,
    [schemaName],
  );
  return (rs.rows as { table_name: string }[]).map((r) => r.table_name);
}

async function getPrimaryKeyColumns(schemaName: string, tableName: string): Promise<string[]> {
  if (!pgPool) throw new Error("PostgreSQL pool không tồn tại.");
  const rs = await pgPool.query(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
       AND tc.table_name   = kcu.table_name
     WHERE tc.constraint_type = 'PRIMARY KEY'
       AND tc.table_schema = $1
       AND tc.table_name   = $2
     ORDER BY kcu.ordinal_position`,
    [schemaName, tableName],
  );
  return (rs.rows as { column_name: string }[]).map((r) => r.column_name);
}

async function getTableColumnsOrdered(schemaName: string, tableName: string): Promise<string[]> {
  if (!pgPool) throw new Error("PostgreSQL pool không tồn tại.");
  const rs = await pgPool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schemaName, tableName],
  );
  return (rs.rows as { column_name: string }[]).map((r) => r.column_name);
}

async function countTableRows(schemaName: string, tableName: string): Promise<number> {
  if (!pgPool) throw new Error("PostgreSQL pool không tồn tại.");
  // pg_class.reltuples estimate nhanh đủ (khi insert/delete chưa vacuum thì estimate 1% sai số là chấp nhận được cho preview stats)
  //   nếu không tìm thấy thì fallback count(*)
  const rsEst = await pgPool.query(
    `SELECT reltuples::bigint AS est
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r'`,
    [schemaName, tableName],
  );
  if (rsEst.rows.length && Number(rsEst.rows[0].est) >= 0) {
    return Number(rsEst.rows[0].est);
  }
  // fallback chính xác hơn
  const rs = await pgPool.query(`SELECT COUNT(*)::bigint AS cnt FROM "${schemaName}"."${tableName}"`);
  return Number(rs.rows[0].cnt);
}

/**
 * Kiểm tra database TARGET (public schema) có đang "trống" không.
 * Nếu tổng số row < 100 thì coi là gần như trống (có thể Admin vừa init schema).
 * Dùng để hiện cảnh báo "DB đang có N dòng dữ liệu → bạn chắc chắn FULL RESTORE?".
 */
async function getPublicSchemaTotalRows(): Promise<{ totalTables: number; totalRows: number }> {
  if (!pgPool) return { totalTables: 0, totalRows: 0 };
  const rs = await pgPool.query(
    `SELECT
       COUNT(DISTINCT c.oid) AS total_tables,
       COALESCE(SUM(CASE WHEN c.reltuples < 0 THEN 0 ELSE c.reltuples END)::bigint, 0) AS total_rows
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'`,
  );
  return {
    totalTables: Number(rs.rows[0].total_tables || 0),
    totalRows: Number(rs.rows[0].total_rows || 0),
  };
}

function genTempSchemaName(): string {
  const d = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  const stamp =
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "_" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds());
  const rnd = Math.random().toString(36).slice(2, 6);
  return `restore_temp_${stamp}_${rnd}`;
}

function sanitizeIdentifier(name: string): string {
  // Chỉ cho phép ký tự an toàn Postgres identifier: a-z, A-Z, 0-9, _
  // (temp schema name & table names trong information_schema đều thỏa mãn)
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Identifier không hợp lệ: ${name}`);
  }
  return name;
}

// ---------------------------------------------------------------------------
// Restore Dump → TEMP DATABASE (giải pháp chuẩn, cross-platform, KHÔNG phụ thuộc
//   schema rename hay parse COPY binary).
//
// Flow chính thức (đã verify production):
//   Phase 1. Tạo DATABASE TẠM restore_tmp_<ts> (kết nối vào maintenance db "postgres")
//   Phase 2. pg_restore toàn bộ file dump vào temp database (restore đúng public chuẩn)
//   Phase 3. Mở 2 Pool (kdpd_db chính + temp db)
//   Phase 4. Với mỗi bảng có trong cả 2 DB:
//              SELECT col1,col2,... FROM tempdb ORDER BY PK LIMIT BATCH OFFSET ...
//              INSERT INTO maindb (...) VALUES (...) ON CONFLICT (id) DO NOTHING
//              → đếm rowsInserted / rowsSkipped = rowsInDump - rowsInserted
//   Phase 5. DROP temp database (không cleanup dính dính main db)
//
// Ưu điểm: 100% đúng chuẩn, không đụng chạm schema public của DB chính trong khi
//          restore, không phụ thuộc pg version, không parse SQL/COPY binary.
// Yêu cầu: Role user trong DATABASE_URL phải có quyền CREATEDB.
//          Nếu không có → trả lỗi rõ ràng hướng dẫn GRANT CREATEDB.
// ---------------------------------------------------------------------------

function getDbUrlForDbname(dbname: string): string {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL không tìm thấy trong .env.");
  const u = new URL(dbUrl.replace(/^postgresql:\/\//i, "https://"));
  u.pathname = "/" + dbname;
  return dbUrl.replace(/^postgresql:\/\//i, "postgres://").replace(/\/[^/?#]*([?#]|$)/, `/${dbname}$1`);
}

async function createTempDatabase(tempDbName: string): Promise<void> {
  sanitizeIdentifier(tempDbName);
  // Kết nối vào maintenance DB "postgres" (luôn tồn tại trên mọi Postgres instance)
  //   để thực hiện CREATE DATABASE (không thể CREATE DB trong transaction của app DB).
  const maintenanceUrl = getDbUrlForDbname("postgres");
  let client: import("pg").Client | null = null;
  try {
    const pg = await import("pg");
    client = new pg.Client({ connectionString: maintenanceUrl });
    await client.connect();
    await client.query(`CREATE DATABASE "${tempDbName}"`);
    console.info(`[backup:restore] Tạo temp database thành công: "${tempDbName}"`);
  } catch (err: any) {
    const msg = String(err?.message || err);
    const hints: string[] = [`Không thể tạo temp database "${tempDbName}": ${msg}`];
    if (/permission denied|must be owner|privilege/i.test(msg)) {
      hints.push(
        "→ Quyền CREATEDB bị thiếu. Hướng dẫn cấp quyền (chạy 1 lần bằng superuser postgres):",
        "    psql -U postgres -p 5433 -c 'GRANT CREATEDB ON DATABASE postgres TO kdpd_user;'",
        "    Hoặc đơn giản hơn (chạy bằng user postgres):",
        "    psql -U postgres -p 5433 -c \"ALTER USER kdpd_user CREATEDB;\"",
        "    (thay 5433 bằng port Postgres thực tế của bạn, kdpd_user bằng user trong DATABASE_URL)",
      );
    }
    throw new Error(hints.join("\n"));
  } finally {
    if (client) { try { await client.end(); } catch { /* ignore */ } }
  }
}

async function dropTempDatabase(tempDbName: string): Promise<void> {
  sanitizeIdentifier(tempDbName);
  const maintenanceUrl = getDbUrlForDbname("postgres");
  let client: import("pg").Client | null = null;
  try {
    const pg = await import("pg");
    client = new pg.Client({ connectionString: maintenanceUrl });
    await client.connect();
    // Force drop: kick existing connections (pg_restore thường đóng kết nối nhưng phòng trường hợp)
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [tempDbName],
    );
    await client.query(`DROP DATABASE IF EXISTS "${tempDbName}" WITH (FORCE)`);
    console.info(`[backup:restore] DROP temp database ok: "${tempDbName}"`);
  } catch (err: any) {
    // Log warn, không throw (việc cleanup bị lỗi không ảnh hưởng kết quả restore,
    //   admin có thể drop temp DB thủ công sau).
    console.warn(`[backup:restore] Không drop được temp db "${tempDbName}":`, err?.message || err);
  } finally {
    if (client) { try { await client.end(); } catch { /* ignore */ } }
  }
}

async function restoreDumpIntoTempDatabase(dumpFilePath: string, tempDbName: string): Promise<void> {
  const dbUrl = getDbUrlForDbname(tempDbName);
  const parsed = parseDatabaseUrl(dbUrl);
  const pgRestorePath = getPgRestorePath();
  const args = [
    "-h", parsed.host, "-p", parsed.port, "-U", parsed.user, "-d", parsed.database,
    "-F", "c",
    "--no-owner",
    "--no-acl",
    // Không có --schema public → mặc định restore mọi schema (dump chuẩn chỉ có public).
    dumpFilePath,
  ];
  await spawnPgBinary({
    binPath: pgRestorePath,
    binLabel: "pg_restore",
    args,
    envOverride: { PGPASSWORD: parsed.password },
    label: `restore-into-tempdb-${tempDbName}`,
  });
}

/**
 * Trả về mapping tablename → mảng cột (đúng order ordinal_position).
 * Dùng để SELECT đúng thứ tự cột khi transfer giữa 2 DB.
 */
async function listTablesWithColumns(
  schema: string,
  pool: import("pg").Pool,
): Promise<Map<string, string[]>> {
  const rs = await pool.query(
    `SELECT table_name, column_name, ordinal_position
     FROM information_schema.columns
     WHERE table_schema = $1
     ORDER BY table_name, ordinal_position`,
    [schema],
  );
  const map = new Map<string, string[]>();
  const rows = rs.rows as unknown as Array<{ table_name: string; column_name: string }>;
  for (const r of rows) {
    if (!map.has(r.table_name)) map.set(r.table_name, []);
    map.get(r.table_name)!.push(r.column_name);
  }
  return map;
}

/**
 * Thực hiện BATCH UPSERT (INSERT ... ON CONFLICT DO NOTHING) cho 1 bảng.
 * Trả về { rowsInserted, rowsInDump }
 */
async function upsertTableFromTempToMain(
  tableName: string,
  cols: string[],
  mainPool: import("pg").Pool,
  tempPool: import("pg").Pool,
  stats: RestoreTableStats,
  onProgress: (done: number, total: number) => void = () => {},
): Promise<{ rowsInserted: number }> {
  // Bước 1: Đếm tổng số row trong temp (không cần đúng 100% estimate cũng được)
  const cntRs = await tempPool.query(
    `SELECT COUNT(*)::bigint AS cnt FROM "public"."${tableName}"`,
  );
  const total = Number(cntRs.rows[0].cnt);
  stats.rowsInDump = total;
  if (total === 0) return { rowsInserted: 0 };

  // Bước 2: Transfer batch 250 dòng mỗi vòng.
  //   PK column (để order) = lấy danh sách primary keys của bảng trong temp db.
  const pkCols = (await getPrimaryKeyColumnsInternal(tempPool, "public", tableName));
  const orderBy = pkCols.length
    ? pkCols.map((c) => `"${c}"`).join(", ")
    : `"${cols[0]}"`;
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const placeholdersOneRow = cols.map((_, i) => `$${i + 1}`).join(", ");
  const selectSql = `SELECT ${colList} FROM "public"."${tableName}" ORDER BY ${orderBy} LIMIT $1 OFFSET $2`;
  const insertSql =
    `INSERT INTO "public"."${tableName}" (${colList}) VALUES (${placeholdersOneRow}) ` +
    `ON CONFLICT (${pkCols.length ? pkCols.map((c) => `"${c}"`).join(", ") : `"${cols[0]}"`}) DO NOTHING`;

  const BATCH = 250;
  let rowsInserted = 0;
  let offset = 0;
  while (offset < total) {
    const batch = await tempPool.query(selectSql, [BATCH, offset]);
    if (batch.rows.length === 0) break;
    for (const row of batch.rows) {
      const vals = cols.map((c) => row[c]);
      try {
        const irs = await mainPool.query({ text: insertSql, values: vals });
        rowsInserted += irs.rowCount || 0;
      } catch (rowErr: any) {
        const m = String(rowErr?.message || rowErr);
        // Đối với unique/violation khác (đôi khi có foreign key → các bảng không đúng thứ tự FK reference)
        //   Ghi lỗi vào stats.error nhưng TIẾP TỤC (bảng khác vẫn chạy).
        if (!stats.error) stats.error = "";
        if (!stats.error.includes(`[table=${tableName}]`)) {
          stats.error = stats.error
            ? stats.error + ` … [table=${tableName}] ${m.slice(0, 200)}`
            : `[table=${tableName}] ${m.slice(0, 300)}`;
        }
      }
    }
    offset += batch.rows.length;
    onProgress(Math.min(offset, total), total);
  }
  return { rowsInserted };
}

async function getPrimaryKeyColumnsInternal(
  pool: import("pg").Pool,
  schemaName: string,
  tableName: string,
): Promise<string[]> {
  const rs = await pool.query(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
       AND tc.table_name   = kcu.table_name
     WHERE tc.constraint_type = 'PRIMARY KEY'
       AND tc.table_schema = $1
       AND tc.table_name   = $2
     ORDER BY kcu.ordinal_position`,
    [schemaName, tableName],
  );
  return (rs.rows as { column_name: string }[]).map((r) => r.column_name);
}

// ---------------------------------------------------------------------------
// Restore functions (export cho routes)
// ---------------------------------------------------------------------------
let _activeRestore: Promise<RestoreStats> | null = null;
let _lastRestoreStats: RestoreStats | null = null;

export function isRestoreRunning(): boolean {
  return _activeRestore !== null;
}

export function getLastRestoreStats(): RestoreStats | null {
  return _lastRestoreStats;
}

/**
 * Chế độ AN TOÀN MẶC ĐỊNH: Chỉ INSERT các dòng id CHƯA tồn tại trong DB chính,
 * ĐỪNG GHI ĐÈ dữ liệu cũ nào (ON CONFLICT DO NOTHING trên PK id).
 */
export async function restoreFromDumpUpsert(filename: string): Promise<RestoreStats> {
  if (_activeRestore) return _activeRestore;
  const startedAt = new Date().toISOString();
  const sanitized = String(filename).replace(/\/|\\|\.\./g, "");
  if (!sanitized) throw new Error("Tên file backup không hợp lệ.");
  const dumpFilePath = getBackupDownloadPath(sanitized);
  if (!fs.existsSync(dumpFilePath)) throw new Error(`Không tìm thấy file backup ${sanitized}.`);
  if (!pgPool) throw new Error("PostgreSQL pool không tồn tại. Kiểm tra DATABASE_URL trong .env.");

  const stats: RestoreStats = {
    mode: "upsert",
    filename: sanitized,
    startedAtISO: startedAt,
    endedAtISO: null,
    tempSchemaName: null,
    totalTables: 0,
    tablesProcessed: 0,
    totalRowsInDump: 0,
    totalRowsInserted: 0,
    totalRowsSkipped: 0,
    perTable: [],
    success: false,
    error: null,
  };

  _activeRestore = (async () => {
    const tempDbName = `restore_tmp_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
    stats.tempSchemaName = tempDbName;
    let tempPool: import("pg").Pool | null = null;
    try {
      // P1. Tạo temp db
      await createTempDatabase(tempDbName);
      // P2. pg_restore vào temp db
      await restoreDumpIntoTempDatabase(dumpFilePath, tempDbName);

      // P3. Mở pool temp db
      const pg = await import("pg");
      const tempDbUrl = getDbUrlForDbname(tempDbName);
      tempPool = new pg.Pool({ connectionString: tempDbUrl, max: 5 });

      // P4. Danh sách bảng + cột ở cả 2 DB
      const mainTables = await listTablesWithColumns("public", pgPool);
      const tempTables = await listTablesWithColumns("public", tempPool);
      // Chỉ xử lý các bảng CÓ MẶT trong cả 2 DB (tránh restore bảng lạ từ file dump cũ vào schema mới)
      const commonTables = [...tempTables.keys()].filter((t) => mainTables.has(t));
      stats.totalTables = commonTables.length;
      stats.totalRowsInDump = 0;
      stats.totalRowsInserted = 0;
      stats.totalRowsSkipped = 0;

      console.info(
        `[backup:restore-upsert] Bắt đầu transfer ${commonTables.length} bảng ` +
          `từ temp db → main (ON CONFLICT DO NOTHING):`,
        commonTables.join(", "),
      );

      for (const tname of commonTables) {
        const colsInTemp = tempTables.get(tname)!;
        const colsInMain = mainTables.get(tname)!;
        // Dùng INTERSECTION các cột (chỉ transfer các cột cả 2 đều có).
        //   Tránh lỗi "column x does not exist" nếu bản backup cũ thiếu cột mới sau này.
        const mainSet = new Set(colsInMain);
        const sharedCols = colsInTemp.filter((c) => mainSet.has(c));
        const rowsInTargetBefore = Number(
          ((await pgPool.query(`SELECT COUNT(*)::bigint AS c FROM "public"."${tname}"`)).rows[0].c),
        );
        const tblStats: RestoreTableStats = {
          tableName: tname,
          rowsInDump: 0,
          rowsInserted: 0,
          rowsSkipped: 0,
          rowsInTargetBefore,
          error: null,
        };
        try {
          const { rowsInserted } = await upsertTableFromTempToMain(
            tname,
            sharedCols,
            pgPool,
            tempPool,
            tblStats,
          );
          tblStats.rowsInserted = rowsInserted;
          tblStats.rowsSkipped = Math.max(0, tblStats.rowsInDump - rowsInserted);
        } catch (tblErr: any) {
          tblStats.error = String(tblErr?.message || tblErr).slice(0, 500);
        }
        stats.perTable.push(tblStats);
        stats.totalRowsInDump += tblStats.rowsInDump;
        stats.totalRowsInserted += tblStats.rowsInserted;
        stats.totalRowsSkipped += tblStats.rowsSkipped;
        stats.tablesProcessed++;
      }

      stats.success = true;
      stats.endedAtISO = new Date().toISOString();
      console.info(
        `[backup:restore-upsert] ✅ HOÀN THÀNH. tables=${stats.tablesProcessed}/${stats.totalTables} ` +
          `rows_in_dump=${stats.totalRowsInDump} inserted=${stats.totalRowsInserted} skipped=${stats.totalRowsSkipped}`,
      );
      return stats;
    } catch (err: any) {
      const msg = String(err?.message || err) || "Unknown restore error";
      stats.error = msg;
      stats.success = false;
      stats.endedAtISO = new Date().toISOString();
      console.error("[backup:restore-upsert] ❌ FAILED:", msg);
      throw new Error(msg);
    } finally {
      // ALWAYS DROP temp db, kể cả lỗi (tránh để lại nhiều DB rác trong Postgres)
      if (tempPool) { try { await tempPool.end(); } catch { /* ignore */ } }
      try { await dropTempDatabase(tempDbName); } catch { /* ignore */ }
      _lastRestoreStats = { ...stats, perTable: stats.perTable.map((t) => ({ ...t })) };
      _activeRestore = null;
    }
  })();
  return _activeRestore;
}

/**
 * Chế độ FULL RESTORE — phá hủy (XOÁ TOÀN BỘ dữ liệu hiện tại → thay thế hoàn toàn bằng backup).
 * CHỈ chạy khi admin confirm 2 lần trong UI (checkbox "Tôi hiểu dữ liệu sẽ bị xoá").
 *
 * Sử dụng pg_restore trực tiếp vào DB chính với flags --clean --if-exists --no-owner --no-acl.
 */
export async function restoreFromDumpFull(filename: string): Promise<RestoreStats> {
  if (_activeRestore) return _activeRestore;
  const startedAt = new Date().toISOString();
  const sanitized = String(filename).replace(/\/|\\|\.\./g, "");
  if (!sanitized) throw new Error("Tên file backup không hợp lệ.");
  const dumpFilePath = getBackupDownloadPath(sanitized);
  if (!fs.existsSync(dumpFilePath)) throw new Error(`Không tìm thấy file backup ${sanitized}.`);
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL không tìm thấy trong .env.");
  const parsed = parseDatabaseUrl(dbUrl);
  const publicInfo = await getPublicSchemaTotalRows();

  const stats: RestoreStats = {
    mode: "full",
    filename: sanitized,
    startedAtISO: startedAt,
    endedAtISO: null,
    tempSchemaName: null,
    totalTables: publicInfo.totalTables,
    tablesProcessed: 0,
    totalRowsInDump: 0,
    totalRowsInserted: 0,
    totalRowsSkipped: 0,
    perTable: [],
    success: false,
    error: null,
    fullRestoreNote: `⚠️ Đã xoá + restore lại ${publicInfo.totalTables} bảng public. DB hiện tại trước restore ước tính ${publicInfo.totalRows.toLocaleString()} dòng.`,
  };

  _activeRestore = (async () => {
    try {
      console.warn(
        "[backup:restore-full] ⚠️ FULL RESTORE STARTED — DROP toàn bộ public objects " +
          `trong "${parsed.database}", restore từ file: ${sanitized}`,
      );
      const pgRestorePath = getPgRestorePath();
      const args = [
        "-h", parsed.host, "-p", parsed.port, "-U", parsed.user, "-d", parsed.database,
        "-F", "c",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-acl",
        dumpFilePath,
      ];
      await spawnPgBinary({
        binPath: pgRestorePath,
        binLabel: "pg_restore",
        args,
        envOverride: { PGPASSWORD: parsed.password },
        label: `FULL-RESTORE-${sanitized}`,
      });
      stats.success = true;
      stats.tablesProcessed = stats.totalTables;
      stats.endedAtISO = new Date().toISOString();
      return stats;
    } catch (err: any) {
      const msg = String(err?.message || err) || "Unknown full restore error";
      stats.error = msg;
      stats.success = false;
      stats.endedAtISO = new Date().toISOString();
      console.error("[backup:restore-full] ❌ FAILED:", msg);
      throw new Error(msg);
    } finally {
      _lastRestoreStats = { ...stats, perTable: stats.perTable.map((t) => ({ ...t })) };
      _activeRestore = null;
    }
  })();
  return _activeRestore;
}

/**
 * Preview (không làm gì DB chính) thống kê restore upsert sẽ insert bao nhiêu dòng,
 * bỏ qua bao nhiêu dòng, trên bao nhiêu bảng.
 *
 * Flow: Tạo temp db → restore dump vào → list tables & count rows → map với số row trong public.
 *       → DROP temp db.
 * Admin dùng để xem hiệu ứng restore TRƯỚC khi quyết định.
 */
export async function previewRestoreFromDump(filename: string): Promise<RestoreStats> {
  const startedAt = new Date().toISOString();
  const sanitized = String(filename).replace(/\/|\\|\.\./g, "");
  if (!sanitized) throw new Error("Tên file backup không hợp lệ.");
  const dumpFilePath = getBackupDownloadPath(sanitized);
  if (!fs.existsSync(dumpFilePath)) throw new Error(`Không tìm thấy file backup ${sanitized}.`);
  if (!pgPool) throw new Error("PostgreSQL pool không tồn tại.");

  const stats: RestoreStats = {
    mode: "upsert",
    filename: sanitized,
    startedAtISO: startedAt,
    endedAtISO: null,
    tempSchemaName: null,
    totalTables: 0,
    tablesProcessed: 0,
    totalRowsInDump: 0,
    totalRowsInserted: 0,
    totalRowsSkipped: 0,
    perTable: [],
    success: false,
    error: null,
  };

  const tempDbName = `restore_prev_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
  stats.tempSchemaName = tempDbName;
  let tempPool: import("pg").Pool | null = null;
  try {
    await createTempDatabase(tempDbName);
    await restoreDumpIntoTempDatabase(dumpFilePath, tempDbName);
    const pg = await import("pg");
    tempPool = new pg.Pool({ connectionString: getDbUrlForDbname(tempDbName), max: 5 });

    const mainTables = await listTablesWithColumns("public", pgPool);
    const tempTables = await listTablesWithColumns("public", tempPool);
    const common = [...tempTables.keys()].filter((t) => mainTables.has(t));
    stats.totalTables = common.length;
    for (const t of common) {
      const inDump = Number(
        ((await tempPool.query(`SELECT COUNT(*)::bigint AS c FROM "public"."${t}"`)).rows[0].c),
      );
      const inTarget = Number(
        ((await pgPool.query(`SELECT COUNT(*)::bigint AS c FROM "public"."${t}"`)).rows[0].c),
      );
      const tblStats: RestoreTableStats = {
        tableName: t,
        rowsInDump: inDump,
        rowsInserted: 0, // estimate ở đây không thể chính xác (phải upsert mới biết)
        rowsSkipped: 0,
        rowsInTargetBefore: inTarget,
        error: null,
      };
      stats.perTable.push(tblStats);
      stats.totalRowsInDump += inDump;
      stats.tablesProcessed++;
    }
    // Ước tính tổng số dòng sẽ INSERT: min(totalRowsInDump, tổng bảng dump - (trùng khớp 1-1 id trùng 100%))
    //   Vì không thể count chính xác không query join 2 DB → ghi note cho admin
    stats.totalRowsInserted = -1; // -1 = chưa xác định (trong UI hiện "?")
    stats.totalRowsSkipped = -1;
    stats.success = true;
    stats.endedAtISO = new Date().toISOString();
    return stats;
  } catch (err: any) {
    const msg = String(err?.message || err) || "Unknown preview error";
    stats.error = msg;
    stats.success = false;
    stats.endedAtISO = new Date().toISOString();
    throw new Error(msg);
  } finally {
    if (tempPool) { try { await tempPool.end(); } catch { /* ignore */ } }
    try { await dropTempDatabase(tempDbName); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Scheduler lite (không cần node-cron): mỗi 60s kiểm tra giờ đến chưa
// ---------------------------------------------------------------------------
let _schedulerStarted = false;
let _intervalHandle: any = null;

function shouldRunNow(cfg: BackupConfig, now: Date, lastRunAt: Date | null): boolean {
  if (cfg.scheduleMode === "off") return false;
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour !== cfg.scheduleHour) return false;
  if (Math.abs(minute - cfg.scheduleMinute) > 1) return false; // 2min tolerance
  // Đã chạy trong 50 phút qua → skip (tránh lặp lại nhiều lần)
  if (lastRunAt && (now.getTime() - lastRunAt.getTime()) < 50 * 60 * 1000) return false;

  if (cfg.scheduleMode === "daily") return true;
  if (cfg.scheduleMode === "weekly") return now.getDay() === cfg.scheduleWeekday;
  if (cfg.scheduleMode === "monthly") return now.getDate() === cfg.scheduleDayOfMonth;
  return false;
}

export function startBackupScheduler(): void {
  if (_schedulerStarted) return;
  _schedulerStarted = true;
  // Boot xong đợi 30s sau check lần 1 (tránh race DB init)
  setTimeout(() => tick(), 30_000);
  _intervalHandle = setInterval(() => tick(), 60_000);
}

function tick(): void {
  try {
    const cfg = loadBackupConfig();
    const now = new Date();
    const last = cfg.lastRunAt ? new Date(cfg.lastRunAt) : null;
    if (shouldRunNow(cfg, now, last)) {
      runBackup("schedule").catch((err) => {
        console.error("[backup-scheduler] Lỗi chạy backup định kỳ:", err?.message || err);
      });
    }
  } catch (err: any) {
    console.error("[backup-scheduler] Tick lỗi:", err?.message || err);
  }
}

// ---------------------------------------------------------------------------
// Admin guard: session user.role must be 'Admin' (giống pattern chuẩn middleware.ts userHasRole)
// Đọc từ req.user (Passport.js inject sau requireAuth middleware) — KHÔNG dùng req.session.user.
// Giống routes.ts L1312-1323 isAdmin canonical check.
// ---------------------------------------------------------------------------

type ReqUserShape =
  | UserWithRolesAndGroups
  | ({ role?: string | null } & { roles?: { code?: string; name?: string }[] });

function userHasAdminRole(u: ReqUserShape | undefined | null): boolean {
  if (!u) return false;
  const roles = (u as UserWithRolesAndGroups)?.roles;
  if (Array.isArray(roles) && roles.length) {
    const match = roles.some((r) => {
      if (r?.name === UserRole.ADMIN) return true;
      if (typeof r?.code === "string" && r.code.toLowerCase() === "admin") return true;
      if (typeof r?.name === "string" && r.name.toLowerCase() === "admin") return true;
      // Fallback cho các db cũ có role name tiếng Việt "Quản trị"
      const viNorm =
        typeof r?.name === "string"
          ? r.name
              .normalize("NFKD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/\s+/g, "")
              .trim()
          : "";
      if (viNorm.includes("quantri")) return true;
      return false;
    });
    if (match) return true;
  }
  // Legacy: req.user.role === 'admin' (string đơn, deprecated schema)
  const leg = (u as { role?: string | null }).role;
  return typeof leg === "string" && leg.toLowerCase() === "admin";
}

export function requireAdmin(req: IncomingMessage | Request): boolean {
  const expressReq = req as Request;
  const u = (expressReq.user as ReqUserShape | undefined) ?? null;
  if (!u) {
    // Fallback ngầm định: thử tìm trong session nếu có (nếu Passport chưa inject)
    const sess = (req as any).session as { user?: ReqUserShape | undefined } | undefined;
    if (!sess?.user) return false;
    return userHasAdminRole(sess.user);
  }
  const ok = userHasAdminRole(u);
  if (!ok) {
    try {
      const email = (u as any)?.email || (u as any)?.username || "anonymous";
      console.warn(
        `[backup:guard] requireAdmin FALSE cho user ${String(email)} (id=${(u as any)?.id ?? "?"}) → 403 Forbidden`,
      );
    } catch { /* ignore logging lỗi nhỏ */ }
  }
  return ok;
}
