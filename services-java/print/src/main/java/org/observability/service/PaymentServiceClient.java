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
public class PaymentServiceClient {

    private static final Logger logger = LoggerFactory.getLogger(PaymentServiceClient.class);

    private final RestTemplate restTemplate;
    private final String paymentServiceUrl;

    @Autowired
    public PaymentServiceClient(RestTemplate restTemplate,
                                @Value("${payment.service.url}") String paymentServiceUrl) {
        this.restTemplate = restTemplate;
        this.paymentServiceUrl = paymentServiceUrl;
    }

    public Map<String, Object> getPaymentById(String paymentId, String traceId) {
        try {
            String url = paymentServiceUrl + "/api/payments/" + paymentId;

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Trace-Id", traceId);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            logger.info("Fetching payment from payment-service - PaymentId: {}, TraceId: {}", paymentId, traceId);

            ResponseEntity<ApiResponse<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {}
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                logger.info("Successfully fetched payment - PaymentId: {}, TraceId: {}", paymentId, traceId);
                return response.getBody().getData();
            }

            throw new RuntimeException("Payment not found: " + paymentId);
        } catch (Exception e) {
            logger.error("Failed to fetch payment from payment-service - PaymentId: {}, TraceId: {}, Error: {}",
                    paymentId, traceId, e.getMessage(), e);
            throw new RuntimeException("Payment service unavailable", e);
        }
    }
}
