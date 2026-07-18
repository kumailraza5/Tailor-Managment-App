import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, customersTable, measurementsTable, ordersTable, paymentsTable } from "@workspace/db";
import { eq, ilike, or, desc } from "drizzle-orm";

const router = Router();

router.get("/customers", requireAuth(), async (req, res): Promise<void> => {
  try {
    const { search, limit = "50", offset = "0" } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit) || 50, 200);
    const off = parseInt(offset) || 0;

    if (search) {
      const searchTerm = `%${search}%`;
      
      let searchId: number | null = null;
      const idMatch = search.match(/JST-(\d+)/i);
      if (idMatch) {
        searchId = parseInt(idMatch[1], 10);
      } else if (!isNaN(parseInt(search, 10)) && /^\d+$/.test(search)) {
        searchId = parseInt(search, 10);
      }

      const searchConditions = [
        ilike(customersTable.name, searchTerm),
        ilike(customersTable.phone, searchTerm),
        ilike(customersTable.address, searchTerm),
      ];

      if (searchId !== null) {
        searchConditions.push(eq(customersTable.id, searchId));
      }

      const results = await db
        .select()
        .from(customersTable)
        .where(
          or(...searchConditions)
        )
        .orderBy(desc(customersTable.createdAt))
        .limit(lim)
        .offset(off);
      res.json(results);
      return;
    }

    const customers = await db.select().from(customersTable).orderBy(desc(customersTable.createdAt)).limit(lim).offset(off);
    res.json(customers);
  } catch (err) {
    req.log.error({ err }, "Failed to list customers");
    res.status(500).json({ error: "Failed to list customers" });
  }
});

router.post("/customers", requireAuth(), async (req, res): Promise<void> => {
  try {
    const { id: customId, name, phone, address, notes } = req.body;
    if (!name || !phone) {
      res.status(400).json({ error: "Name and phone are required" });
      return;
    }

    if (customId !== undefined) {
      const manualId = parseInt(customId);
      if (isNaN(manualId) || manualId <= 0) {
        res.status(400).json({ error: "Custom ID must be a positive integer" });
        return;
      }
      // Check for duplicate
      const [existing] = await db.select().from(customersTable).where(eq(customersTable.id, manualId));
      if (existing) {
        res.status(409).json({ error: `Customer ID ${manualId} already exists` });
        return;
      }
      // Use raw SQL to override the serial sequence
      const pool = (db as any).session?.client ?? (db as any).$client;
      const result = await pool.query(
        `INSERT INTO customers (id, name, phone, address, notes, created_at, updated_at)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [manualId, name, phone, address || null, notes || null]
      );
      // Advance the sequence so future auto-inserts don't collide
      await pool.query(`SELECT setval('customers_id_seq', GREATEST(nextval('customers_id_seq') - 1, $1))`, [manualId]);
      res.status(201).json(result.rows[0]);
      return;
    }

    const [customer] = await db
      .insert(customersTable)
      .values({ name, phone, address: address || null, notes: notes || null })
      .returning();
    res.status(201).json(customer);
  } catch (err) {
    req.log.error({ err }, "Failed to create customer");
    res.status(500).json({ error: "Failed to create customer" });
  }
});

router.get("/customers/:id", requireAuth(), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

    const [measurements] = await db
      .select()
      .from(measurementsTable)
      .where(eq(measurementsTable.customerId, id));

    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.customerId, id))
      .orderBy(desc(ordersTable.createdAt));

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.customerId, id))
      .orderBy(desc(paymentsTable.createdAt));

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
    const totalBalance = totalAmount - totalPaid;

    const ordersWithCustomer = orders.map(o => ({ ...o, customerName: customer.name }));
    const paymentsWithDetails = payments.map(p => {
      const order = orders.find(o => o.id === p.orderId);
      return { ...p, customerName: customer.name, orderNumber: order?.orderNumber ?? null };
    });

    res.json({
      ...customer,
      measurements: measurements ?? null,
      orders: ordersWithCustomer,
      payments: paymentsWithDetails,
      totalOrders: orders.length,
      totalPaid,
      totalBalance,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get customer");
    res.status(500).json({ error: "Failed to get customer" });
  }
});

router.patch("/customers/:id", requireAuth(), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const { name, phone, address, notes } = req.body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(customersTable)
      .set(updateData)
      .where(eq(customersTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Customer not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update customer");
    res.status(500).json({ error: "Failed to update customer" });
  }
});

router.delete("/customers/:id", requireAuth(), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [deleted] = await db
      .delete(customersTable)
      .where(eq(customersTable.id, id))
      .returning();

    if (!deleted) { res.status(404).json({ error: "Customer not found" }); return; }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

export default router;
