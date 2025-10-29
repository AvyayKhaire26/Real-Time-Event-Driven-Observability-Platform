import { injectable } from "inversify";
import { Repository } from "typeorm";
import { Order } from "../entities/Order.entity";
import { IDatabaseConnection } from "@observability/common";
import { OrderStatus } from "../utils/order.utils";

export interface IOrderRepository {
  findAll(): Promise<Order[]>;
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string): Promise<Order[]>;
  create(orderData: Partial<Order>): Promise<Order>;
  updateStatus(id: string, status: OrderStatus): Promise<Order | null>;
  updatePaymentId(id: string, paymentId: string): Promise<void>;
  updateInvoiceId(id: string, invoiceId: string): Promise<void>;
}

@injectable()
export class OrderRepository implements IOrderRepository {
  private dbConnection: IDatabaseConnection;

  constructor(dbConnection: IDatabaseConnection) {
    this.dbConnection = dbConnection;
  }

  private getRepository(): Repository<Order> {
    return this.dbConnection.getDataSource().getRepository(Order);
  }

  async findAll(): Promise<Order[]> {
    return await this.getRepository().find({ order: { createdAt: "DESC" } });
  }

  async findById(id: string): Promise<Order | null> {
    return await this.getRepository().findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return await this.getRepository().find({ 
      where: { userId },
      order: { createdAt: "DESC" }
    });
  }

  async create(orderData: Partial<Order>): Promise<Order> {
    const repo = this.getRepository();
    const order = repo.create(orderData);
    return await repo.save(order);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    await this.getRepository().update(id, { status });
    return await this.findById(id);
  }

  async updatePaymentId(id: string, paymentId: string): Promise<void> {
    await this.getRepository().update(id, { paymentId });
  }

  async updateInvoiceId(id: string, invoiceId: string): Promise<void> {
    await this.getRepository().update(id, { invoiceId });
  }
}