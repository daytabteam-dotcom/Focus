import { Router, type IRouter } from "express";
import { db, regulationLogsTable, pointEventsTable } from "@workspace/db";
import { LogRegulationExerciseBody } from "@workspace/api-zod";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

const EXERCISES = [
  {
    id: 1,
    name: "Physiological Sigh",
    description: "A double inhale through the nose followed by a long exhale through the mouth. The fastest way to calm your nervous system.",
    type: "physiological_sigh",
    durationSeconds: 180,
    bestFor: ["anxiety", "chest tension", "overwhelm", "panic"],
    steps: [
      "Inhale deeply through your nose",
      "Take a second short sniff on top of that inhale",
      "Now exhale slowly and fully through your mouth",
      "Let your shoulders drop as you breathe out",
      "Repeat 4 more times"
    ]
  },
  {
    id: 2,
    name: "Box Breathing",
    description: "A 4-count breathing pattern used by Navy SEALs to calm the mind under pressure. Creates a sense of control.",
    type: "box_breathing",
    durationSeconds: 300,
    bestFor: ["racing mind", "pre-task anxiety", "restlessness", "frustration"],
    steps: [
      "Inhale slowly for 4 counts",
      "Hold for 4 counts",
      "Exhale for 4 counts",
      "Hold empty for 4 counts",
      "Repeat 4 more times"
    ]
  },
  {
    id: 3,
    name: "Jaw & Shoulder Release",
    description: "Clench and release your jaw and shoulders. Physical tension holds emotional tension — releasing one releases the other.",
    type: "jaw_release",
    durationSeconds: 120,
    bestFor: ["physical tension", "frustration", "stored stress", "headache"],
    steps: [
      "Clench your jaw tightly for 5 seconds",
      "Release completely — feel the difference",
      "Raise your shoulders to your ears, hold 5 seconds",
      "Drop them fully — breathe out as you do",
      "Repeat twice more"
    ]
  },
  {
    id: 4,
    name: "Cold Water Reset",
    description: "Running cold water over your wrists or face triggers the dive reflex, rapidly slowing your heart rate and calming panic.",
    type: "cold_water",
    durationSeconds: 60,
    bestFor: ["panic", "overwhelm", "shutdown", "dissociation"],
    steps: [
      "Go to a sink with cold water",
      "Run cold water over your wrists for 30 seconds",
      "Or splash cold water on your face",
      "Feel the temperature — it anchors you to the present",
      "Take 3 slow breaths as you dry off"
    ]
  },
  {
    id: 5,
    name: "Humming",
    description: "Humming on your exhale vibrates the vagus nerve, signaling your body to shift out of freeze or shutdown mode.",
    type: "humming",
    durationSeconds: 120,
    bestFor: ["numbness", "flatness", "shutdown", "dissociation", "low mood"],
    steps: [
      "Take a breath in through your nose",
      "As you exhale, make an extended 'hmmmm' sound",
      "Feel the vibration in your chest and throat",
      "Let it be any pitch that feels comfortable",
      "Repeat 4 more times — notice what shifts"
    ]
  }
];

router.get("/regulation/exercises", async (req, res): Promise<void> => {
  res.json(EXERCISES);
});

router.post("/regulation/logs", async (req, res): Promise<void> => {
  const parsed = LogRegulationExerciseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [log] = await db.insert(regulationLogsTable).values({
    exerciseId: parsed.data.exerciseId,
    tensionBefore: parsed.data.tensionBefore,
    tensionAfter: parsed.data.tensionAfter,
  }).returning();

  await db.insert(pointEventsTable).values({ reason: "Regulation exercise completed", points: 5 });

  res.status(201).json({
    id: log.id,
    exerciseId: log.exerciseId,
    tensionBefore: log.tensionBefore,
    tensionAfter: log.tensionAfter,
    createdAt: log.createdAt.toISOString(),
  });
});

export default router;
