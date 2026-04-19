import { Router, type IRouter } from "express";
import { db, focusSessionsTable, pointEventsTable } from "@workspace/db";
import { CreateSessionBody, UpdateSessionParams, UpdateSessionBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function serializeSession(session: typeof focusSessionsTable.$inferSelect) {
  return {
    id: session.id,
    taskId: session.taskId,
    durationMinutes: session.durationMinutes,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
  };
}

router.get("/sessions", async (req, res): Promise<void> => {
  const sessions = await db.select().from(focusSessionsTable).orderBy(focusSessionsTable.startedAt);
  res.json(sessions.map(serializeSession));
});

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db.insert(focusSessionsTable).values({
    taskId: parsed.data.taskId,
    durationMinutes: parsed.data.durationMinutes,
    status: "active",
  }).returning();

  res.status(201).json(serializeSession(session));
});

router.patch("/sessions/:id", async (req, res): Promise<void> => {
  const params = UpdateSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db.update(focusSessionsTable).set({
    status: parsed.data.status,
    endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : new Date(),
  }).where(eq(focusSessionsTable.id, params.data.id)).returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (parsed.data.status === "completed") {
    await db.insert(pointEventsTable).values({ reason: "Focus session completed", points: 15 });
  }

  res.json(serializeSession(session));
});

export default router;
