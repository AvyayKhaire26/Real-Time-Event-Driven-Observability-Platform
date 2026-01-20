package org.observability.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.observability.dto.ApiResponse;
import org.observability.dto.SendNotificationDto;
import org.observability.entity.Notification;
import org.observability.service.EventPublisher;
import org.observability.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private static final Logger logger = LoggerFactory.getLogger(NotificationController.class);

    private final NotificationService notificationService;
    private final EventPublisher eventPublisher;

    @Autowired
    public NotificationController(NotificationService notificationService, EventPublisher eventPublisher) {
        this.notificationService = notificationService;
        this.eventPublisher = eventPublisher;
    }

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<Notification>> sendNotification(
            @Valid @RequestBody SendNotificationDto notificationDto,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Send notification request - TraceId: {}, Body: {}", traceId, notificationDto);
//
//            Notification notification = notificationService.sendNotification(notificationDto, traceId);
//
//            ApiResponse<Notification> response = ApiResponse.success(
//                    notification,
//                    "Notification sent successfully",
//                    traceId
//            );
//
//            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            throw new Exception("Failed");
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to send notification", traceId, Map.of("body", notificationDto));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Notification>> getNotificationById(
            @PathVariable UUID id,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Get notification by ID - TraceId: {}, ID: {}", traceId, id);

            Optional<Notification> notification = notificationService.getNotificationById(id, traceId);

            if (notification.isEmpty()) {
                ApiResponse<Notification> response = ApiResponse.error(
                        "Notification not found",
                        "No notification found with ID: " + id,
                        traceId
                );
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            ApiResponse<Notification> response = ApiResponse.success(
                    notification.get(),
                    null,
                    traceId
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch notification", traceId, Map.of("id", id));
        }
    }

    @GetMapping("/recipient/{recipient}")
    public ResponseEntity<ApiResponse<List<Notification>>> getNotificationsByRecipient(
            @PathVariable String recipient,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Get notifications by recipient - TraceId: {}, Recipient: {}", traceId, recipient);

            List<Notification> notifications = notificationService.getNotificationsByRecipient(recipient, traceId);

            ApiResponse<List<Notification>> response = ApiResponse.success(
                    notifications,
                    null,
                    traceId
            );
            response.setCount(notifications.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch notifications", traceId, Map.of("recipient", recipient));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getAllNotifications(HttpServletRequest request) {
        String traceId = getTraceId(request);

        try {
            logger.info("Get all notifications - TraceId: {}", traceId);

            List<Notification> notifications = notificationService.getAllNotifications(traceId);

            ApiResponse<List<Notification>> response = ApiResponse.success(
                    notifications,
                    null,
                    traceId
            );
            response.setCount(notifications.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch notifications", traceId, Map.of());
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

        eventPublisher.publishEvent("notification.error", errorPayload, traceId);

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
