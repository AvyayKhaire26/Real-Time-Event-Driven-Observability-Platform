package org.observability.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class EventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(EventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final String exchangeName;
    private final String serviceName = "notification-service";

    @Autowired
    public EventPublisher(RabbitTemplate rabbitTemplate,
                          @Value("${rabbitmq.exchange.name}") String exchangeName) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchangeName = exchangeName;
    }

    public void publishEvent(String eventType, Map<String, Object> data, String traceId) {
        try {
            // Build event payload matching Node.js structure
            Map<String, Object> event = new HashMap<>();
            event.put("timestamp", Instant.now().toString());
            event.put("service", serviceName);
            event.put("eventType", eventType);
            event.put("data", data);
            event.put("traceId", traceId);
            event.put("userId", null);

            // Determine routing key based on event type (matching Node.js logic)
            String routingKey = determineRoutingKey(eventType);

            rabbitTemplate.convertAndSend(exchangeName, routingKey, event);
            logger.info("Event published: {} - RoutingKey: {}, TraceId: {}", eventType, routingKey, traceId);
        } catch (Exception e) {
            logger.error("Failed to publish event: {} - TraceId: {}, Error: {}", eventType, traceId, e.getMessage(), e);
        }
    }

    /**
     * Matches Node.js EventPublisher routing key selection logic
     */
    private String determineRoutingKey(String eventType) {
        if (eventType.contains("error") ||
                eventType.contains("failed") ||
                eventType.contains("success") ||
                eventType.contains("created") ||
                eventType.contains("updated")) {
            return "logs.event";
        }
        return "logs.default";
    }
}
