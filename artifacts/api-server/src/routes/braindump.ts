import { Router, type IRouter } from "express";
import { db, brainDumpsTable, pointEventsTable } from "@workspace/db";
import { CreateBrainDumpBody, ConfirmBrainDumpTriageParams, ConfirmBrainDumpTriageBody } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function serializeDump(dump: typeof brainDumpsTable.$inferSelect) {
  return {
    id: dump.id,
    content: dump.content,
    suggestedBucket: dump.suggestedBucket ?? null,
    confirmedBucket: dump.confirmedBucket ?? null,
    triageReason: dump.triageReason ?? null,
    createdAt: dump.createdAt.toISOString(),
  };
}

function triageContent(content: string): { bucket: string; reason: string } {
  const lower = content.toLowerCase();

  if (lower.includes("worry") || lower.includes("anxious") || lower.includes("scared") || lower.includes("what if")) {
    return { bucket: "letitgo", reason: "This sounds like worry or rumination rather than an action — letting it go can help" };
  }
  if (lower.includes("today") || lower.includes("urgent") || lower.includes("asap") || lower.includes("now") || lower.includes("deadline")) {
    return { bucket: "today", reason: "This sounds time-sensitive — adding it to today" };
  }
  if (lower.includes("remind") || lower.includes("at ") || lower.includes("tomorrow") || lower.includes("at noon")) {
    return { bucket: "remind", reason: "This sounds like it needs a time reminder" };
  }
  return { bucket: "later", reason: "This feels relevant but not urgent — saving it for later" };
}

router.get("/braindump", async (req, res): Promise<void> => {
  const dumps = await db.select().from(brainDumpsTable).orderBy(desc(brainDumpsTable.createdAt)).limit(30);
  res.json(dumps.map(serializeDump));
});

router.post("/braindump", async (req, res): Promise<void> => {
  const parsed = CreateBrainDumpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const triage = triageContent(parsed.data.content);

  const [dump] = await db.insert(brainDumpsTable).values({
    content: parsed.data.content,
    suggestedBucket: triage.bucket,
    triageReason: triage.reason,
  }).returning();

  await db.insert(pointEventsTable).values({ reason: "Brain dump captured", points: 2 });

  res.status(201).json(serializeDump(dump));
});

router.post("/braindump/:id/confirm", async (req, res): Promise<void> => {
  const params = ConfirmBrainDumpTriageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ConfirmBrainDumpTriageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dump] = await db.update(brainDumpsTable)
    .set({ confirmedBucket: parsed.data.bucket })
    .where(eq(brainDumpsTable.id, params.data.id))
    .returning();

  if (!dump) {
    res.status(404).json({ error: "Brain dump not found" });
    return;
  }

  res.json(serializeDump(dump));
});

export default router;
