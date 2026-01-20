package org.observability.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.observability.dto.ApiResponse;
import org.observability.dto.CreateOrderDto;
import org.observability.entity.Order;
import org.observability.enums.OrderStatus;
import org.observability.service.EventPublisher;
import org.observability.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Logger logger = LoggerFactory.getLogger(OrderController.class);

    private final OrderService orderService;
    private final EventPublisher eventPublisher;

    @Autowired
    public OrderController(OrderService orderService, EventPublisher eventPublisher) {
        this.orderService = orderService;
        this.eventPublisher = eventPublisher;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Order>> createOrder(
            @Valid @RequestBody CreateOrderDto orderDto,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Create order request - TraceId: {}, UserId: {}", traceId, orderDto.getUserId());

            Order order = orderService.createOrder(orderDto, traceId);

            ApiResponse<Order> response = ApiResponse.success(
                    order,
                    "Order created successfully",
                    traceId
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to create order", traceId, Map.of("userId", orderDto.getUserId()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Order>> getOrderById(
            @PathVariable UUID id,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Get order by ID - TraceId: {}, OrderId: {}", traceId, id);

            Optional<Order> order = orderService.getOrderById(id, traceId);

            if (order.isEmpty()) {
                ApiResponse<Order> response = ApiResponse.error(
                        "Order not found",
                        "No order found with ID: " + id,
                        traceId
                );
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            ApiResponse<Order> response = ApiResponse.success(
                    order.get(),
                    null,
                    traceId
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch order", traceId, Map.of("orderId", id));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Order>>> getUserOrders(
            @PathVariable String userId,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Get user orders - TraceId: {}, UserId: {}", traceId, userId);

            List<Order> orders = orderService.getUserOrders(userId, traceId);

            ApiResponse<List<Order>> response = ApiResponse.success(
                    orders,
                    null,
                    traceId
            );
            response.setCount(orders.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch user orders", traceId, Map.of("userId", userId));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Order>>> getAllOrders(HttpServletRequest request) {
        String traceId = getTraceId(request);

        try {
            logger.info("Get all orders - TraceId: {}", traceId);

            List<Order> orders = orderService.getAllOrders(traceId);

            ApiResponse<List<Order>> response = ApiResponse.success(
                    orders,
                    null,
                    traceId
            );
            response.setCount(orders.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch orders", traceId, Map.of());
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Order>> updateOrderStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            String statusStr = body.get("status");
            OrderStatus status = OrderStatus.valueOf(statusStr);

            logger.info("Update order status - TraceId: {}, OrderId: {}, Status: {}", traceId, id, status);

            Order order = orderService.updateOrderStatus(id, status, traceId);

            ApiResponse<Order> response = ApiResponse.success(
                    order,
                    "Order status updated successfully",
                    traceId
            );

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return emitErrorAndRespond(e, "Invalid order status", traceId, Map.of("orderId", id, "status", body.get("status")));
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to update order status", traceId, Map.of("orderId", id));
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

        eventPublisher.publishEvent("order.error", errorPayload, traceId);

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
