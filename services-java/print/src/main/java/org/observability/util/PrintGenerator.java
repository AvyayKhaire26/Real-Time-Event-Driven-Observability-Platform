package org.observability.util;

import org.observability.dto.PrintData;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicInteger;

public class PrintGenerator {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy hh:mm a");

    public static String generateInvoiceNumber() {
        long timestamp = System.currentTimeMillis();
        int random = (int) (Math.random() * 1000);
        return String.format("INV-%d-%d", timestamp, random);
    }

    public static String generateInvoiceText(PrintData data) {
        StringBuilder invoice = new StringBuilder();

        invoice.append("=".repeat(50)).append("\n");
        invoice.append("                    INVOICE\n");
        invoice.append("=".repeat(50)).append("\n\n");

        invoice.append("Invoice Number: ").append(generateInvoiceNumber()).append("\n");
        invoice.append("Order ID: ").append(data.getOrderId()).append("\n");
        invoice.append("Date: ").append(LocalDateTime.now().format(DATE_FORMATTER)).append("\n\n");

        invoice.append("Customer Details:\n");
        invoice.append("Name: ").append(data.getCustomerDetails().get("name")).append("\n");
        invoice.append("Email: ").append(data.getCustomerDetails().get("email")).append("\n\n");

        invoice.append("Payment Details:\n");
        invoice.append("Transaction ID: ").append(data.getPaymentDetails().getTransactionId()).append("\n");
        invoice.append("Method: ").append(data.getPaymentDetails().getMethod()).append("\n");
        invoice.append("Paid At: ").append(data.getPaymentDetails().getPaidAt().format(DATE_FORMATTER)).append("\n\n");

        invoice.append("Order Items:\n");
        invoice.append("-".repeat(50)).append("\n");

        AtomicInteger index = new AtomicInteger(1);
        data.getOrderDetails().getItems().forEach(item -> {
            invoice.append(index.getAndIncrement()).append(". ").append(item.getProductName()).append("\n");
            invoice.append("   Quantity: ").append(item.getQuantity())
                    .append(" x ₹").append(item.getUnitPrice())
                    .append(" = ₹").append(item.getAmount()).append("\n");
        });

        invoice.append("-".repeat(50)).append("\n");
        invoice.append("Total Amount: ₹").append(data.getOrderDetails().getTotalAmount()).append("\n");
        invoice.append("=".repeat(50)).append("\n\n");
        invoice.append("Thank you for your business!\n\n");

        return invoice.toString();
    }
}
