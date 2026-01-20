package org.observability.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.observability.dto.GeneratePrintDto;
import org.observability.dto.PrintData;
import org.observability.entity.Print;
import org.observability.enums.PrintStatus;
import org.observability.repository.PrintRepository;
import org.observability.util.PrintGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PrintService {

    private static final Logger logger = LoggerFactory.getLogger(PrintService.class);

    private final PrintRepository printRepository;
    private final OrderServiceClient orderServiceClient;
    private final PaymentServiceClient paymentServiceClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public PrintService(PrintRepository printRepository,
                        OrderServiceClient orderServiceClient,
                        PaymentServiceClient paymentServiceClient,
                        ObjectMapper objectMapper) {
        this.printRepository = printRepository;
        this.orderServiceClient = orderServiceClient;
        this.paymentServiceClient = paymentServiceClient;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Print generateInvoice(GeneratePrintDto dto, String traceId) {
        try {
            logger.info("Generating invoice - TraceId: {}, OrderId: {}, PaymentId: {}",
                    traceId, dto.getOrderId(), dto.getPaymentId());

            // Fetch order and payment data
            Map<String, Object> orderData = orderServiceClient.getOrderById(dto.getOrderId(), traceId);
            Map<String, Object> paymentData = paymentServiceClient.getPaymentById(dto.getPaymentId(), traceId);

            // Build PrintData
            PrintData printData = buildPrintData(dto.getOrderId(), orderData, paymentData);

            // Generate invoice content
            String invoiceContent = PrintGenerator.generateInvoiceText(printData);
            String invoiceNumber = PrintGenerator.generateInvoiceNumber();

            // Create invoice entity
            Print print = new Print();
            print.setInvoiceNumber(invoiceNumber);
            print.setOrderId(UUID.fromString(dto.getOrderId()));
            print.setPaymentId(UUID.fromString(dto.getPaymentId()));
            print.setInvoiceContent(invoiceContent);
            print.setStatus(PrintStatus.GENERATED);
            print.setTotalAmount(new BigDecimal(orderData.get("totalAmount").toString()));
            print.setCustomerDetails((Map<String, String>) paymentData.get("customerDetails"));

            Print savedPrint = printRepository.save(print);

            logger.info("Invoice generated successfully - TraceId: {}, InvoiceNumber: {}", traceId, invoiceNumber);

            return savedPrint;
        } catch (Exception e) {
            logger.error("Failed to generate invoice - TraceId: {}, OrderId: {}, PaymentId: {}, Error: {}",
                    traceId, dto.getOrderId(), dto.getPaymentId(), e.getMessage(), e);
            throw new RuntimeException("Failed to generate invoice: " + e.getMessage(), e);
        }
    }

    public Optional<Print> getInvoiceById(UUID id, String traceId) {
        logger.info("Get invoice by ID - TraceId: {}, InvoiceId: {}", traceId, id);
        return printRepository.findById(id);
    }

    public Optional<Print> getInvoiceByOrderId(UUID orderId, String traceId) {
        logger.info("Get invoice by OrderId - TraceId: {}, OrderId: {}", traceId, orderId);
        return printRepository.findByOrderId(orderId);
    }

    public List<Print> getAllInvoices(String traceId) {
        logger.info("Get all invoices - TraceId: {}", traceId);
        return printRepository.findAllByOrderByCreatedAtDesc();
    }

    private PrintData buildPrintData(String orderId, Map<String, Object> orderData, Map<String, Object> paymentData) {
        PrintData printData = new PrintData();
        printData.setOrderId(orderId);

        // Order details
        PrintData.OrderDetails orderDetails = new PrintData.OrderDetails();
        List<Map<String, Object>> itemsList = (List<Map<String, Object>>) orderData.get("items");
        List<PrintData.OrderItem> orderItems = itemsList.stream().map(item -> {
            PrintData.OrderItem orderItem = new PrintData.OrderItem();
            orderItem.setProductName(item.get("productName").toString());
            orderItem.setQuantity(((Number) item.get("quantity")).intValue());
            orderItem.setUnitPrice(((Number) item.get("unitPrice")).doubleValue());
            orderItem.setAmount(((Number) item.get("amount")).doubleValue());
            return orderItem;
        }).collect(Collectors.toList());
        orderDetails.setItems(orderItems);
        orderDetails.setTotalAmount(new BigDecimal(orderData.get("totalAmount").toString()));
        printData.setOrderDetails(orderDetails);

        // Payment details
        PrintData.PaymentDetails paymentDetails = new PrintData.PaymentDetails();
        paymentDetails.setTransactionId(paymentData.get("transactionId").toString());
        paymentDetails.setMethod(paymentData.get("method").toString());
        paymentDetails.setPaidAt(LocalDateTime.parse(paymentData.get("createdAt").toString()));
        printData.setPaymentDetails(paymentDetails);

        // Customer details
        printData.setCustomerDetails((Map<String, String>) paymentData.get("customerDetails"));

        return printData;
    }
}
