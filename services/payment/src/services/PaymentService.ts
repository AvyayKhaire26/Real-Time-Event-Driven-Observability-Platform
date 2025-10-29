import { injectable, inject } from "inversify";
import { IPaymentRepository } from "../repositories/PaymentRepository";
import { Payment } from "../entities/Payment.entity";
import { ILogger, TYPES } from "@observability/core";
import { 
  ProcessPaymentDto, 
  PaymentStatus, 
  PaymentError,
  PaymentSimulator 
} from "../utils/payment.utils";
import { randomUUID } from "crypto";

export interface IPaymentService {
  processPayment(paymentDto: ProcessPaymentDto): Promise<Payment>;
  getPaymentById(id: string): Promise<Payment | null>;
  getPaymentByOrderId(orderId: string): Promise<Payment | null>;
  getAllPayments(): Promise<Payment[]>;
}

@injectable()
export class PaymentService implements IPaymentService {
  constructor(
    @inject("PaymentRepository") private paymentRepo: IPaymentRepository,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async processPayment(paymentDto: ProcessPaymentDto): Promise<Payment> {
    const startTime = Date.now();
    const transactionId = `TXN-${randomUUID()}`;

    try {
      this.logger.info(`Processing payment for order: ${paymentDto.orderId}`);

      // Create pending payment
      const payment = await this.paymentRepo.create({
        orderId: paymentDto.orderId,
        transactionId,
        amount: paymentDto.amount,
        currency: paymentDto.currency,
        method: paymentDto.method,
        customerDetails: paymentDto.customerDetails,
        status: PaymentStatus.PROCESSING,
        processingTimeMs: 0
      });

      // Simulate payment processing delay
      const delay = PaymentSimulator.simulateProcessingDelay();
      await this.sleep(delay);

      // Simulate random failures (20% failure rate)
      if (PaymentSimulator.shouldSimulateFailure()) {
        return await this.handlePaymentFailure(payment.id, startTime);
      }

      // Success case
      const processingTime = Date.now() - startTime;
      const updatedPayment = await this.paymentRepo.updateStatus(
        payment.id, 
        PaymentStatus.SUCCESS
      );

      await this.updateProcessingTime(payment.id, processingTime);

      this.logger.info(`Payment successful: ${transactionId}`, { 
        processingTime,
        orderId: paymentDto.orderId 
      });

      return updatedPayment!;
    } catch (error) {
      this.logger.error(`Payment processing error: ${transactionId}`, error as Error);
      throw error;
    }
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    return await this.paymentRepo.findById(id);
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return await this.paymentRepo.findByOrderId(orderId);
  }

  async getAllPayments(): Promise<Payment[]> {
    return await this.paymentRepo.findAll();
  }

  private async handlePaymentFailure(paymentId: string, startTime: number): Promise<Payment> {
    const failureReason = PaymentSimulator.getRandomFailureReason();
    const processingTime = Date.now() - startTime;

    this.logger.warn(`Payment failed: ${paymentId}`, { reason: failureReason });

    const payment = await this.paymentRepo.updateStatus(
      paymentId, 
      PaymentStatus.FAILED,
      failureReason
    );

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
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}