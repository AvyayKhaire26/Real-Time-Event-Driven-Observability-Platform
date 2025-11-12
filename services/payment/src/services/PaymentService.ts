import { injectable, inject } from "inversify";
import { IPaymentRepository } from "../repositories/PaymentRepository";
import { Payment } from "../entities/Payment.entity";
import { ILogger, TYPES } from "@observability/core";
import {
  ProcessPaymentDto,
  PaymentStatus,
  PaymentError,
  PaymentSimulator,
} from "../utils/payment.utils";
import { randomUUID } from "crypto";

export interface IPaymentService {
  processPayment(paymentDto: ProcessPaymentDto, traceId?: string): Promise<Payment>;
  getPaymentById(id: string, traceId?: string): Promise<Payment | null>;
  getPaymentByOrderId(orderId: string, traceId?: string): Promise<Payment | null>;
  getAllPayments(traceId?: string): Promise<Payment[]>;
}

@injectable()
export class PaymentService implements IPaymentService {
  constructor(
    @inject("PaymentRepository") private paymentRepo: IPaymentRepository,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async processPayment(paymentDto: ProcessPaymentDto, traceId?: string): Promise<Payment> {
    const startTime = Date.now();
    const transactionId = `TXN-${randomUUID()}`;
    try {
      this.logger.info("Processing payment", { traceId, transactionId, orderId: paymentDto.orderId, amount: paymentDto.amount });
      const payment = await this.paymentRepo.create({
        orderId: paymentDto.orderId,
        transactionId,
        amount: paymentDto.amount,
        currency: paymentDto.currency,
        method: paymentDto.method,
        customerDetails: paymentDto.customerDetails,
        status: PaymentStatus.PROCESSING,
        processingTimeMs: 0,
      });
      const delay = PaymentSimulator.simulateProcessingDelay();
      await this.sleep(delay);
      if (PaymentSimulator.shouldSimulateFailure()) {
        return await this.handlePaymentFailure(payment.id, startTime, traceId);
      }
      const processingTime = Date.now() - startTime;
      const updatedPayment = await this.paymentRepo.updateStatus(payment.id, PaymentStatus.SUCCESS);
      await this.updateProcessingTime(payment.id, processingTime);
      this.logger.info("Payment successful", { traceId, processingTime, transactionId, orderId: paymentDto.orderId });
      return updatedPayment!;
    } catch (error) {
      this.logger.error("Payment processing error", error as Error, { traceId, transactionId, error: (error as Error).message, stack: (error as Error).stack });
      throw error;
    }
  }

  async getPaymentById(id: string, traceId?: string): Promise<Payment | null> {
    this.logger.info("Get payment by id", { traceId, id });
    return await this.paymentRepo.findById(id);
  }

  async getPaymentByOrderId(orderId: string, traceId?: string): Promise<Payment | null> {
    this.logger.info("Get payment by orderId", { traceId, orderId });
    return await this.paymentRepo.findByOrderId(orderId);
  }

  async getAllPayments(traceId?: string): Promise<Payment[]> {
    this.logger.info("Get all payments", { traceId });
    return await this.paymentRepo.findAll();
  }

  private async handlePaymentFailure(paymentId: string, startTime: number, traceId?: string): Promise<Payment> {
    const failureReason = PaymentSimulator.getRandomFailureReason();
    const processingTime = Date.now() - startTime;
    this.logger.warn("Payment failed", { traceId, paymentId, reason: failureReason });
    const payment = await this.paymentRepo.updateStatus(paymentId, PaymentStatus.FAILED, failureReason);
    await this.updateProcessingTime(paymentId, processingTime);
    throw new PaymentError(failureReason, "PAYMENT_FAILED");
  }

  private async updateProcessingTime(paymentId: string, timeMs: number): Promise<void> {
    const repo = this.paymentRepo as any;
    const payment = await this.paymentRepo.findById(paymentId);
    if (payment) {
      payment.processingTimeMs = timeMs;
      await repo.getRepository().save(payment);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
