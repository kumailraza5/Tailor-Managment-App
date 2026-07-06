import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, customersTable, ordersTable, paymentsTable } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";

const router = Router();

router.get("/reports/daily", requireAuth(), async (req, res) => {
  try {
    const { date } = req.query as Record<string, string>;
    const reportDate = date ?? new Date().toISOString().split("T")[0];

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
      .where(eq(ordersTable.orderDate, reportDate))
      .orderBy(desc(ordersTable.createdAt));

    const deliveredOrders = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(and(eq(ordersTable.deliveryDate, reportDate), eq(ordersTable.status, "delivered")));

    const payments = await db
      .select({
        id: paymentsTable.id,
        orderId: paymentsTable.orderId,
        customerId: paymentsTable.customerId,
        customerName: customersTable.name,
        orderNumber: ordersTable.orderNumber,
        amount: paymentsTable.amount,
        paymentDate: paymentsTable.paymentDate,
        notes: paymentsTable.notes,
        createdAt: paymentsTable.createdAt,
      })
      .from(paymentsTable)
      .leftJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
      .leftJoin(ordersTable, eq(paymentsTable.orderId, ordersTable.id))
      .where(eq(paymentsTable.paymentDate, reportDate))
      .orderBy(desc(paymentsTable.createdAt));

    const [newCustomers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customersTable)
      .where(sql`DATE(created_at) = ${reportDate}`);

    const totalCollection = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    res.json({
      date: reportDate,
      newOrders: orders.length,
      deliveredOrders: Number(deliveredOrders[0]?.count ?? 0),
      totalCollection,
      newCustomers: Number(newCustomers.count),
      orders,
      payments,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get daily report");
    res.status(500).json({ error: "Failed to get daily report" });
  }
});

router.get("/reports/monthly", requireAuth(), async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt((req.query as Record<string, string>).year ?? String(now.getFullYear()));
    const month = parseInt((req.query as Record<string, string>).month ?? String(now.getMonth() + 1));

    const [totalOrdersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(sql`EXTRACT(YEAR FROM created_at) = ${year} AND EXTRACT(MONTH FROM created_at) = ${month}`);

    const [totalRevenueResult] = await db
      .select({ total: sql<string>`coalesce(sum(total_amount), 0)` })
      .from(ordersTable)
      .where(sql`EXTRACT(YEAR FROM created_at) = ${year} AND EXTRACT(MONTH FROM created_at) = ${month}`);

    const [totalCollectedResult] = await db
      .select({ total: sql<string>`coalesce(sum(amount), 0)` })
      .from(paymentsTable)
      .where(sql`EXTRACT(YEAR FROM created_at) = ${year} AND EXTRACT(MONTH FROM created_at) = ${month}`);

    const [newCustomersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customersTable)
      .where(sql`EXTRACT(YEAR FROM created_at) = ${year} AND EXTRACT(MONTH FROM created_at) = ${month}`);

    const [pendingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(sql`EXTRACT(YEAR FROM created_at) = ${year} AND EXTRACT(MONTH FROM created_at) = ${month} AND status = 'pending'`);

    const [inStitchingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(sql`EXTRACT(YEAR FROM created_at) = ${year} AND EXTRACT(MONTH FROM created_at) = ${month} AND status = 'in_stitching'`);

    const [readyResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(sql`EXTRACT(YEAR FROM created_at) = ${year} AND EXTRACT(MONTH FROM created_at) = ${month} AND status = 'ready'`);

    const [deliveredResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(sql`EXTRACT(YEAR FROM created_at) = ${year} AND EXTRACT(MONTH FROM created_at) = ${month} AND status = 'delivered'`);

    const totalRevenue = parseFloat(totalRevenueResult.total);
    const totalCollected = parseFloat(totalCollectedResult.total);

    res.json({
      year,
      month,
      totalOrders: Number(totalOrdersResult.count),
      totalRevenue,
      totalCollected,
      totalBalance: totalRevenue - totalCollected,
      newCustomers: Number(newCustomersResult.count),
      ordersByStatus: {
        pending: Number(pendingResult.count),
        in_stitching: Number(inStitchingResult.count),
        ready: Number(readyResult.count),
        delivered: Number(deliveredResult.count),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get monthly report");
    res.status(500).json({ error: "Failed to get monthly report" });
  }
});

export default router;
