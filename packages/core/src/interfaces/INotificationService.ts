export interface INotificationService {
  sendOrderConfirmation(orderId: string, email: string): Promise<void>;
  sendPaymentNotification(orderId: string, status: string): Promise<void>;
}
