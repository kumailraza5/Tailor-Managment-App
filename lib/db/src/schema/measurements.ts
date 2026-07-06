import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const measurementsTable = pgTable("measurements", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }).unique(),

  // ── Kameez ──────────────────────────────────────────────────────────────────
  length:      numeric("length",       { precision: 5, scale: 2 }),
  shoulder:    numeric("shoulder",     { precision: 5, scale: 2 }),
  sleeve:      numeric("sleeve",       { precision: 5, scale: 2 }),
  chest:       numeric("chest",        { precision: 5, scale: 2 }),
  waist:       numeric("waist",        { precision: 5, scale: 2 }),
  hip:         numeric("hip",          { precision: 5, scale: 2 }),
  ghera:       numeric("ghera",        { precision: 5, scale: 2 }),
  collar:      numeric("collar",       { precision: 5, scale: 2 }),   // numeric collar/ban size
  frontPatti:  numeric("front_patti",  { precision: 5, scale: 2 }),
  cuff:        numeric("cuff",         { precision: 5, scale: 2 }),
  pocket:      numeric("pocket",       { precision: 5, scale: 2 }),   // kameez pocket

  // ── Shalwar ─────────────────────────────────────────────────────────────────
  shalwarLength: numeric("shalwar_length", { precision: 5, scale: 2 }),
  bottom:        numeric("bottom",         { precision: 5, scale: 2 }),
  shalwarGhair:  numeric("shalwar_ghair",  { precision: 5, scale: 2 }),
  shalwarPocket: numeric("shalwar_pocket", { precision: 5, scale: 2 }),

  // ── Additional Options (dropdowns) ──────────────────────────────────────────
  buttonsType: text("buttons_type"),   // Simple | Fancy | Metal
  collarType:  text("collar_type"),    // Ban | Collar
  gheraStyle:  text("ghera_style"),    // Simple | Lengthy

  // ── Notes ───────────────────────────────────────────────────────────────────
  notes:           text("notes"),            // legacy / general notes
  additionalNotes: text("additional_notes"), // print-only receipt notes

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMeasurementSchema = createInsertSchema(measurementsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertMeasurement = z.infer<typeof insertMeasurementSchema>;
export type Measurement = typeof measurementsTable.$inferSelect;
