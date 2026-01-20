package org.observability.service;

import org.observability.dto.ProcessPaymentDto;
import org.observability.entity.Payment;
import org.observability.enums.PaymentStatus;
import org.observability.exception.PaymentException;
import org.observability.repository.PaymentRepository;
import org.observability.util.PaymentSimulator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class PaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;

    @Autowired
    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @Transactional
    public Payment processPayment(ProcessPaymentDto paymentDto, String traceId) {
        long startTime = System.currentTimeMillis();
        String transactionId = "TXN-" + UUID.randomUUID().toString();

        try {
            logger.info("Processing payment - TraceId: {}, TransactionId: {}, OrderId: {}, Amount: {}",
                    traceId, transactionId, paymentDto.getOrderId(), paymentDto.getAmount());

            // Create payment (initial state)
            Payment payment = new Payment();
            payment.setOrderId(UUID.fromString(paymentDto.getOrderId()));
            payment.setTransactionId(transactionId);
            payment.setAmount(paymentDto.getAmount());
            payment.setCurrency(paymentDto.getCurrency());
            payment.setMethod(paymentDto.getMethod());
            payment.setStatus(PaymentStatus.PROCESSING);
            payment.setProcessingTimeMs(0);

            // Convert customer details to Map
            Map<String, String> customerDetails = new HashMap<>();
            customerDetails.put("name", paymentDto.getCustomerDetails().getName());
            customerDetails.put("email", paymentDto.getCustomerDetails().getEmail());
            payment.setCustomerDetails(customerDetails);

            Payment savedPayment = paymentRepository.save(payment);

            // Simulate processing delay
            int delay = PaymentSimulator.simulateProcessingDelay();
            sleep(delay);

            // Simulate failure (40% chance)
            if (PaymentSimulator.shouldSimulateFailure()) {
                return handlePaymentFailure(savedPayment.getId(), startTime, traceId);
            }

            // Mark as SUCCESS
            long processingTime = System.currentTimeMillis() - startTime;
            savedPayment.setStatus(PaymentStatus.SUCCESS);
            savedPayment.setProcessingTimeMs((int) processingTime);
            Payment updatedPayment = paymentRepository.save(savedPayment);

            logger.info("Payment successful - TraceId: {}, ProcessingTime: {}ms, TransactionId: {}, OrderId: {}",
                    traceId, processingTime, transactionId, paymentDto.getOrderId());

            return updatedPayment;

        } catch (PaymentException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Payment processing error - TraceId: {}, TransactionId: {}, Error: {}",
                    traceId, transactionId, e.getMessage(), e);
            throw new PaymentException("Payment processing failed: " + e.getMessage(), "PAYMENT_ERROR");
        }
    }

    public Optional<Payment> getPaymentById(UUID id, String traceId) {
        logger.info("Get payment by ID - TraceId: {}, PaymentId: {}", traceId, id);
        return paymentRepository.findById(id);
    }

    public Optional<Payment> getPaymentByOrderId(UUID orderId, String traceId) {
        logger.info("Get payment by OrderId - TraceId: {}, OrderId: {}", traceId, orderId);
        return paymentRepository.findByOrderId(orderId);
    }

    public List<Payment> getAllPayments(String traceId) {
        logger.info("Get all payments - TraceId: {}", traceId);
        return paymentRepository.findAllByOrderByCreatedAtDesc();
    }

    private Payment handlePaymentFailure(UUID paymentId, long startTime, String traceId) {
        String failureReason = PaymentSimulator.getRandomFailureReason();
        long processingTime = System.currentTimeMillis() - startTime;

        logger.warn("Payment failed - TraceId: {}, PaymentId: {}, Reason: {}", traceId, paymentId, failureReason);

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentException("Payment not found", "PAYMENT_NOT_FOUND"));

        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(failureReason);
        payment.setProcessingTimeMs((int) processingTime);
        paymentRepository.save(payment);

        throw new PaymentException(failureReason, "PAYMENT_FAILED");
    }

    private void sleep(int ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PaymentException("Payment processing interrupted", "PROCESSING_INTERRUPTED");
        }
    }
}
