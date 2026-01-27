// Database is optional - this project uses Google Sheets as the primary data source
// This config is only needed if you want to use database features

import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set - database features disabled (using Google Sheets)");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/dummy", // Dummy URL if not set
  },
});
