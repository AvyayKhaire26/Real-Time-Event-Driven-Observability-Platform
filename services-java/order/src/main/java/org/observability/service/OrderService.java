package org.observability.service;

import org.observability.dto.CreateOrderDto;
import org.observability.dto.OrderItemDto;
import org.observability.entity.Order;
import org.observability.enums.OrderStatus;
import org.observability.exception.OrderValidationException;
import org.observability.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
public class OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final ProductServiceClient productServiceClient;

    @Autowired
    public OrderService(OrderRepository orderRepository, ProductServiceClient productServiceClient) {
        this.orderRepository = orderRepository;
        this.productServiceClient = productServiceClient;
    }

    @Transactional
    public Order createOrder(CreateOrderDto orderDto, String traceId) {
        logger.info("createOrder-request - TraceId: {}, UserId: {}", traceId, orderDto.getUserId());

        // Fetch product details and validate stock
        List<OrderItemDto> orderItems = fetchProductDetails(orderDto.getItems(), traceId);

        // Calculate total amount
        BigDecimal totalAmount = calculateOrderTotal(orderItems);

        // Create order entity
        Order order = new Order();
        order.setUserId(orderDto.getUserId());
        order.setItems(convertToJsonbItems(orderItems));
        order.setTotalAmount(totalAmount);
        order.setStatus(OrderStatus.PENDING);

        Order savedOrder = orderRepository.save(order);

        logger.info("Order created successfully: {} - TraceId: {}, UserId: {}",
                savedOrder.getId(), traceId, orderDto.getUserId());

        return savedOrder;
    }

    public Optional<Order> getOrderById(UUID id, String traceId) {
        logger.info("getOrderById-request - TraceId: {}, OrderId: {}", traceId, id);
        return orderRepository.findById(id);
    }

    public List<Order> getUserOrders(String userId, String traceId) {
        logger.info("getUserOrders-request - TraceId: {}, UserId: {}", traceId, userId);
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Order> getAllOrders(String traceId) {
        logger.info("getAllOrders-request - TraceId: {}", traceId);
        return orderRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Order updateOrderStatus(UUID id, OrderStatus status, String traceId) {
        logger.info("updateOrderStatus-request - TraceId: {}, OrderId: {}, Status: {}", traceId, id, status);

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new OrderValidationException("Order not found: " + id));

        order.setStatus(status);
        Order updatedOrder = orderRepository.save(order);

        logger.info("Order status updated - TraceId: {}, OrderId: {}, Status: {}", traceId, id, status);

        return updatedOrder;
    }

    private List<OrderItemDto> fetchProductDetails(List<CreateOrderDto.OrderItemInput> items, String traceId) {
        List<OrderItemDto> orderItems = new ArrayList<>();

        for (CreateOrderDto.OrderItemInput item : items) {
            ProductServiceClient.ProductDto product = productServiceClient.getProductById(item.getProductId(), traceId);

            if (product == null) {
                logger.error("Product not found - TraceId: {}, ProductId: {}", traceId, item.getProductId());
                throw new OrderValidationException("Product not found: " + item.getProductId());
            }

            if (product.getStock() < item.getQuantity()) {
                logger.error("Insufficient stock - TraceId: {}, ProductId: {}, Stock: {}, Requested: {}",
                        traceId, item.getProductId(), product.getStock(), item.getQuantity());
                throw new OrderValidationException("Insufficient stock for product: " + product.getName());
            }

            BigDecimal amount = product.getPrice().multiply(new BigDecimal(item.getQuantity()));

            OrderItemDto orderItem = new OrderItemDto(
                    product.getId(),
                    product.getName(),
                    item.getQuantity(),
                    product.getPrice(),
                    amount
            );
            orderItems.add(orderItem);
        }

        return orderItems;
    }

    private BigDecimal calculateOrderTotal(List<OrderItemDto> items) {
        return items.stream()
                .map(OrderItemDto::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<Map<String, Object>> convertToJsonbItems(List<OrderItemDto> orderItems) {
        List<Map<String, Object>> items = new ArrayList<>();

        for (OrderItemDto item : orderItems) {
            Map<String, Object> itemMap = new HashMap<>();
            itemMap.put("productId", item.getProductId());
            itemMap.put("productName", item.getProductName());
            itemMap.put("quantity", item.getQuantity());
            itemMap.put("unitPrice", item.getUnitPrice().doubleValue());
            itemMap.put("amount", item.getAmount().doubleValue());
            items.add(itemMap);
        }

        return items;
    }
}
