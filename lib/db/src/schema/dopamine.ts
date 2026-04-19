import { pgTable, serial, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pointEventsTable = pgTable("point_events", {
  id: serial("id").primaryKey(),
  reason: text("reason").notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPointEventSchema = createInsertSchema(pointEventsTable).omit({ id: true, createdAt: true });
export type InsertPointEvent = z.infer<typeof insertPointEventSchema>;
export type PointEvent = typeof pointEventsTable.$inferSelect;
