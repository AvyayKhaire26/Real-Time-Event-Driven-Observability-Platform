export interface IProductService {
  getProductById(id: string): Promise<Product | null>;
  getAllProducts(): Promise<Product[]>;
  checkInventory(productId: string, quantity: number): Promise<boolean>;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description?: string;
}
