// Database is optional - this project uses Google Sheets as the primary data source
// Database code is kept for potential future use but is not required

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
    console.log('Database connection initialized (optional - using Google Sheets as primary)');
  } catch (error) {
    console.warn('Failed to initialize database (optional):', error);
  }
} else {
  console.log('Database not configured - using Google Sheets as data source');
}

export { pool, db };
