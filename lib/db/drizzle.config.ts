import { defineConfig } from "drizzle-kit";
import path from "path";

try {
  process.loadEnvFile(path.join(__dirname, "../../.env"));
} catch (e) {
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env"));
  } catch (err) {}
}

const rawUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const connectionString = process.env.SUPABASE_DATABASE_URL && !rawUrl.includes("sslmode")
  ? `${rawUrl}?sslmode=require`
  : rawUrl;

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: { rejectUnauthorized: false },
  },
});
