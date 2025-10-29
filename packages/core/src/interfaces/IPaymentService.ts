export interface IPaymentService {
  processPayment(payment: PaymentRequest): Promise<PaymentResponse>;
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>;
}

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  method: 'credit_card' | 'debit_card' | 'upi';
  customerDetails: {
    name: string;
    email: string;
  };
}

export interface PaymentResponse {
  transactionId: string;
  status: PaymentStatus;
  message: string;
  timestamp: Date;
}

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING'
}
