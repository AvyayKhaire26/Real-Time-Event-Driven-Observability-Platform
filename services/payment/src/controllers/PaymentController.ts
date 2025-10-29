import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { IPaymentService } from "../services/PaymentService";
import { ILogger, TYPES } from "@observability/core";
import { PaymentError } from "../utils/payment.utils";

@injectable()
export class PaymentController {
  constructor(
    @inject("PaymentService") private paymentService: IPaymentService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async processPayment(req: Request, res: Response): Promise<void> {
    try {
      const payment = await this.paymentService.processPayment(req.body);
      res.status(201).json({
        success: true,
        data: payment,
        message: "Payment processed successfully"
      });
    } catch (error) {
      if (error instanceof PaymentError) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: error.code
        });
      } else {
        this.handleError(res, error as Error, "Payment processing failed");
      }
    }
  }

  async getPaymentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const payment = await this.paymentService.getPaymentById(id);
      
      if (!payment) {
        res.status(404).json({
          success: false,
          message: "Payment not found"
        });
        return;
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch payment");
    }
  }

  async getPaymentByOrderId(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const payment = await this.paymentService.getPaymentByOrderId(orderId);
      
      if (!payment) {
        res.status(404).json({
          success: false,
          message: "Payment not found for this order"
        });
        return;
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch payment");
    }
  }

  async getAllPayments(req: Request, res: Response): Promise<void> {
    try {
      const payments = await this.paymentService.getAllPayments();
      res.json({
        success: true,
        data: payments,
        count: payments.length
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch payments");
    }
  }

  private handleError(res: Response, error: Error, message: string): void {
    this.logger.error(message, error);
    res.status(500).json({
      success: false,
      message,
      error: error.message
    });
  }
}