import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, measurementsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/customers/:id/measurements", requireAuth(), async (req, res): Promise<void> => {
  try {
    const customerId = parseInt(req.params["id"] as string);
    if (isNaN(customerId)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [measurement] = await db
      .select()
      .from(measurementsTable)
      .where(eq(measurementsTable.customerId, customerId));

    res.json(measurement ?? null);
  } catch (err) {
    req.log.error({ err }, "Failed to get measurements");
    res.status(500).json({ error: "Failed to get measurements" });
  }
});

router.put("/customers/:id/measurements", requireAuth(), async (req, res): Promise<void> => {
  try {
    const customerId = parseInt(req.params["id"] as string);
    if (isNaN(customerId)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const {
      // Kameez
      length, shoulder, sleeve, chest, waist, hip, ghera,
      collar, frontPatti, cuff, pocket,
      // Shalwar
      shalwarLength, bottom, shalwarGhair, shalwarPocket,
      // Additional Options
      buttonsType, collarType, gheraStyle,
      // Notes
      notes, additionalNotes,
    } = req.body;

    const values = {
      customerId,
      // Kameez
      length:       length       ?? null,
      shoulder:     shoulder     ?? null,
      sleeve:       sleeve       ?? null,
      chest:        chest        ?? null,
      waist:        waist        ?? null,
      hip:          hip          ?? null,
      ghera:        ghera        ?? null,
      collar:       collar       ?? null,
      frontPatti:   frontPatti   ?? null,
      cuff:         cuff         ?? null,
      pocket:       pocket       ?? null,
      // Shalwar
      shalwarLength:  shalwarLength  ?? null,
      bottom:         bottom         ?? null,
      shalwarGhair:   shalwarGhair   ?? null,
      shalwarPocket:  shalwarPocket  ?? null,
      // Additional Options
      buttonsType:  buttonsType  ?? null,
      collarType:   collarType   ?? null,
      gheraStyle:   gheraStyle   ?? null,
      // Notes
      notes:           notes           ?? null,
      additionalNotes: additionalNotes ?? null,
    };

    const [existing] = await db
      .select()
      .from(measurementsTable)
      .where(eq(measurementsTable.customerId, customerId));

    let result;
    if (existing) {
      const [updated] = await db
        .update(measurementsTable)
        .set(values)
        .where(eq(measurementsTable.customerId, customerId))
        .returning();
      result = updated;
    } else {
      const [created] = await db
        .insert(measurementsTable)
        .values(values)
        .returning();
      result = created;
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to upsert measurements");
    res.status(500).json({ error: "Failed to upsert measurements" });
  }
});

export default router;
