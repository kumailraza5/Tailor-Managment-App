import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, customersTable, ordersTable, paymentsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", requireAuth(), async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [totalCustomers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customersTable);

    const [totalOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable);

    const [pendingOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "pending"));

    const [inStitchingOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "in_stitching"));

    const [readyOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "ready"));

    const [deliveredOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "delivered"));

    const [todayDeliveriesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(eq(ordersTable.deliveryDate, today));

    const [todayCollectionResult] = await db
      .select({ total: sql<string>`coalesce(sum(amount), 0)` })
      .from(paymentsTable)
      .where(eq(paymentsTable.paymentDate, today));

    const [remainingBalanceResult] = await db
      .select({ total: sql<string>`coalesce(sum(balance_amount), 0)` })
      .from(ordersTable);

    res.json({
      totalCustomers: Number(totalCustomers.count),
      totalOrders: Number(totalOrders.count),
      pendingOrders: Number(pendingOrders.count),
      inStitchingOrders: Number(inStitchingOrders.count),
      readyOrders: Number(readyOrders.count),
      deliveredOrders: Number(deliveredOrders.count),
      todayDeliveries: Number(todayDeliveriesResult.count),
      todayCollection: parseFloat(todayCollectionResult.total),
      remainingBalance: parseFloat(remainingBalanceResult.total),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

router.get("/dashboard/recent-orders", requireAuth(), async (req, res) => {
  try {
    const { limit = "10" } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit) || 10, 50);

    const orders = await db
      .select({
        id: ordersTable.id,
        orderNumber: ordersTable.orderNumber,
        customerId: ordersTable.customerId,
        customerName: customersTable.name,
        orderDate: ordersTable.orderDate,
        deliveryDate: ordersTable.deliveryDate,
        status: ordersTable.status,
        totalAmount: ordersTable.totalAmount,
        advanceAmount: ordersTable.advanceAmount,
        balanceAmount: ordersTable.balanceAmount,
        notes: ordersTable.notes,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .orderBy(desc(ordersTable.createdAt))
      .limit(lim);

    res.json(orders);
  } catch (err) {
    req.log.error({ err }, "Failed to get recent orders");
    res.status(500).json({ error: "Failed to get recent orders" });
  }
});

router.get("/dashboard/today-deliveries", requireAuth(), async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const orders = await db
      .select({
        id: ordersTable.id,
        orderNumber: ordersTable.orderNumber,
        customerId: ordersTable.customerId,
        customerName: customersTable.name,
        orderDate: ordersTable.orderDate,
        deliveryDate: ordersTable.deliveryDate,
        status: ordersTable.status,
        totalAmount: ordersTable.totalAmount,
        advanceAmount: ordersTable.advanceAmount,
        balanceAmount: ordersTable.balanceAmount,
        notes: ordersTable.notes,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(eq(ordersTable.deliveryDate, today))
      .orderBy(desc(ordersTable.createdAt));

    res.json(orders);
  } catch (err) {
    req.log.error({ err }, "Failed to get today's deliveries");
    res.status(500).json({ error: "Failed to get today's deliveries" });
  }
});

export default router;
