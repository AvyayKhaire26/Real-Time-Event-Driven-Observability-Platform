export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  PROCESSING = "PROCESSING",
  CANCELLED = "CANCELLED"
}

export enum PaymentMethod {
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
  UPI = "UPI",
  NET_BANKING = "NET_BANKING"
}

export interface ProcessPaymentDto {
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  customerDetails: {
    name: string;
    email: string;
  };
}

export class PaymentError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export class PaymentSimulator {
  // Simulate failures for anomaly detection
  static shouldSimulateFailure(): boolean {
    return Math.random() < 0.4; // 40% failure rate
  }

  static getRandomFailureReason(): string {
    const reasons = [
      "Insufficient funds",
      "Payment gateway timeout",
      "Invalid card details",
      "Network error",
      "Bank declined transaction"
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  static simulateProcessingDelay(): number {
    return Math.floor(Math.random() * 3000) + 500; // 500-3500ms
  }
}