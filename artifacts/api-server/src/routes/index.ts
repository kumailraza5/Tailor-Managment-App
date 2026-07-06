import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import customersRouter from "./customers";
import measurementsRouter from "./measurements";
import ordersRouter from "./orders";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(customersRouter);
router.use(measurementsRouter);
router.use(ordersRouter);
router.use(paymentsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(settingsRouter);

export default router;
