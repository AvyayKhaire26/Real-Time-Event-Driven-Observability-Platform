import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { IInvoiceService } from "../services/InvoiceService";
import { ILogger, TYPES } from "@observability/core";

@injectable()
export class InvoiceController {
  constructor(
    @inject("InvoiceService") private invoiceService: IInvoiceService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async generateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, paymentId } = req.body;
      
      if (!orderId || !paymentId) {
        res.status(400).json({
          success: false,
          message: "orderId and paymentId are required"
        });
        return;
      }

      const invoice = await this.invoiceService.generateInvoice(orderId, paymentId);
      res.status(201).json({
        success: true,
        data: invoice,
        message: "Invoice generated successfully"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to generate invoice");
    }
  }

  async getInvoiceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await this.invoiceService.getInvoiceById(id);
      
      if (!invoice) {
        res.status(404).json({
          success: false,
          message: "Invoice not found"
        });
        return;
      }

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch invoice");
    }
  }

  async getInvoiceByOrderId(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const invoice = await this.invoiceService.getInvoiceByOrderId(orderId);
      
      if (!invoice) {
        res.status(404).json({
          success: false,
          message: "Invoice not found for this order"
        });
        return;
      }

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch invoice");
    }
  }

  async getAllInvoices(req: Request, res: Response): Promise<void> {
    try {
      const invoices = await this.invoiceService.getAllInvoices();
      res.json({
        success: true,
        data: invoices,
        count: invoices.length
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch invoices");
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