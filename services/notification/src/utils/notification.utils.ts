export enum NotificationType {
  EMAIL = "EMAIL",
  SMS = "SMS",
  PUSH = "PUSH"
}

export enum NotificationStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED"
}

export interface SendNotificationDto {
  type: NotificationType;
  recipient: string;
  subject?: string;
  message: string;
  metadata?: {
    orderId?: string;
    userId?: string;
    [key: string]: any;
  };
}

export class NotificationFormatter {
  static formatOrderConfirmation(orderId: string, customerName: string): string {
    return `Dear ${customerName},\n\nYour order ${orderId} has been confirmed!\n\nThank you for shopping with us.`;
  }

  static formatPaymentSuccess(orderId: string, amount: number, transactionId: string): string {
    return `Payment Successful!\n\nOrder: ${orderId}\nAmount: ₹${amount}\nTransaction ID: ${transactionId}`;
  }

  static formatPaymentFailed(orderId: string, reason: string): string {
    return `Payment Failed!\n\nOrder: ${orderId}\nReason: ${reason}\n\nPlease try again.`;
  }

  static formatInvoiceReady(orderId: string, invoiceNumber: string): string {
    return `Your invoice is ready!\n\nOrder: ${orderId}\nInvoice Number: ${invoiceNumber}`;
  }
}