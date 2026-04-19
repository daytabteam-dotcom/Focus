import { pgTable, serial, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brainDumpsTable = pgTable("brain_dumps", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  suggestedBucket: text("suggested_bucket"),
  confirmedBucket: text("confirmed_bucket"),
  triageReason: text("triage_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBrainDumpSchema = createInsertSchema(brainDumpsTable).omit({ id: true, createdAt: true });
export type InsertBrainDump = z.infer<typeof insertBrainDumpSchema>;
export type BrainDump = typeof brainDumpsTable.$inferSelect;
