package org.observability.util;

import java.util.Random;

public class PaymentSimulator {

    private static final Random random = new Random();
    private static final double FAILURE_RATE = 0.4; // 40% failure rate

    private static final String[] FAILURE_REASONS = {
            "Insufficient funds",
            "Payment gateway timeout",
            "Invalid card details",
            "Network error",
            "Bank declined transaction"
    };

    public static boolean shouldSimulateFailure() {
        return random.nextDouble() < FAILURE_RATE;
    }

    public static String getRandomFailureReason() {
        return FAILURE_REASONS[random.nextInt(FAILURE_REASONS.length)];
    }

    public static int simulateProcessingDelay() {
        // Returns 500-3500ms
        return 500 + random.nextInt(3000);
    }
}
