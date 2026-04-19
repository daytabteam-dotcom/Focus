import { Router, type IRouter } from "express";
import { db, tasksTable, taskStepsTable, pointEventsTable } from "@workspace/db";
import {
  CreateTaskBody,
  UpdateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  DeleteTaskParams,
  GetTaskStepsParams,
  GenerateTaskStepsParams,
  UpdateTaskStepParams,
  UpdateTaskStepBody,
  ListTasksQueryParams,
} from "@workspace/api-zod";
import { eq, and, isNull, desc } from "drizzle-orm";

const router: IRouter = Router();

function serializeTask(task: typeof tasksTable.$inferSelect, steps?: typeof taskStepsTable.$inferSelect[]) {
  return {
    id: task.id,
    title: task.title,
    timeEstimateMinutes: task.timeEstimateMinutes ?? null,
    bucket: task.bucket,
    isFocus: task.isFocus,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    steps: steps?.map(serializeStep) ?? null,
  };
}

function serializeStep(step: typeof taskStepsTable.$inferSelect) {
  return {
    id: step.id,
    taskId: step.taskId,
    title: step.title,
    timeEstimateMinutes: step.timeEstimateMinutes,
    order: step.order,
    status: step.status,
  };
}

router.get("/tasks", async (req, res): Promise<void> => {
  const queryParsed = ListTasksQueryParams.safeParse(req.query);
  const bucket = queryParsed.success ? queryParsed.data.bucket : undefined;

  const conditions = [];
  if (bucket) conditions.push(eq(tasksTable.bucket, bucket));

  const tasks = bucket
    ? await db.select().from(tasksTable).where(eq(tasksTable.bucket, bucket)).orderBy(desc(tasksTable.isFocus), tasksTable.createdAt)
    : await db.select().from(tasksTable).orderBy(desc(tasksTable.isFocus), tasksTable.createdAt);

  res.json(tasks.map(t => serializeTask(t)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db.insert(tasksTable).values({
    title: parsed.data.title,
    timeEstimateMinutes: parsed.data.timeEstimateMinutes ?? null,
    bucket: parsed.data.bucket,
    isFocus: parsed.data.isFocus ?? false,
  }).returning();

  res.status(201).json(serializeTask(task));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const steps = await db.select().from(taskStepsTable).where(eq(taskStepsTable.taskId, task.id)).orderBy(taskStepsTable.order);
  res.json(serializeTask(task, steps));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const updateData: Partial<typeof tasksTable.$inferInsert> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.timeEstimateMinutes !== undefined) updateData.timeEstimateMinutes = parsed.data.timeEstimateMinutes;
  if (parsed.data.bucket !== undefined) updateData.bucket = parsed.data.bucket;
  if (parsed.data.isFocus !== undefined) updateData.isFocus = parsed.data.isFocus;
  if (parsed.data.completedAt !== undefined) {
    updateData.completedAt = parsed.data.completedAt ? new Date(parsed.data.completedAt) : null;
  }

  const [task] = await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, params.data.id)).returning();

  if (parsed.data.completedAt && !existing.completedAt) {
    await db.insert(pointEventsTable).values({ reason: `Task completed: ${task.title}`, points: 10 });
  }

  res.json(serializeTask(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/tasks/:id/steps", async (req, res): Promise<void> => {
  const params = GetTaskStepsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const steps = await db.select().from(taskStepsTable).where(eq(taskStepsTable.taskId, params.data.id)).orderBy(taskStepsTable.order);
  res.json(steps.map(serializeStep));
});

router.post("/tasks/:id/steps", async (req, res): Promise<void> => {
  const params = GenerateTaskStepsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  await db.delete(taskStepsTable).where(eq(taskStepsTable.taskId, task.id));

  const defaultSteps = [
    { title: `Open the document or tool you need for "${task.title}"`, timeEstimateMinutes: 1, order: 0, status: "pending" as const },
    { title: `Write down 3 bullet points about what needs to happen`, timeEstimateMinutes: 3, order: 1, status: "pending" as const },
    { title: `Do the first small part — just start, don't finish`, timeEstimateMinutes: 5, order: 2, status: "pending" as const },
    { title: `Review what you've done so far`, timeEstimateMinutes: 3, order: 3, status: "pending" as const },
    { title: `Complete the task or schedule the next session`, timeEstimateMinutes: 5, order: 4, status: "pending" as const },
  ];

  const inserted = await db.insert(taskStepsTable).values(
    defaultSteps.map(s => ({ ...s, taskId: task.id }))
  ).returning();

  res.json(inserted.map(serializeStep));
});

router.patch("/tasks/:taskId/steps/:stepId", async (req, res): Promise<void> => {
  const params = UpdateTaskStepParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskStepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [step] = await db.update(taskStepsTable)
    .set({ status: parsed.data.status })
    .where(and(eq(taskStepsTable.id, params.data.stepId), eq(taskStepsTable.taskId, params.data.taskId)))
    .returning();

  if (!step) {
    res.status(404).json({ error: "Step not found" });
    return;
  }

  res.json(serializeStep(step));
});

export default router;
