import { injectable, inject } from "inversify";
import { IProductRepository } from "../repositories/ProductRepository";
import { Product } from "../entities/Product.entity";
import { ILogger, TYPES } from "@observability/core";

export interface IProductService {
  getAllProducts(traceId?: string): Promise<Product[]>;
  getProductById(id: string, traceId?: string): Promise<Product | null>;
  createProduct(productData: Partial<Product>, traceId?: string): Promise<Product>;
  updateProduct(id: string, productData: Partial<Product>, traceId?: string): Promise<Product | null>;
  deleteProduct(id: string, traceId?: string): Promise<boolean>;
  checkInventory(productId: string, quantity: number, traceId?: string): Promise<boolean>;
}

@injectable()
export class ProductService implements IProductService {
  constructor(
    @inject("ProductRepository") private productRepo: IProductRepository,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async getAllProducts(traceId?: string): Promise<Product[]> {
    try {
      this.logger.info("Fetching all products", { traceId });
      return await this.productRepo.findAll();
    } catch (error) {
      this.logger.error("Error fetching products", error as Error, { traceId, error: (error as Error).message, stack: (error as Error).stack });
      throw error;
    }
  }

  async getProductById(id: string, traceId?: string): Promise<Product | null> {
    try {
      this.logger.info("Fetching product by id", { traceId, id });
      return await this.productRepo.findById(id);
    } catch (error) {
      this.logger.error("Error fetching product", error as Error, { traceId, id, error: (error as Error).message, stack: (error as Error).stack });
      throw error;
    }
  }

  async createProduct(productData: Partial<Product>, traceId?: string): Promise<Product> {
    try {
      this.validateProductData(productData);
      this.logger.info("Creating new product", { traceId, name: productData.name });
      return await this.productRepo.create(productData);
    } catch (error) {
      this.logger.error("Error creating product", error as Error, { traceId, productData, error: (error as Error).message, stack: (error as Error).stack });
      throw error;
    }
  }

  async updateProduct(id: string, productData: Partial<Product>, traceId?: string): Promise<Product | null> {
    try {
      this.logger.info("Updating product", { traceId, id, productData });
      return await this.productRepo.update(id, productData);
    } catch (error) {
      this.logger.error("Error updating product", error as Error, { traceId, id, productData, error: (error as Error).message, stack: (error as Error).stack });
      throw error;
    }
  }

  async deleteProduct(id: string, traceId?: string): Promise<boolean> {
    try {
      this.logger.info("Deleting product", { traceId, id });
      return await this.productRepo.delete(id);
    } catch (error) {
      this.logger.error("Error deleting product", error as Error, { traceId, id, error: (error as Error).message, stack: (error as Error).stack });
      throw error;
    }
  }

  async checkInventory(productId: string, quantity: number, traceId?: string): Promise<boolean> {
    try {
      this.logger.info("Checking inventory", { traceId, productId, quantity });
      return await this.productRepo.checkStock(productId, quantity);
    } catch (error) {
      this.logger.error("Error checking inventory", error as Error, { traceId, productId, quantity, error: (error as Error).message, stack: (error as Error).stack });
      throw error;
    }
  }

  private validateProductData(data: Partial<Product>): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Product name is required");
    }
    if (data.price !== undefined && data.price < 0) {
      throw new Error("Product price cannot be negative");
    }
    if (data.stock !== undefined && data.stock < 0) {
      throw new Error("Product stock cannot be negative");
    }
  }
}
