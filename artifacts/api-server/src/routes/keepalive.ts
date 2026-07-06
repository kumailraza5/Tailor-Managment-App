import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/keepalive", async (_req, res) => {
  try {
    // Execute a minimal query to keep Supabase active
    await db.execute(sql`SELECT 1`);
    logger.info("Supabase Keep-Alive query executed successfully via HTTP endpoint");
    res.json({
      success: true,
      message: "Keep-alive query executed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, "Supabase Keep-Alive query failed via HTTP endpoint");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
