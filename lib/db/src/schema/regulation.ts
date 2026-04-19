import { pgTable, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const regulationLogsTable = pgTable("regulation_logs", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id").notNull(),
  tensionBefore: integer("tension_before").notNull(),
  tensionAfter: integer("tension_after").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRegulationLogSchema = createInsertSchema(regulationLogsTable).omit({ id: true, createdAt: true });
export type InsertRegulationLog = z.infer<typeof insertRegulationLogSchema>;
export type RegulationLog = typeof regulationLogsTable.$inferSelect;
