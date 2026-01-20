package org.observability.exception;

public class PaymentException extends RuntimeException {

    private final String code;

    public PaymentException(String message, String code) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
