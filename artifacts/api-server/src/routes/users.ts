import { Router, type IRouter } from "express";
import { db, usersTable, pointEventsTable } from "@workspace/db";
import { UpsertUserProfileBody, GetUserProfileResponse, UpsertUserProfileResponse } from "@workspace/api-zod";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    nudgeTime: user.nudgeTime ?? null,
    struggles: (user.struggles ?? []) as string[],
    onboardingComplete: user.onboardingComplete,
    lastOpenAt: user.lastOpenAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/users/profile", async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).orderBy(desc(usersTable.id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "No profile found" });
    return;
  }
  res.json(GetUserProfileResponse.parse(serializeUser(user)));
});

router.put("/users/profile", async (req, res): Promise<void> => {
  const parsed = UpsertUserProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(usersTable).orderBy(desc(usersTable.id)).limit(1);

  let user: typeof usersTable.$inferSelect;

  if (existing) {
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.nudgeTime !== undefined) updateData.nudgeTime = parsed.data.nudgeTime ?? null;
    if (parsed.data.struggles !== undefined) updateData.struggles = parsed.data.struggles;
    if (parsed.data.onboardingComplete !== undefined) updateData.onboardingComplete = parsed.data.onboardingComplete;
    if (parsed.data.lastOpenAt !== undefined) {
      updateData.lastOpenAt = parsed.data.lastOpenAt ? new Date(parsed.data.lastOpenAt) : null;
    }

    const results = await db.update(usersTable).set(updateData).returning();
    user = results[0] ?? existing;
  } else {
    const [inserted] = await db.insert(usersTable).values({
      name: parsed.data.name ?? "",
      nudgeTime: parsed.data.nudgeTime ?? null,
      struggles: parsed.data.struggles ?? [],
      onboardingComplete: parsed.data.onboardingComplete ?? false,
      lastOpenAt: parsed.data.lastOpenAt ? new Date(parsed.data.lastOpenAt) : undefined,
    }).returning();
    user = inserted;

    if (parsed.data.onboardingComplete) {
      await db.insert(pointEventsTable).values({ reason: "App opened for the first time", points: 5 });
    }
  }

  res.json(UpsertUserProfileResponse.parse(serializeUser(user)));
});

export default router;
