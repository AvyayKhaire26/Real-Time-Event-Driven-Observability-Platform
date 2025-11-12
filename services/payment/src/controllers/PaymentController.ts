import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { IPaymentService } from "../services/PaymentService";
import { ILogger, TYPES } from "@observability/core";
import { PaymentError } from "../utils/payment.utils";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class PaymentController {
  constructor(
    @inject("PaymentService") private paymentService: IPaymentService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  private getTraceId(req: Request): string {
    return (
      (req.headers["x-trace-id"] as string) ||
      (req.headers["X-Trace-Id"] as string) ||
      uuidv4()
    );
  }

  async processPayment(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      this.logger.info("Payment process request", { traceId, body: req.body });
      const payment = await this.paymentService.processPayment(req.body, traceId);
      res.status(201).json({
        success: true,
        data: payment,
        traceId,
        message: "Payment processed successfully"
      });
    } catch (error) {
      if (error instanceof PaymentError) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: error.code,
          traceId
        });
      } else {
        this.handleError(res, error as Error, "Payment processing failed", traceId);
      }
    }
  }

  async getPaymentById(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      const { id } = req.params;
      this.logger.info("Get payment by id", { traceId, id });
      const payment = await this.paymentService.getPaymentById(id, traceId);
      if (!payment) {
        res.status(404).json({
          success: false,
          message: "Payment not found",
          traceId
        });
        return;
      }
      res.json({
        success: true,
        data: payment,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch payment", traceId);
    }
  }

  async getPaymentByOrderId(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      const { orderId } = req.params;
      this.logger.info("Get payment by order id", { traceId, orderId });
      const payment = await this.paymentService.getPaymentByOrderId(orderId, traceId);
      if (!payment) {
        res.status(404).json({
          success: false,
          message: "Payment not found for this order",
          traceId
        });
        return;
      }
      res.json({
        success: true,
        data: payment,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch payment", traceId);
    }
  }

  async getAllPayments(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      this.logger.info("Get all payments", { traceId });
      const payments = await this.paymentService.getAllPayments(traceId);
      res.json({
        success: true,
        data: payments,
        count: payments.length,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch payments", traceId);
    }
  }

  private handleError(res: Response, error: Error, message: string, traceId: string): void {
    this.logger.error(message, error, { traceId, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message,
      error: error.message,
      traceId
    });
  }
}
