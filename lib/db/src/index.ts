import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import path from "path";
import * as schema from "./schema";

try {
  process.loadEnvFile(path.join(__dirname, "../../../.env"));
} catch (e) {
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env"));
  } catch (err) {}
}

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isProduction = process.env.NODE_ENV === "production";
const requiresSsl =
  process.env.SUPABASE_DATABASE_URL ||
  isProduction ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("supabase.com") ||
  connectionString.includes("supabase.net") ||
  connectionString.includes("pooler");

export const pool = new Pool({
  connectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";

