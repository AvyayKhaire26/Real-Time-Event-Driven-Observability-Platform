package org.observability.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.Type;
import org.hibernate.type.SqlTypes;
import org.observability.config.PostgreSQLEnumType;
import org.observability.enums.PaymentMethod;
import org.observability.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "\"id\"")
    private UUID id;

    @Column(name = "\"orderId\"", nullable = false)
    private UUID orderId;

    @Column(name = "\"transactionId\"", nullable = false, length = 255)
    private String transactionId;

    @Column(name = "\"amount\"", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "\"currency\"", length = 10)
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "\"method\"", nullable = false, columnDefinition = "payments_method_enum")
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"status\"", nullable = false, columnDefinition = "payments_status_enum")
    private PaymentStatus status = PaymentStatus.PENDING;


    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "\"customerDetails\"", nullable = false, columnDefinition = "jsonb")
    private Map<String, String> customerDetails;

    @Column(name = "\"failureReason\"", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "\"processingTimeMs\"")
    private Integer processingTimeMs = 0;

    @Column(name = "\"createdAt\"", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "\"updatedAt\"")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Constructors
    public Payment() {
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public void setOrderId(UUID orderId) {
        this.orderId = orderId;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public PaymentMethod getMethod() {
        return method;
    }

    public void setMethod(PaymentMethod method) {
        this.method = method;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public Map<String, String> getCustomerDetails() {
        return customerDetails;
    }

    public void setCustomerDetails(Map<String, String> customerDetails) {
        this.customerDetails = customerDetails;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public Integer getProcessingTimeMs() {
        return processingTimeMs;
    }

    public void setProcessingTimeMs(Integer processingTimeMs) {
        this.processingTimeMs = processingTimeMs;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
