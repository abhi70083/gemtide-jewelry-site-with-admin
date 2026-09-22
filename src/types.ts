export type Product = {
  id: number;
  name: string;
  tag: string;
  price: number; // base price in INR
  stock: number;
  offer: number; // percentage discount, 0-100
  active: boolean;
  image: string;
  category?: 'Rings' | 'Chains' | 'Watches' | 'Apparel' | 'Bags' | 'T-Shirts' | 'Artifacts' | 'jewelry' | string;
  likes?: number;
};
