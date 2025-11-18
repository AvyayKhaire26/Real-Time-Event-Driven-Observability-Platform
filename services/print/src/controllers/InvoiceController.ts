import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { IInvoiceService } from "../services/InvoiceService";
import { ILogger, TYPES } from "@observability/core";
import { v4 as uuidv4 } from "uuid";
import { EventPublisher } from "@observability/common";

@injectable()
export class InvoiceController {
    constructor(
        @inject("InvoiceService") private invoiceService: IInvoiceService,
        @inject(TYPES.Logger) private logger: ILogger,
        @inject("EventPublisher") private eventPublisher: EventPublisher
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
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to generate invoice", traceId, req.body);
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
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to fetch invoice", traceId, { id: req.params.id });
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
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to fetch invoice", traceId, { orderId: req.params.orderId });
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
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to fetch invoices", traceId, {});
        }
    }

    private async emitErrorAndRespond(
        res: Response,
        error: Error,
        message: string,
        traceId: string,
        context?: any
    ): Promise<void> {
        this.logger.error(message, error, { traceId, error: error.message, stack: error.stack, ...context });

        this.eventPublisher.publishEvent(
            "invoice.error",
            {
                message,
                error: error.message,
                stack: error.stack,
                context
            },
            traceId
        ).catch((publishErr) => {
            this.logger.error("Failed to publish error event", publishErr, { traceId });
        });

        res.status(500).json({
            success: false,
            message,
            error: error.message,
            traceId
        });
    }
}
