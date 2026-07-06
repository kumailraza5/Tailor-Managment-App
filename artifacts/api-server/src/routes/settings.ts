import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getOrCreateSettings() {
  const [existing] = await db.select().from(settingsTable);
  if (existing) return existing;
  const [created] = await db
    .insert(settingsTable)
    .values({ shopName: "JST Tailors", shopLogo: null })
    .returning();
  return created;
}

router.get("/settings", requireAuth(), async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    req.log.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.patch("/settings", requireAuth(), async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const { shopName, shopLogo } = req.body;
    const updateData: Record<string, unknown> = {};
    if (shopName !== undefined) updateData.shopName = shopName;
    if (shopLogo !== undefined) updateData.shopLogo = shopLogo;

    const [updated] = await db
      .update(settingsTable)
      .set(updateData)
      .where(eq(settingsTable.id, settings.id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
