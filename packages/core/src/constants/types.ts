export const TYPES = {
  // Infrastructure
  Logger: Symbol.for('Logger'),
  MessageBroker: Symbol.for('MessageBroker'),
  MetricsCollector: Symbol.for('MetricsCollector'),
  Database: Symbol.for('Database'),
  HealthCheck: Symbol.for('HealthCheck'),
  
  // Services
  ProductService: Symbol.for('ProductService'),
  OrderService: Symbol.for('OrderService'),
  PaymentService: Symbol.for('PaymentService'),
  NotificationService: Symbol.for('NotificationService'),
  PrintService: Symbol.for('PrintService'),
  
  // Repositories
  ProductRepository: Symbol.for('ProductRepository'),
  OrderRepository: Symbol.for('OrderRepository'),
  PaymentRepository: Symbol.for('PaymentRepository'),
  
  // Controllers
  ProductController: Symbol.for('ProductController'),
  OrderController: Symbol.for('OrderController'),
  PaymentController: Symbol.for('PaymentController'),
  NotificationController: Symbol.for('NotificationController'),
  PrintController: Symbol.for('PrintController')
};
