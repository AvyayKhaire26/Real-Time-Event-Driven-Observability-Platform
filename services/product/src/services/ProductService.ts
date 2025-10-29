import { injectable, inject } from "inversify";
import { IProductRepository } from "../repositories/ProductRepository";
import { Product } from "../entities/Product.entity";
import { ILogger, TYPES } from "@observability/core";

export interface IProductService {
  getAllProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  createProduct(productData: Partial<Product>): Promise<Product>;
  updateProduct(id: string, productData: Partial<Product>): Promise<Product | null>;
  deleteProduct(id: string): Promise<boolean>;
  checkInventory(productId: string, quantity: number): Promise<boolean>;
}

@injectable()
export class ProductService implements IProductService {
  constructor(
    @inject("ProductRepository") private productRepo: IProductRepository,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async getAllProducts(): Promise<Product[]> {
    try {
      this.logger.info("Fetching all products");
      return await this.productRepo.findAll();
    } catch (error) {
      this.logger.error("Error fetching products", error as Error);
      throw error;
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      this.logger.info(`Fetching product with id: ${id}`);
      return await this.productRepo.findById(id);
    } catch (error) {
      this.logger.error(`Error fetching product ${id}`, error as Error);
      throw error;
    }
  }

  async createProduct(productData: Partial<Product>): Promise<Product> {
    try {
      this.validateProductData(productData);
      this.logger.info("Creating new product", { name: productData.name });
      return await this.productRepo.create(productData);
    } catch (error) {
      this.logger.error("Error creating product", error as Error);
      throw error;
    }
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product | null> {
    try {
      this.logger.info(`Updating product ${id}`);
      return await this.productRepo.update(id, productData);
    } catch (error) {
      this.logger.error(`Error updating product ${id}`, error as Error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      this.logger.info(`Deleting product ${id}`);
      return await this.productRepo.delete(id);
    } catch (error) {
      this.logger.error(`Error deleting product ${id}`, error as Error);
      throw error;
    }
  }

  async checkInventory(productId: string, quantity: number): Promise<boolean> {
    try {
      return await this.productRepo.checkStock(productId, quantity);
    } catch (error) {
      this.logger.error(`Error checking inventory for ${productId}`, error as Error);
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