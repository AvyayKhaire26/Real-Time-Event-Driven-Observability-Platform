export interface IMessageBroker {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(queue: string, message: any): Promise<void>;
  subscribe(queue: string, handler: (message: any) => Promise<void>): Promise<void>;
  isConnected(): boolean;
}
