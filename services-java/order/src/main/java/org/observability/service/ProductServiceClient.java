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

import java.math.BigDecimal;
import java.util.Map;

@Service
public class ProductServiceClient {

    private static final Logger logger = LoggerFactory.getLogger(ProductServiceClient.class);

    private final RestTemplate restTemplate;
    private final String productServiceUrl;

    @Autowired
    public ProductServiceClient(RestTemplate restTemplate,
                                @Value("${product.service.url}") String productServiceUrl) {
        this.restTemplate = restTemplate;
        this.productServiceUrl = productServiceUrl;
    }

    public ProductDto getProductById(String productId, String traceId) {
        try {
            String url = productServiceUrl + "/api/products/" + productId;

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Trace-Id", traceId);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            logger.info("Fetching product from product-service - ProductId: {}, TraceId: {}", productId, traceId);

            ResponseEntity<ApiResponse<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {}
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> productData = response.getBody().getData();

                ProductDto product = new ProductDto();
                product.setId(productData.get("id").toString());
                product.setName(productData.get("name").toString());
                product.setPrice(new BigDecimal(productData.get("price").toString()));
                product.setStock(((Number) productData.get("stock")).intValue());

                logger.info("Successfully fetched product - ProductId: {}, TraceId: {}", productId, traceId);
                return product;
            }

            throw new RuntimeException("Product not found: " + productId);
        } catch (Exception e) {
            logger.error("Failed to fetch product from product-service - ProductId: {}, TraceId: {}, Error: {}",
                    productId, traceId, e.getMessage(), e);
            throw new RuntimeException("Product service unavailable", e);
        }
    }

    public static class ProductDto {
        private String id;
        private String name;
        private BigDecimal price;
        private int stock;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public BigDecimal getPrice() {
            return price;
        }

        public void setPrice(BigDecimal price) {
            this.price = price;
        }

        public int getStock() {
            return stock;
        }

        public void setStock(int stock) {
            this.stock = stock;
        }
    }
}
