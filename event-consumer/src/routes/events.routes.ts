import { Router } from "express";
import { EventsController } from "../controllers/EventsController";

const router = Router();
const controller = new EventsController();

router.get("/", (req, res) => controller.getRecent(req, res));
router.get("/service/:service", (req, res) => controller.getByService(req, res));
router.get("/trace/:traceId", (req, res) => controller.getByTraceId(req, res));
router.get("/errors", (req, res) => controller.getErrors(req, res));

export default router;