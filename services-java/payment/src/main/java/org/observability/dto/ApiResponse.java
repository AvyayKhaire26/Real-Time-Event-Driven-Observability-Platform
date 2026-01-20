package org.observability.dto;

public class ApiResponse<T> {
    private boolean success;
    private T data;
    private String message;
    private String traceId;
    private String error;
    private Integer count;

    // Constructors
    public ApiResponse() {
    }

    public ApiResponse(boolean success, T data, String message, String traceId) {
        this.success = success;
        this.data = data;
        this.message = message;
        this.traceId = traceId;
    }

    // Static factory methods
    public static <T> ApiResponse<T> success(T data, String message, String traceId) {
        return new ApiResponse<>(true, data, message, traceId);
    }

    public static <T> ApiResponse<T> error(String message, String error, String traceId) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(false);
        response.setMessage(message);
        response.setError(error);
        response.setTraceId(traceId);
        return response;
    }

    // Getters and Setters
    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getTraceId() {
        return traceId;
    }

    public void setTraceId(String traceId) {
        this.traceId = traceId;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public Integer getCount() {
        return count;
    }

    public void setCount(Integer count) {
        this.count = count;
    }
}
