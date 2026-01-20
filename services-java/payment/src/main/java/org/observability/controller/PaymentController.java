package org.observability.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.observability.dto.ApiResponse;
import org.observability.dto.ProcessPaymentDto;
import org.observability.entity.Payment;
import org.observability.exception.PaymentException;
import org.observability.service.EventPublisher;
import org.observability.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;
    private final EventPublisher eventPublisher;

    @Autowired
    public PaymentController(PaymentService paymentService, EventPublisher eventPublisher) {
        this.paymentService = paymentService;
        this.eventPublisher = eventPublisher;
    }

    @PostMapping("/process")
    public ResponseEntity<ApiResponse<Payment>> processPayment(
            @Valid @RequestBody ProcessPaymentDto paymentDto,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Process payment request - TraceId: {}, OrderId: {}", traceId, paymentDto.getOrderId());

            Payment payment = paymentService.processPayment(paymentDto, traceId);

            ApiResponse<Payment> response = ApiResponse.success(
                    payment,
                    "Payment processed successfully",
                    traceId
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (PaymentException e) {
            return emitErrorAndRespond(e, "Payment failed", traceId, Map.of("orderId", paymentDto.getOrderId(), "code", e.getCode()));
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to process payment", traceId, Map.of("orderId", paymentDto.getOrderId()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Payment>> getPaymentById(
            @PathVariable UUID id,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Get payment by ID - TraceId: {}, PaymentId: {}", traceId, id);

            Optional<Payment> payment = paymentService.getPaymentById(id, traceId);

            if (payment.isEmpty()) {
                ApiResponse<Payment> response = ApiResponse.error(
                        "Payment not found",
                        "No payment found with ID: " + id,
                        traceId
                );
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            ApiResponse<Payment> response = ApiResponse.success(
                    payment.get(),
                    null,
                    traceId
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch payment", traceId, Map.of("paymentId", id));
        }
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<Payment>> getPaymentByOrderId(
            @PathVariable UUID orderId,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Get payment by OrderId - TraceId: {}, OrderId: {}", traceId, orderId);

            Optional<Payment> payment = paymentService.getPaymentByOrderId(orderId, traceId);

            if (payment.isEmpty()) {
                ApiResponse<Payment> response = ApiResponse.error(
                        "Payment not found",
                        "No payment found for order ID: " + orderId,
                        traceId
                );
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            ApiResponse<Payment> response = ApiResponse.success(
                    payment.get(),
                    null,
                    traceId
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch payment", traceId, Map.of("orderId", orderId));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Payment>>> getAllPayments(HttpServletRequest request) {
        String traceId = getTraceId(request);

        try {
            logger.info("Get all payments - TraceId: {}", traceId);

            List<Payment> payments = paymentService.getAllPayments(traceId);

            ApiResponse<List<Payment>> response = ApiResponse.success(
                    payments,
                    null,
                    traceId
            );
            response.setCount(payments.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch payments", traceId, Map.of());
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

        eventPublisher.publishEvent("payment.error", errorPayload, traceId);

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
