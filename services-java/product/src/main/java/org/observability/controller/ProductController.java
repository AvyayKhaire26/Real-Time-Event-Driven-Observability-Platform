package org.observability.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.observability.dto.ApiResponse;
import org.observability.dto.ProductDto;
import org.observability.dto.UpdateProductDto;
import org.observability.entity.Product;
import org.observability.service.EventPublisher;
import org.observability.service.ProductService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private static final Logger logger = LoggerFactory.getLogger(ProductController.class);

    private final ProductService productService;
    private final EventPublisher eventPublisher;

    @Autowired
    public ProductController(ProductService productService, EventPublisher eventPublisher) {
        this.productService = productService;
        this.eventPublisher = eventPublisher;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Product>>> getAllProducts(HttpServletRequest request) {
        String traceId = getTraceId(request);

        try {
            logger.info("Get all products - TraceId: {}", traceId);

            List<Product> products = productService.getAllProducts(traceId);

            ApiResponse<List<Product>> response = ApiResponse.success(
                    products,
                    null,
                    traceId
            );
            response.setCount(products.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch products", traceId, Map.of());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Product>> getProductById(
            @PathVariable UUID id,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Get product by ID - TraceId: {}, ProductId: {}", traceId, id);

            Optional<Product> product = productService.getProductById(id, traceId);

            if (product.isEmpty()) {
                ApiResponse<Product> response = ApiResponse.error(
                        "Product not found",
                        "No product found with ID: " + id,
                        traceId
                );
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            ApiResponse<Product> response = ApiResponse.success(
                    product.get(),
                    null,
                    traceId
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to fetch product", traceId, Map.of("productId", id));
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Product>> createProduct(
            @Valid @RequestBody ProductDto productDto,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Create product request - TraceId: {}, Name: {}", traceId, productDto.getName());

            Product product = productService.createProduct(productDto, traceId);

            ApiResponse<Product> response = ApiResponse.success(
                    product,
                    "Product created successfully",
                    traceId
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to create product", traceId, Map.of("name", productDto.getName()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Product>> updateProduct(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateProductDto updateDto,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Update product request - TraceId: {}, ProductId: {}", traceId, id);

            Product product = productService.updateProduct(id, updateDto, traceId);

            ApiResponse<Product> response = ApiResponse.success(
                    product,
                    "Product updated successfully",
                    traceId
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to update product", traceId, Map.of("productId", id));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(
            @PathVariable UUID id,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Delete product request - TraceId: {}, ProductId: {}", traceId, id);

            productService.deleteProduct(id, traceId);

            ApiResponse<Void> response = ApiResponse.success(
                    null,
                    "Product deleted successfully",
                    traceId
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to delete product", traceId, Map.of("productId", id));
        }
    }

    @GetMapping("/{id}/check-inventory")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkInventory(
            @PathVariable UUID id,
            @RequestParam int quantity,
            HttpServletRequest request) {

        String traceId = getTraceId(request);

        try {
            logger.info("Check inventory - TraceId: {}, ProductId: {}, Quantity: {}", traceId, id, quantity);

            boolean hasStock = productService.checkInventory(id, quantity, traceId);

            Map<String, Boolean> result = new HashMap<>();
            result.put("available", hasStock);

            ApiResponse<Map<String, Boolean>> response = ApiResponse.success(
                    result,
                    null,
                    traceId
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return emitErrorAndRespond(e, "Failed to check inventory", traceId,
                    Map.of("productId", id, "quantity", quantity));
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

        eventPublisher.publishEvent("product.error", errorPayload, traceId);

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
