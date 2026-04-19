import { Router, type IRouter } from "express";
import { db, pointEventsTable } from "@workspace/db";
import { RedeemRewardParams } from "@workspace/api-zod";
import { desc, gte, sum } from "drizzle-orm";

const router: IRouter = Router();

const REWARDS = [
  { id: 1, name: "10-Minute Guilt-Free Break", description: "You earned 10 full minutes of anything you want — no guilt attached.", pointCost: 20 },
  { id: 2, name: "30-Minute Fun Activity", description: "A full half hour of something enjoyable, officially sanctioned.", pointCost: 30 },
  { id: 3, name: "Skip One Task Without Guilt", description: "Move a task to later with zero guilt — you have full permission.", pointCost: 15 },
  { id: 4, name: "Unlock: Rain Sounds", description: "Unlock gentle rain ambient sounds for your focus sessions.", pointCost: 25 },
  { id: 5, name: "Unlock: Lo-fi Music", description: "Unlock lo-fi background music for your focus sessions.", pointCost: 25 },
];

router.get("/dopamine/points", async (req, res): Promise<void> => {
  const allEvents = await db.select().from(pointEventsTable).orderBy(desc(pointEventsTable.createdAt)).limit(50);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const total = allEvents.reduce((sum, e) => sum + e.points, 0);
  const todayEarned = allEvents.filter(e => e.createdAt >= todayStart).reduce((sum, e) => sum + e.points, 0);
  const weekEarned = allEvents.filter(e => e.createdAt >= weekStart).reduce((sum, e) => sum + e.points, 0);

  res.json({
    total: Math.max(0, total),
    todayEarned,
    weekEarned,
    recentEvents: allEvents.slice(0, 10).map(e => ({
      id: e.id,
      reason: e.reason,
      points: e.points,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

router.get("/dopamine/rewards", async (req, res): Promise<void> => {
  res.json(REWARDS);
});

router.post("/dopamine/rewards/:id/redeem", async (req, res): Promise<void> => {
  const params = RedeemRewardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const reward = REWARDS.find(r => r.id === params.data.id);
  if (!reward) {
    res.status(404).json({ error: "Reward not found" });
    return;
  }

  await db.insert(pointEventsTable).values({
    reason: `Reward redeemed: ${reward.name}`,
    points: -reward.pointCost,
  });

  const allEvents = await db.select().from(pointEventsTable).orderBy(desc(pointEventsTable.createdAt)).limit(50);
  const total = allEvents.reduce((sum, e) => sum + e.points, 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  res.json({
    total: Math.max(0, total),
    todayEarned: allEvents.filter(e => e.createdAt >= todayStart).reduce((sum, e) => sum + e.points, 0),
    weekEarned: allEvents.filter(e => e.createdAt >= weekStart).reduce((sum, e) => sum + e.points, 0),
    recentEvents: allEvents.slice(0, 10).map(e => ({
      id: e.id,
      reason: e.reason,
      points: e.points,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

export default router;
