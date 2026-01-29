/**
 * Backup Neon database bằng pg_dump 17.
 * Đọc DATABASE_URL từ .env, gọi pg_dump (ưu tiên PostgreSQL 17) và ghi file vào attached_assets.
 *
 * Yêu cầu: Cài PostgreSQL 17 (hoặc set PG_DUMP_PATH trỏ tới pg_dump 17).
 * Chạy: npx tsx script/neon-backup.ts
 */
import "dotenv/config";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const assetsDir = path.join(rootDir, "attached_assets");

function parseDatabaseUrl(urlString: string): { host: string; port: string; user: string; password: string; database: string } {
  const u = new URL(urlString.replace(/^postgresql:\/\//i, "https://"));
  const database = u.pathname.replace(/^\//, "").split("?")[0] || "neondb";
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
  };
}

function getPgDumpPath(): string {
  if (process.env.PG_DUMP_PATH) return process.env.PG_DUMP_PATH;
  if (process.platform === "win32") {
    const pg17 = path.join(process.env.ProgramFiles || "C:\\Program Files", "PostgreSQL", "17", "bin", "pg_dump.exe");
    return pg17;
  }
  return "pg_dump";
}

function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL chưa có trong .env. Xem Docs/NEON_SETUP.md.");
    process.exit(1);
  }

  const { host, port, user, password, database } = parseDatabaseUrl(url);
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "."); // 2026.01.29
  const outFile = path.join(assetsDir, `${stamp} neon_backup.sql`);
  const pgDumpPath = getPgDumpPath();

  console.log("Backup Neon →", outFile);
  console.log("pg_dump:", pgDumpPath);
  console.log("Host:", host, "DB:", database);

  const env = { ...process.env, PGPASSWORD: password };
  const args = ["-h", host, "-p", port, "-U", user, "-d", database, "-F", "p", "-f", outFile, "--encoding", "UTF8"];

  const proc = spawn(pgDumpPath, args, { env, stdio: "inherit", shell: false });

  proc.on("error", (err) => {
    console.error("Lỗi chạy pg_dump:", err.message);
    if (process.platform === "win32" && (err as NodeJS.ErrnoException).code === "ENOENT") {
      console.error("Cài PostgreSQL 17 hoặc set PG_DUMP_PATH trỏ tới pg_dump 17. Xem Docs/NEON_SETUP.md mục 7.3.");
    }
    process.exit(1);
  });

  proc.on("close", (code) => {
    if (code === 0) console.log("Xong. File:", outFile);
    else process.exit(code ?? 1);
  });
}

main();
