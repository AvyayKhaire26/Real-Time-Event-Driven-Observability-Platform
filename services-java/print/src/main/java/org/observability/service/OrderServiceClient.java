package org.observability.service;

import org.observability.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class OrderServiceClient {

    private static final Logger logger = LoggerFactory.getLogger(OrderServiceClient.class);

    private final RestTemplate restTemplate;
    private final String orderServiceUrl;

    @Autowired
    public OrderServiceClient(RestTemplate restTemplate,
                              @Value("${order.service.url}") String orderServiceUrl) {
        this.restTemplate = restTemplate;
        this.orderServiceUrl = orderServiceUrl;
    }

    public Map<String, Object> getOrderById(String orderId, String traceId) {
        try {
            String url = orderServiceUrl + "/api/orders/" + orderId;

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Trace-Id", traceId);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            logger.info("Fetching order from order-service - OrderId: {}, TraceId: {}", orderId, traceId);

            ResponseEntity<ApiResponse<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {}
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                logger.info("Successfully fetched order - OrderId: {}, TraceId: {}", orderId, traceId);
                return response.getBody().getData();
            }

            throw new RuntimeException("Order not found: " + orderId);
        } catch (Exception e) {
            logger.error("Failed to fetch order from order-service - OrderId: {}, TraceId: {}, Error: {}",
                    orderId, traceId, e.getMessage(), e);
            throw new RuntimeException("Order service unavailable", e);
        }
    }
}
