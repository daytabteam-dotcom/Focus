import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import tasksRouter from "./tasks";
import sessionsRouter from "./sessions";
import checkinsRouter from "./checkins";
import braindumpRouter from "./braindump";
import regulationRouter from "./regulation";
import dopamineRouter from "./dopamine";
import insightsRouter from "./insights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(tasksRouter);
router.use(sessionsRouter);
router.use(checkinsRouter);
router.use(braindumpRouter);
router.use(regulationRouter);
router.use(dopamineRouter);
router.use(insightsRouter);

export default router;
