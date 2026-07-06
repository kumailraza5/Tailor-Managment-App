import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, ordersTable, customersTable, paymentsTable } from "@workspace/db";
import { eq, ilike, or, desc, sql } from "drizzle-orm";

const router = Router();

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(ordersTable)
    .where(sql`EXTRACT(YEAR FROM created_at) = ${year}`);
  const count = Number(result[0]?.count ?? 0) + 1;
  return `JST-${year}-${String(count).padStart(4, "0")}`;
}

router.get("/orders", requireAuth(), async (req, res): Promise<void> => {
  try {
    const { status, customerId, search, limit = "50", offset = "0" } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit) || 50, 200);
    const off = parseInt(offset) || 0;

    const conditions = [];
    if (status) conditions.push(eq(ordersTable.status, status as "pending" | "in_stitching" | "ready" | "delivered"));
    if (customerId) conditions.push(eq(ordersTable.customerId, parseInt(customerId)));

    if (conditions.length > 0 || search) {
      const results = await db
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
        .where(
          conditions.length === 1
            ? conditions[0]
            : search
            ? or(...conditions, ilike(customersTable.name, `%${search}%`), ilike(ordersTable.orderNumber, `%${search}%`))
            : conditions[0]
        )
        .orderBy(desc(ordersTable.createdAt))
        .limit(lim)
        .offset(off);
      res.json(results);
      return;
    }

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
      .limit(lim)
      .offset(off);
    res.json(orders);
  } catch (err) {
    req.log.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Failed to list orders" });
  }
});

router.post("/orders", requireAuth(), async (req, res): Promise<void> => {
  try {
    const { customerId, orderDate, deliveryDate, status, totalAmount, advanceAmount, notes } = req.body;
    if (!customerId || !orderDate || totalAmount === undefined) {
      res.status(400).json({ error: "customerId, orderDate, and totalAmount are required" });
      return;
    }

    const orderNumber = await generateOrderNumber();
    const total = parseFloat(totalAmount) || 0;
    const advance = parseFloat(advanceAmount) || 0;
    const balance = total - advance;

    const [order] = await db
      .insert(ordersTable)
      .values({
        orderNumber,
        customerId: parseInt(customerId),
        orderDate,
        deliveryDate: deliveryDate ?? null,
        status: status ?? "pending",
        totalAmount: String(total),
        advanceAmount: String(advance),
        balanceAmount: String(balance),
        notes: notes ?? null,
      })
      .returning();

    if (advance > 0) {
      await db.insert(paymentsTable).values({
        orderId: order.id,
        customerId: order.customerId,
        amount: String(advance),
        paymentDate: orderDate,
        notes: `Advance Payment for Order ${orderNumber}`,
      });
    }

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId));
    res.status(201).json({ ...order, customerName: customer?.name ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to create order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/orders/:id", requireAuth(), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [result] = await db
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
      .where(eq(ordersTable.id, id));

    if (!result) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "Failed to get order" });
  }
});

router.patch("/orders/:id", requireAuth(), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const { customerId, orderDate, deliveryDate, status, totalAmount, advanceAmount, notes } = req.body;
    const updateData: Record<string, unknown> = {};

    if (customerId !== undefined) updateData.customerId = parseInt(customerId);
    if (orderDate !== undefined) updateData.orderDate = orderDate;
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    if (totalAmount !== undefined || advanceAmount !== undefined) {
      const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
      if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

      const total = totalAmount !== undefined ? parseFloat(totalAmount) : parseFloat(existing.totalAmount);
      const advance = advanceAmount !== undefined ? parseFloat(advanceAmount) : parseFloat(existing.advanceAmount);
      updateData.totalAmount = String(total);
      updateData.advanceAmount = String(advance);
      updateData.balanceAmount = String(total - advance);

      // Synchronize the advance payment in paymentsTable
      const oldAdvance = parseFloat(existing.advanceAmount);
      if (advance !== oldAdvance) {
        // Find existing advance payment for this order
        const [existingAdvancePayment] = await db
          .select()
          .from(paymentsTable)
          .where(eq(paymentsTable.orderId, id))
          .limit(1); // Usually the first payment is the advance

        if (existingAdvancePayment) {
          if (advance > 0) {
            await db
              .update(paymentsTable)
              .set({
                amount: String(advance),
                paymentDate: orderDate !== undefined ? orderDate : existing.orderDate,
              })
              .where(eq(paymentsTable.id, existingAdvancePayment.id));
          } else {
            // Delete if new advance is 0
            await db.delete(paymentsTable).where(eq(paymentsTable.id, existingAdvancePayment.id));
          }
        } else if (advance > 0) {
          // Create new advance payment if none existed before
          await db.insert(paymentsTable).values({
            orderId: id,
            customerId: existing.customerId,
            amount: String(advance),
            paymentDate: orderDate !== undefined ? orderDate : existing.orderDate,
            notes: `Advance Payment for Order ${existing.orderNumber}`,
          });
        }
      }
    }

    const [updated] = await db
      .update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Order not found" }); return; }

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, updated.customerId));
    res.json({ ...updated, customerName: customer?.name ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to update order");
    res.status(500).json({ error: "Failed to update order" });
  }
});

router.delete("/orders/:id", requireAuth(), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [deleted] = await db
      .delete(ordersTable)
      .where(eq(ordersTable.id, id))
      .returning();

    if (!deleted) { res.status(404).json({ error: "Order not found" }); return; }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete order");
    res.status(500).json({ error: "Failed to delete order" });
  }
});

export default router;
