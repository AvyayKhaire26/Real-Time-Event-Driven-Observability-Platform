import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { IInvoiceService } from "../services/InvoiceService";
import { ILogger, TYPES } from "@observability/core";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class InvoiceController {
  constructor(
    @inject("InvoiceService") private invoiceService: IInvoiceService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  private getTraceId(req: Request): string {
    return (
      (req.headers["x-trace-id"] as string) ||
      (req.headers["X-Trace-Id"] as string) ||
      uuidv4()
    );
  }

  async generateInvoice(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      const { orderId, paymentId } = req.body;
      this.logger.info("Generate invoice request", { traceId, orderId, paymentId });
      if (!orderId || !paymentId) {
        res.status(400).json({
          success: false,
          message: "orderId and paymentId are required",
          traceId
        });
        return;
      }
      const invoice = await this.invoiceService.generateInvoice(orderId, paymentId, traceId);
      res.status(201).json({
        success: true,
        data: invoice,
        traceId,
        message: "Invoice generated successfully"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to generate invoice", traceId);
    }
  }

  async getInvoiceById(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      const { id } = req.params;
      this.logger.info("Get invoice by id", { traceId, id });
      const invoice = await this.invoiceService.getInvoiceById(id, traceId);
      if (!invoice) {
        res.status(404).json({
          success: false,
          message: "Invoice not found",
          traceId
        });
        return;
      }
      res.json({
        success: true,
        data: invoice,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch invoice", traceId);
    }
  }

  async getInvoiceByOrderId(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      const { orderId } = req.params;
      this.logger.info("Get invoice by orderId", { traceId, orderId });
      const invoice = await this.invoiceService.getInvoiceByOrderId(orderId, traceId);
      if (!invoice) {
        res.status(404).json({
          success: false,
          message: "Invoice not found for this order",
          traceId
        });
        return;
      }
      res.json({
        success: true,
        data: invoice,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch invoice", traceId);
    }
  }

  async getAllInvoices(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      this.logger.info("Get all invoices", { traceId });
      const invoices = await this.invoiceService.getAllInvoices(traceId);
      res.json({
        success: true,
        data: invoices,
        count: invoices.length,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch invoices", traceId);
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
