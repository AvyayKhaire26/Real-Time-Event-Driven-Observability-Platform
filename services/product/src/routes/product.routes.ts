import { Router } from "express";
import { ProductController } from "../controllers/ProductController";

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  router.get("/", (req, res) => controller.getAllProducts(req, res));
  router.get("/:id", (req, res) => controller.getProductById(req, res));
  router.post("/", (req, res) => controller.createProduct(req, res));
  router.put("/:id", (req, res) => controller.updateProduct(req, res));
  router.delete("/:id", (req, res) => controller.deleteProduct(req, res));
  router.get("/:id/inventory", (req, res) => controller.checkInventory(req, res));

  return router;
}