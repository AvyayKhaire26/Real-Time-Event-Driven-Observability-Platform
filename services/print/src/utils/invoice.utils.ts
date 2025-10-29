export enum InvoiceStatus {
  PENDING = "PENDING",
  GENERATED = "GENERATED",
  FAILED = "FAILED"
}

export interface InvoiceData {
  orderId: string;
  orderDetails: {
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    totalAmount: number;
  };
  paymentDetails: {
    transactionId: string;
    method: string;
    paidAt: Date;
  };
  customerDetails: {
    name: string;
    email: string;
  };
}

export class InvoiceGenerator {
  static generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `INV-${timestamp}-${random}`;
  }

  static generateInvoiceText(data: InvoiceData): string {
    const lines: string[] = [];
    lines.push("=".repeat(50));
    lines.push("                    INVOICE");
    lines.push("=".repeat(50));
    lines.push("");
    lines.push(`Invoice Number: ${this.generateInvoiceNumber()}`);
    lines.push(`Order ID: ${data.orderId}`);
    lines.push(`Date: ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("Customer Details:");
    lines.push(`Name: ${data.customerDetails.name}`);
    lines.push(`Email: ${data.customerDetails.email}`);
    lines.push("");
    lines.push("Payment Details:");
    lines.push(`Transaction ID: ${data.paymentDetails.transactionId}`);
    lines.push(`Method: ${data.paymentDetails.method}`);
    lines.push(`Paid At: ${new Date(data.paymentDetails.paidAt).toLocaleString()}`);
    lines.push("");
    lines.push("Order Items:");
    lines.push("-".repeat(50));
    
    data.orderDetails.items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.productName}`);
      lines.push(`   Quantity: ${item.quantity} x ₹${item.unitPrice} = ₹${item.amount}`);
    });
    
    lines.push("-".repeat(50));
    lines.push(`Total Amount: ₹${data.orderDetails.totalAmount}`);
    lines.push("=".repeat(50));
    lines.push("");
    lines.push("Thank you for your business!");
    lines.push("");
    
    return lines.join("\n");
  }
}