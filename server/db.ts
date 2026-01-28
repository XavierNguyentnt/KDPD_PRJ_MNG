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
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    console.log('Database connection initialized (Neon/Postgres)');
  } catch (error) {
    console.warn('Failed to initialize database (optional):', error);
  }
} else {
  console.log('Database not configured - set DATABASE_URL in .env (see Docs/NEON_SETUP.md)');
}

export { pool, db };
