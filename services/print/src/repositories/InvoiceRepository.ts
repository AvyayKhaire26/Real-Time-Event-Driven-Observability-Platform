import { injectable } from "inversify";
import { Repository } from "typeorm";
import { Invoice } from "../entities/Invoice.entity";
import { IDatabaseConnection } from "@observability/common";
import { InvoiceStatus } from "../utils/invoice.utils";

export interface IInvoiceRepository {
  findAll(): Promise<Invoice[]>;
  findById(id: string): Promise<Invoice | null>;
  findByOrderId(orderId: string): Promise<Invoice | null>;
  findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null>;
  create(invoiceData: Partial<Invoice>): Promise<Invoice>;
  updateStatus(id: string, status: InvoiceStatus): Promise<Invoice | null>;
}

@injectable()
export class InvoiceRepository implements IInvoiceRepository {
  private dbConnection: IDatabaseConnection;

  constructor(dbConnection: IDatabaseConnection) {
    this.dbConnection = dbConnection;
  }

  private getRepository(): Repository<Invoice> {
    return this.dbConnection.getDataSource().getRepository(Invoice);
  }

  async findAll(): Promise<Invoice[]> {
    return await this.getRepository().find({ order: { createdAt: "DESC" } });
  }

  async findById(id: string): Promise<Invoice | null> {
    return await this.getRepository().findOne({ where: { id } });
  }

  async findByOrderId(orderId: string): Promise<Invoice | null> {
    return await this.getRepository().findOne({ where: { orderId } });
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    return await this.getRepository().findOne({ where: { invoiceNumber } });
  }

  async create(invoiceData: Partial<Invoice>): Promise<Invoice> {
    const repo = this.getRepository();
    const invoice = repo.create(invoiceData);
    return await repo.save(invoice);
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice | null> {
    await this.getRepository().update(id, { status });
    return await this.findById(id);
  }
}