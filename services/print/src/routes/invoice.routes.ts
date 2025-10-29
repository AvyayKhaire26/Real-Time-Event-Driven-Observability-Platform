import { Router } from "express";
import { InvoiceController } from "../controllers/InvoiceController";

export function createInvoiceRoutes(controller: InvoiceController): Router {
  const router = Router();

  router.post("/generate", (req, res) => controller.generateInvoice(req, res));
  router.get("/", (req, res) => controller.getAllInvoices(req, res));
  router.get("/:id", (req, res) => controller.getInvoiceById(req, res));
  router.get("/order/:orderId", (req, res) => controller.getInvoiceByOrderId(req, res));

  return router;
}