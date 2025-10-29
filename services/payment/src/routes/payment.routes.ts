import { Router } from "express";
import { PaymentController } from "../controllers/PaymentController";

export function createPaymentRoutes(controller: PaymentController): Router {
  const router = Router();

  router.post("/process", (req, res) => controller.processPayment(req, res));
  router.get("/", (req, res) => controller.getAllPayments(req, res));
  router.get("/:id", (req, res) => controller.getPaymentById(req, res));
  router.get("/order/:orderId", (req, res) => controller.getPaymentByOrderId(req, res));

  return router;
}