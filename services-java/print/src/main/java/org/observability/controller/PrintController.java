package org.observability.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.observability.dto.ApiResponse;
import org.observability.dto.GeneratePrintDto;
import org.observability.entity.Print;
import org.observability.service.EventPublisher;
import org.observability.service.PrintService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/invoices")
public class PrintController {

    private static final Logger logger = LoggerFactory.getLogger(PrintController.class);

    private final PrintService printService;
    private final EventPublisher eventPublisher;

    @Autowired
    public PrintController(PrintService printService, EventPublisher eventPublisher) {
        this.printService = printService;
        this.eventPublisher = eventPublisher;
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<Print>> generateInvoice(
            @Valid @RequestBody GeneratePrintDto dto,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Generate invoice request - TraceId: {}, OrderId: {}", traceId, dto.getOrderId());

            Print invoice = printService.generateInvoice(dto, traceId);

            ApiResponse<Print> response = ApiResponse.success(
                    invoice,
                    "Invoice generated successfully",
                    traceId
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to generate invoice", traceId,
                    Map.of("orderId", dto.getOrderId(), "paymentId", dto.getPaymentId()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Print>> getInvoiceById(
            @PathVariable UUID id,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Get invoice by ID - TraceId: {}, InvoiceId: {}", traceId, id);

            Optional<Print> invoice = printService.getInvoiceById(id, traceId);

            if (invoice.isEmpty()) {
                ApiResponse<Print> response = ApiResponse.error(
                        "Invoice not found",
                        "No invoice found with ID: " + id,
                        traceId
                );
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            ApiResponse<Print> response = ApiResponse.success(
                    invoice.get(),
                    null,
                    traceId
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch invoice", traceId, Map.of("invoiceId", id));
        }
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<Print>> getInvoiceByOrderId(
            @PathVariable UUID orderId,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Get invoice by OrderId - TraceId: {}, OrderId: {}", traceId, orderId);

            Optional<Print> invoice = printService.getInvoiceByOrderId(orderId, traceId);

            if (invoice.isEmpty()) {
                ApiResponse<Print> response = ApiResponse.error(
                        "Invoice not found",
                        "No invoice found for order ID: " + orderId,
                        traceId
                );
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            ApiResponse<Print> response = ApiResponse.success(
                    invoice.get(),
                    null,
                    traceId
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch invoice", traceId, Map.of("orderId", orderId));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Print>>> getAllInvoices(HttpServletRequest request) {
        String traceId = getTraceId(request);

        try {
            logger.info("Get all invoices - TraceId: {}", traceId);

            List<Print> invoices = printService.getAllInvoices(traceId);

            ApiResponse<List<Print>> response = ApiResponse.success(
                    invoices,
                    null,
                    traceId
            );
            response.setCount(invoices.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch invoices", traceId, Map.of());
        }
    }

    private String getTraceId(HttpServletRequest request) {
        String traceId = request.getHeader("x-trace-id");
        if (traceId == null || traceId.isEmpty()) {
            traceId = request.getHeader("X-Trace-Id");
        }
        if (traceId == null || traceId.isEmpty()) {
            traceId = UUID.randomUUID().toString();
        }
        return traceId;
    }

    private <T> ResponseEntity<ApiResponse<T>> emitErrorAndRespond(
            Exception e,
            String message,
            String traceId,
            Map<String, Object> context) {

        logger.error("{} - TraceId: {}, Error: {}", message, traceId, e.getMessage(), e);

        // Publish error event to RabbitMQ
        Map<String, Object> errorPayload = new HashMap<>();
        errorPayload.put("message", message);
        errorPayload.put("error", e.getMessage());
        errorPayload.put("stack", getStackTrace(e));
        errorPayload.put("context", context);

        eventPublisher.publishEvent("print.error", errorPayload, traceId);

        ApiResponse<T> response = ApiResponse.error(message, e.getMessage(), traceId);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    private String getStackTrace(Exception e) {
        StringBuilder sb = new StringBuilder();
        for (StackTraceElement element : e.getStackTrace()) {
            sb.append(element.toString()).append("\n");
        }
        return sb.toString();
    }
}
