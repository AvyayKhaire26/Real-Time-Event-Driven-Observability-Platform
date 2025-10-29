import { injectable } from "inversify";
import { Repository } from "typeorm";
import { Payment } from "../entities/Payment.entity";
import { IDatabaseConnection } from "@observability/common";
import { PaymentStatus } from "../utils/payment.utils";

export interface IPaymentRepository {
  findAll(): Promise<Payment[]>;
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  findByTransactionId(transactionId: string): Promise<Payment | null>;
  create(paymentData: Partial<Payment>): Promise<Payment>;
  updateStatus(id: string, status: PaymentStatus, failureReason?: string): Promise<Payment | null>;
}

@injectable()
export class PaymentRepository implements IPaymentRepository {
  private dbConnection: IDatabaseConnection;

  constructor(dbConnection: IDatabaseConnection) {
    this.dbConnection = dbConnection;
  }

  private getRepository(): Repository<Payment> {
    return this.dbConnection.getDataSource().getRepository(Payment);
  }

  async findAll(): Promise<Payment[]> {
    return await this.getRepository().find({ order: { createdAt: "DESC" } });
  }

  async findById(id: string): Promise<Payment | null> {
    return await this.getRepository().findOne({ where: { id } });
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return await this.getRepository().findOne({ where: { orderId } });
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    return await this.getRepository().findOne({ where: { transactionId } });
  }

  async create(paymentData: Partial<Payment>): Promise<Payment> {
    const repo = this.getRepository();
    const payment = repo.create(paymentData);
    return await repo.save(payment);
  }

  async updateStatus(id: string, status: PaymentStatus, failureReason?: string): Promise<Payment | null> {
    await this.getRepository().update(id, { status, failureReason });
    return await this.findById(id);
  }
}