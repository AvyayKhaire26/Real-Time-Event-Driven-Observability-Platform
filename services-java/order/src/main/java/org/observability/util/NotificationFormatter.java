package org.observability.util;

public class NotificationFormatter {

    public static String formatOrderConfirmation(String orderId, String customerName) {
        return String.format("Dear %s,%n%nYour order %s has been confirmed!%n%nThank you for shopping with us.",
                customerName, orderId);
    }

    public static String formatPaymentSuccess(String orderId, double amount, String transactionId) {
        return String.format("Payment Successful!%n%nOrder: %s%nAmount: ₹%.2f%nTransaction ID: %s",
                orderId, amount, transactionId);
    }

    public static String formatPaymentFailed(String orderId, String reason) {
        return String.format("Payment Failed!%n%nOrder: %s%nReason: %s%n%nPlease try again.",
                orderId, reason);
    }

    public static String formatInvoiceReady(String orderId, String invoiceNumber) {
        return String.format("Your invoice is ready!%n%nOrder: %s%nInvoice Number: %s",
                orderId, invoiceNumber);
    }
}
