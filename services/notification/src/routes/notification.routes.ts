import { Router } from "express";
import { NotificationController } from "../controllers/NotificationController";

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();

  router.post("/send", (req, res) => controller.sendNotification(req, res));
  router.get("/", (req, res) => controller.getAllNotifications(req, res));
  router.get("/:id", (req, res) => controller.getNotificationById(req, res));
  router.get("/recipient/:recipient", (req, res) => controller.getNotificationsByRecipient(req, res));

  return router;
}