import { injectable, inject } from "inversify";
import { IInvoiceRepository } from "../repositories/InvoiceRepository";
import { Invoice } from "../entities/Invoice.entity";
import { ILogger, TYPES } from "@observability/core";
import {
  InvoiceGenerator,
  InvoiceStatus,
  InvoiceData
} from "../utils/invoice.utils";
import axios from "axios";

export interface IInvoiceService {
  generateInvoice(orderId: string, paymentId: string, traceId?: string): Promise<Invoice>;
  getInvoiceById(id: string, traceId?: string): Promise<Invoice | null>;
  getInvoiceByOrderId(orderId: string, traceId?: string): Promise<Invoice | null>;
  getAllInvoices(traceId?: string): Promise<Invoice[]>;
}

@injectable()
export class InvoiceService implements IInvoiceService {
  private orderServiceUrl: string;
  private paymentServiceUrl: string;

  constructor(
    @inject("InvoiceRepository") private invoiceRepo: IInvoiceRepository,
    @inject(TYPES.Logger) private logger: ILogger
  ) {
    this.orderServiceUrl = process.env.ORDER_SERVICE_URL || "http://localhost:3002";
    this.paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || "http://localhost:3003";
  }

  async generateInvoice(orderId: string, paymentId: string, traceId?: string): Promise<Invoice> {
    try {
      this.logger.info("Generating invoice", { traceId, orderId, paymentId });
      // Check if invoice already exists
      const existingInvoice = await this.invoiceRepo.findByOrderId(orderId);
      if (existingInvoice) {
        this.logger.info("Invoice already exists", { traceId, id: existingInvoice.id });
        return existingInvoice;
      }
      // Fetch order details
      const orderData = await this.fetchOrderDetails(orderId, traceId);
      // Fetch payment details
      const paymentData = await this.fetchPaymentDetails(paymentId, traceId);
      // Prepare invoice data
      const invoiceData: InvoiceData = {
        orderId,
        orderDetails: {
          items: orderData.items,
          totalAmount: orderData.totalAmount
        },
        paymentDetails: {
          transactionId: paymentData.transactionId,
          method: paymentData.method,
          paidAt: paymentData.createdAt
        },
        customerDetails: paymentData.customerDetails
      };
      // Generate invoice content
      const invoiceContent = InvoiceGenerator.generateInvoiceText(invoiceData);
      const invoiceNumber = InvoiceGenerator.generateInvoiceNumber();
      // Save invoice
      const invoice = await this.invoiceRepo.create({
        invoiceNumber,
        orderId,
        paymentId,
        invoiceContent,
        totalAmount: orderData.totalAmount,
        customerDetails: paymentData.customerDetails,
        status: InvoiceStatus.GENERATED
      });
      this.logger.info("Invoice generated successfully", { traceId, invoiceNumber });
      return invoice;
    } catch (error) {
      this.logger.error("Failed to generate invoice", error as Error, { traceId, orderId, paymentId, error: (error as Error).message, stack: (error as Error).stack });
      throw error;
    }
  }

  async getInvoiceById(id: string, traceId?: string): Promise<Invoice | null> {
    this.logger.info("Get invoice by id", { traceId, id });
    return await this.invoiceRepo.findById(id);
  }

  async getInvoiceByOrderId(orderId: string, traceId?: string): Promise<Invoice | null> {
    this.logger.info("Get invoice by orderId", { traceId, orderId });
    return await this.invoiceRepo.findByOrderId(orderId);
  }

  async getAllInvoices(traceId?: string): Promise<Invoice[]> {
    this.logger.info("Get all invoices", { traceId });
    return await this.invoiceRepo.findAll();
  }

  private async fetchOrderDetails(orderId: string, traceId?: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.orderServiceUrl}/api/orders/${orderId}`,
        { headers: { "X-Trace-Id": traceId } }
      );
      return response.data.data;
    } catch (error) {
      this.logger.error("Failed to fetch order", error as Error, { traceId, orderId, error: (error as Error).message, stack: (error as Error).stack });
      throw new Error("Order service unavailable");
    }
  }

  private async fetchPaymentDetails(paymentId: string, traceId?: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.paymentServiceUrl}/api/payments/${paymentId}`,
        { headers: { "X-Trace-Id": traceId } }
      );
      return response.data.data;
    } catch (error) {
      this.logger.error("Failed to fetch payment", error as Error, { traceId, paymentId, error: (error as Error).message, stack: (error as Error).stack });
      throw new Error("Payment service unavailable");
    }
  }
}
