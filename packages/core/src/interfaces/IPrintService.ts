export interface IPrintService {
  generateInvoice(orderId: string): Promise<Invoice>;
  printInvoice(invoice: Invoice): Promise<string>;
}

export interface Invoice {
  invoiceId: string;
  orderId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  generatedAt: Date;
}

export interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}
