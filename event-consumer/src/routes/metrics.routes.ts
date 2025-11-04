import { Router } from "express";
import { MetricsController } from "../controllers/MetricsController";

const router = Router();
const controller = new MetricsController();

router.get("/:service/avg-response-time", (req, res) => 
  controller.getAverageResponseTime(req, res)
);
router.get("/:service/error-rate", (req, res) => 
  controller.getErrorRate(req, res)
);

export default router;