import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, paymentsTable, ordersTable, customersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/payments", requireAuth(), async (req, res): Promise<void> => {
  try {
    const { customerId, orderId, limit = "50", offset = "0" } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit) || 50, 200);
    const off = parseInt(offset) || 0;

    const selectedFields = {
      id: paymentsTable.id,
      orderId: paymentsTable.orderId,
      customerId: paymentsTable.customerId,
      customerName: customersTable.name,
      orderNumber: ordersTable.orderNumber,
      amount: paymentsTable.amount,
      paymentDate: paymentsTable.paymentDate,
      notes: paymentsTable.notes,
      createdAt: paymentsTable.createdAt,
    };

    if (customerId) {
      const results = await db
        .select(selectedFields)
        .from(paymentsTable)
        .leftJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
        .leftJoin(ordersTable, eq(paymentsTable.orderId, ordersTable.id))
        .where(eq(paymentsTable.customerId, parseInt(customerId)))
        .orderBy(desc(paymentsTable.createdAt))
        .limit(lim)
        .offset(off);
      res.json(results);
      return;
    }

    if (orderId) {
      const results = await db
        .select(selectedFields)
        .from(paymentsTable)
        .leftJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
        .leftJoin(ordersTable, eq(paymentsTable.orderId, ordersTable.id))
        .where(eq(paymentsTable.orderId, parseInt(orderId)))
        .orderBy(desc(paymentsTable.createdAt))
        .limit(lim)
        .offset(off);
      res.json(results);
      return;
    }

    const payments = await db
      .select(selectedFields)
      .from(paymentsTable)
      .leftJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
      .leftJoin(ordersTable, eq(paymentsTable.orderId, ordersTable.id))
      .orderBy(desc(paymentsTable.createdAt))
      .limit(lim)
      .offset(off);
    res.json(payments);
  } catch (err) {
    req.log.error({ err }, "Failed to list payments");
    res.status(500).json({ error: "Failed to list payments" });
  }
});

router.post("/payments", requireAuth(), async (req, res): Promise<void> => {
  try {
    const { orderId, customerId, amount, paymentDate, notes } = req.body;
    if (!orderId || !customerId || amount === undefined || !paymentDate) {
      res.status(400).json({ error: "orderId, customerId, amount, and paymentDate are required" });
      return;
    }

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        orderId: parseInt(orderId),
        customerId: parseInt(customerId),
        amount: String(parseFloat(amount)),
        paymentDate,
        notes: notes ?? null,
      })
      .returning();

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, payment.orderId));
    if (order) {
      const allPayments = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, order.id));
      const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const balance = parseFloat(order.totalAmount) - totalPaid;
      await db
        .update(ordersTable)
        .set({ advanceAmount: String(totalPaid), balanceAmount: String(Math.max(0, balance)) })
        .where(eq(ordersTable.id, order.id));
    }

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, payment.customerId));
    res.status(201).json({
      ...payment,
      customerName: customer?.name ?? null,
      orderNumber: order?.orderNumber ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create payment");
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.delete("/payments/:id", requireAuth(), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [deleted] = await db
      .delete(paymentsTable)
      .where(eq(paymentsTable.id, id))
      .returning();

    if (!deleted) { res.status(404).json({ error: "Payment not found" }); return; }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, deleted.orderId));
    if (order) {
      const allPayments = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, order.id));
      const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const balance = parseFloat(order.totalAmount) - totalPaid;
      await db
        .update(ordersTable)
        .set({ advanceAmount: String(totalPaid), balanceAmount: String(Math.max(0, balance)) })
        .where(eq(ordersTable.id, order.id));
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete payment");
    res.status(500).json({ error: "Failed to delete payment" });
  }
});

export default router;
