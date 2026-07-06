import path from "path";

try {
  process.loadEnvFile(path.join(__dirname, "../../../.env"));
} catch (e) {
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env"));
  } catch (err) {}
}

import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"] || "3001";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Keep-Alive Scheduler (runs every 6 hours)
  const KEEP_ALIVE_INTERVAL = 6 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      logger.info("Running scheduled internal Supabase Keep-Alive query...");
      await db.execute(sql`SELECT 1`);
      logger.info("Scheduled internal Supabase Keep-Alive query succeeded");
    } catch (error) {
      logger.error({ err: error }, "Scheduled internal Supabase Keep-Alive query failed");
    }
  }, KEEP_ALIVE_INTERVAL);
});

