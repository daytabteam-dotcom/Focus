import { Router, type IRouter } from "express";
import { db, checkinsTable, pointEventsTable } from "@workspace/db";
import { CreateCheckinBody } from "@workspace/api-zod";
import { desc, gte } from "drizzle-orm";

const router: IRouter = Router();

function serializeCheckin(checkin: typeof checkinsTable.$inferSelect) {
  return {
    id: checkin.id,
    mood: checkin.mood,
    energyLevel: checkin.energyLevel,
    bodyZones: checkin.bodyZones ?? [],
    createdAt: checkin.createdAt.toISOString(),
  };
}

router.get("/checkins", async (req, res): Promise<void> => {
  const checkins = await db.select().from(checkinsTable).orderBy(desc(checkinsTable.createdAt)).limit(50);
  res.json(checkins.map(serializeCheckin));
});

router.post("/checkins", async (req, res): Promise<void> => {
  const parsed = CreateCheckinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [checkin] = await db.insert(checkinsTable).values({
    mood: parsed.data.mood,
    energyLevel: parsed.data.energyLevel,
    bodyZones: parsed.data.bodyZones ?? [],
  }).returning();

  await db.insert(pointEventsTable).values({ reason: "Mood check-in logged", points: 3 });

  res.status(201).json(serializeCheckin(checkin));
});

router.get("/checkins/today", async (req, res): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [checkin] = await db.select().from(checkinsTable)
    .where(gte(checkinsTable.createdAt, todayStart))
    .orderBy(desc(checkinsTable.createdAt))
    .limit(1);

  if (!checkin) {
    res.status(404).json({ error: "No check-in today" });
    return;
  }

  res.json(serializeCheckin(checkin));
});

export default router;
