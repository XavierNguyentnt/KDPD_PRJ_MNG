// PostgreSQL (Neon). Cần DATABASE_URL trong .env để đăng nhập và dùng tasks/contracts/documents.
// Xem Docs/NEON_SETUP.md và https://neon.com/docs/get-started/connect-neon

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Database is optional - only initialize if DATABASE_URL is provided
let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  try {
    const readIntEnv = (name: string): number | undefined => {
      const raw = process.env[name];
      if (!raw) return undefined;
      const value = Number.parseInt(raw, 10);
      return Number.isNaN(value) ? undefined : value;
    };
    const poolConfig: pg.PoolConfig = { connectionString: process.env.DATABASE_URL };
    const max = readIntEnv("PG_POOL_MAX");
    const idleTimeoutMillis = readIntEnv("PG_POOL_IDLE_TIMEOUT_MS");
    const connectionTimeoutMillis = readIntEnv("PG_POOL_CONN_TIMEOUT_MS");
    const maxUses = readIntEnv("PG_POOL_MAX_USES");
    if (max !== undefined) poolConfig.max = max;
    if (idleTimeoutMillis !== undefined) poolConfig.idleTimeoutMillis = idleTimeoutMillis;
    if (connectionTimeoutMillis !== undefined) poolConfig.connectionTimeoutMillis = connectionTimeoutMillis;
    if (maxUses !== undefined && maxUses > 0) poolConfig.maxUses = maxUses;

    pool = new Pool(poolConfig);
    db = drizzle(pool, { schema });
    console.log('Database connection initialized (Neon/Postgres)');
  } catch (error) {
    console.warn('Failed to initialize database (optional):', error);
  }
} else {
  console.log('Database not configured - set DATABASE_URL in .env (see Docs/NEON_SETUP.md)');
}

export { pool, db };
