import { Router, type IRouter } from "express";
import { db, tasksTable, focusSessionsTable, checkinsTable, pointEventsTable, regulationLogsTable } from "@workspace/db";
import { desc, gte, eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/insights/daily", async (req, res): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayTasks = await db.select().from(tasksTable).where(
    and(gte(tasksTable.completedAt, todayStart))
  );

  const todaySessions = await db.select().from(focusSessionsTable).where(
    and(gte(focusSessionsTable.startedAt, todayStart), eq(focusSessionsTable.status, "completed"))
  );

  const todayPoints = await db.select().from(pointEventsTable).where(gte(pointEventsTable.createdAt, todayStart));

  const [latestCheckin] = await db.select().from(checkinsTable)
    .where(gte(checkinsTable.createdAt, todayStart))
    .orderBy(desc(checkinsTable.createdAt))
    .limit(1);

  const focusMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const pointsEarned = todayPoints.reduce((sum, e) => sum + e.points, 0);

  const streakDots: boolean[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    day.setHours(0, 0, 0, 0);
    return i === 6;
  });

  res.json({
    tasksCompleted: todayTasks.length,
    pointsEarned: Math.max(0, pointsEarned),
    focusMinutes,
    currentMood: latestCheckin?.mood ?? null,
    energyLevel: latestCheckin?.energyLevel ?? null,
    streakDots,
  });
});

router.get("/insights/weekly", async (req, res): Promise<void> => {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const tasks = await db.select().from(tasksTable).where(gte(tasksTable.completedAt, weekStart));
  const sessions = await db.select().from(focusSessionsTable).where(
    and(gte(focusSessionsTable.startedAt, weekStart), eq(focusSessionsTable.status, "completed"))
  );
  const points = await db.select().from(pointEventsTable).where(gte(pointEventsTable.createdAt, weekStart));
  const regLogs = await db.select().from(regulationLogsTable).where(gte(regulationLogsTable.createdAt, weekStart));

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const tasksByDay = days.map((day, i) => {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - (6 - i));
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const count = tasks.filter(t => t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd).length;
    return { day, count };
  });

  const totalFocusMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalPointsEarned = Math.max(0, points.reduce((sum, e) => sum + e.points, 0));

  let bestExercise: string | null = null;
  if (regLogs.length > 0) {
    const exerciseNames: Record<number, string> = {
      1: "Physiological Sigh",
      2: "Box Breathing",
      3: "Jaw & Shoulder Release",
      4: "Cold Water Reset",
      5: "Humming",
    };
    const best = regLogs.reduce((prev, curr) =>
      (prev.tensionBefore - prev.tensionAfter) > (curr.tensionBefore - curr.tensionAfter) ? prev : curr
    );
    bestExercise = exerciseNames[best.exerciseId] ?? null;
  }

  res.json({
    tasksByDay,
    totalFocusMinutes,
    bestRegulationExercise: bestExercise,
    estimationAccuracy: null,
    totalPointsEarned,
  });
});

export default router;
