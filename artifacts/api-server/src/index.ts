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

  // Historic advance payments synchronization
  (async () => {
    try {
      const { ordersTable, paymentsTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");

      logger.info("Checking for historic advance payments that lack transaction records...");
      const orders = await db.select().from(ordersTable);
      let count = 0;

      for (const order of orders) {
        const advance = parseFloat(order.advanceAmount);
        if (advance > 0) {
          const payments = await db
            .select()
            .from(paymentsTable)
            .where(eq(paymentsTable.orderId, order.id));

          if (payments.length === 0) {
            await db.insert(paymentsTable).values({
              orderId: order.id,
              customerId: order.customerId,
              amount: order.advanceAmount,
              paymentDate: order.orderDate,
              notes: `Advance Payment for Order ${order.orderNumber} (Auto-recovered)`,
            });
            count++;
          }
        }
      }
      if (count > 0) {
        logger.info(`Successfully synchronized ${count} historic advance payments to payments table.`);
      } else {
        logger.info("All historic advance payments are already synchronized.");
      }
    } catch (err) {
      logger.error({ err }, "Failed to synchronize historic advance payments");
    }
  })();

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

