import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { IProductService } from "../services/ProductService";
import { ILogger, TYPES } from "@observability/core";

@injectable()
export class ProductController {
  constructor(
    @inject("ProductService") private productService: IProductService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const products = await this.productService.getAllProducts();
      res.json({
        success: true,
        data: products,
        count: products.length
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch products");
    }
  }

  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const product = await this.productService.getProductById(id);
      
      if (!product) {
        res.status(404).json({
          success: false,
          message: "Product not found"
        });
        return;
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch product");
    }
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await this.productService.createProduct(req.body);
      res.status(201).json({
        success: true,
        data: product,
        message: "Product created successfully"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to create product");
    }
  }

  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const product = await this.productService.updateProduct(id, req.body);
      
      if (!product) {
        res.status(404).json({
          success: false,
          message: "Product not found"
        });
        return;
      }

      res.json({
        success: true,
        data: product,
        message: "Product updated successfully"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to update product");
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.productService.deleteProduct(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Product not found"
        });
        return;
      }

      res.json({
        success: true,
        message: "Product deleted successfully"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to delete product");
    }
  }

  async checkInventory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { quantity } = req.query;
      
      const available = await this.productService.checkInventory(
        id,
        parseInt(quantity as string) || 1
      );

      res.json({
        success: true,
        available
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to check inventory");
    }
  }

  private handleError(res: Response, error: Error, message: string): void {
    this.logger.error(message, error);
    res.status(500).json({
      success: false,
      message,
      error: error.message
    });
  }
}