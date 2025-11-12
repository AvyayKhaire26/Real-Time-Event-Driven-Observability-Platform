import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { IProductService } from "../services/ProductService";
import { ILogger, TYPES } from "@observability/core";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class ProductController {
  constructor(
    @inject("ProductService") private productService: IProductService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  private getTraceId(req: Request): string {
    return (
      (req.headers["x-trace-id"] as string) ||
      (req.headers["X-Trace-Id"] as string) ||
      uuidv4()
    );
  }

  async getAllProducts(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      this.logger.info("Get all products", { traceId });
      const products = await this.productService.getAllProducts(traceId);
      res.json({
        success: true,
        data: products,
        count: products.length,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch products", traceId);
    }
  }

  async getProductById(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      const { id } = req.params;
      this.logger.info("Get product by id", { traceId, id });
      const product = await this.productService.getProductById(id, traceId);
      if (!product) {
        res.status(404).json({
          success: false,
          message: "Product not found",
          traceId
        });
        return;
      }
      res.json({
        success: true,
        data: product,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch product", traceId);
    }
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      this.logger.info("Create product request", { traceId, body: req.body });
      const product = await this.productService.createProduct(req.body, traceId);
      res.status(201).json({
        success: true,
        data: product,
        traceId,
        message: "Product created successfully"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to create product", traceId);
    }
  }

  async updateProduct(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      const { id } = req.params;
      this.logger.info("Update product request", { traceId, id, body: req.body });
      const product = await this.productService.updateProduct(id, req.body, traceId);
      if (!product) {
        res.status(404).json({
          success: false,
          message: "Product not found",
          traceId
        });
        return;
      }
      res.json({
        success: true,
        data: product,
        traceId,
        message: "Product updated successfully"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to update product", traceId);
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      const { id } = req.params;
      this.logger.info("Delete product request", { traceId, id });
      const deleted = await this.productService.deleteProduct(id, traceId);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Product not found",
          traceId
        });
        return;
      }
      res.json({
        success: true,
        traceId,
        message: "Product deleted successfully"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to delete product", traceId);
    }
  }

  async checkInventory(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      const { id } = req.params;
      const { quantity } = req.query;
      this.logger.info("Check inventory request", { traceId, id, quantity });
      const available = await this.productService.checkInventory(
        id,
        parseInt(quantity as string) || 1,
        traceId
      );
      res.json({
        success: true,
        available,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to check inventory", traceId);
    }
  }

  private handleError(res: Response, error: Error, message: string, traceId: string): void {
    this.logger.error(message, error, { traceId, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message,
      error: error.message,
      traceId
    });
  }
}
