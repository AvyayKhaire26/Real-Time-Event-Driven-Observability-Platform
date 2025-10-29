import { Router } from "express";
import { OrderController } from "../controllers/OrderController";

export function createOrderRoutes(controller: OrderController): Router {
  const router = Router();

  router.post("/", (req, res) => controller.createOrder(req, res));
  router.get("/", (req, res) => controller.getAllOrders(req, res));
  router.get("/:id", (req, res) => controller.getOrderById(req, res));
  router.get("/user/:userId", (req, res) => controller.getUserOrders(req, res));
  router.patch("/:id/status", (req, res) => controller.updateOrderStatus(req, res));

  return router;
}