import { injectable } from "inversify";
import { Repository } from "typeorm";
import { Product } from "../entities/Product.entity";
import { IDatabaseConnection } from "@observability/common";

export interface IProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  create(productData: Partial<Product>): Promise<Product>;
  update(id: string, productData: Partial<Product>): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
  checkStock(productId: string, quantity: number): Promise<boolean>;
  decrementStock(productId: string, quantity: number): Promise<void>;
}

@injectable()
export class ProductRepository implements IProductRepository {
  private dbConnection: IDatabaseConnection;

  constructor(dbConnection: IDatabaseConnection) {
    this.dbConnection = dbConnection;
  }

  private getRepository(): Repository<Product> {
    return this.dbConnection.getDataSource().getRepository(Product);
  }

  async findAll(): Promise<Product[]> {
    return await this.getRepository().find({ where: { isActive: true } });
  }

  async findById(id: string): Promise<Product | null> {
    return await this.getRepository().findOne({ where: { id, isActive: true } });
  }

  async create(productData: Partial<Product>): Promise<Product> {
    const repo = this.getRepository();
    const product = repo.create(productData);
    return await repo.save(product);
  }

  async update(id: string, productData: Partial<Product>): Promise<Product | null> {
    await this.getRepository().update(id, productData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.getRepository().update(id, { isActive: false });
    return result.affected ? result.affected > 0 : false;
  }

  async checkStock(productId: string, quantity: number): Promise<boolean> {
    const product = await this.findById(productId);
    return product ? product.stock >= quantity : false;
  }

  async decrementStock(productId: string, quantity: number): Promise<void> {
    await this.getRepository().decrement({ id: productId }, "stock", quantity);
  }
}