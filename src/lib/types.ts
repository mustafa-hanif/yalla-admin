export interface Product {
  title: string;
  price: string;
  rating: string;
  reviewCount: string;
  image: string;
  url: string;
}

// Database Product interface
export interface DBProduct {
  id: number;
  user_id?: number;
  name: string;
  price?: number;
  description?: string;
  category?: string;
  status: "active" | "inactive" | "draft";
  in_stock: boolean;
  keyword?: string;
  rating?: number;
  review_count?: number;
  image_url?: string;
  source_url?: string;
  source_type: "manual" | "amazon" | "scraped";
  created_at: string;
  updated_at?: string;
}
