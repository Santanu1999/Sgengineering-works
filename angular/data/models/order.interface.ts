/**
 * Order & Manufacturing Interfaces - SG Engineering Works Manager
 * Aligned with the approved SQLite database structures and relational schema.
 */

export type OrderStatus =
  | 'Received'
  | 'Material Procurement'
  | 'Cutting'
  | 'Welding'
  | 'Assembly'
  | 'Painting'
  | 'Testing'
  | 'Ready'
  | 'Delivered'
  | 'Cancelled';

export type WIPStage =
  | 'Received'
  | 'Material Procurement'
  | 'Cutting'
  | 'Welding'
  | 'Assembly'
  | 'Painting'
  | 'Testing'
  | 'Ready'
  | 'Delivered';

export interface IOrder {
  id: string; // UUID
  customer_id: string;
  order_number: string;
  order_date: string;             // ISO 8601 Date
  estimated_delivery_date: string; // ISO 8601 Date
  actual_delivery_date?: string | null;
  status: OrderStatus;
  notes?: string | null;
  created_date: string;           // ISO 8601 UTC String
  updated_date: string;           // ISO 8601 UTC String
  
  // Extended UI Properties (populated via JOIN queries)
  customer_name?: string;
  customer_mobile?: string;
  total_amount?: number;
  items_count?: number;
}

export interface IOrderItem {
  id: string; // UUID
  order_id: string;
  item_name: string;             // Product Name
  quantity: number;
  unit_price: number;
  estimated_cost: number;
  final_cost: number;
  description?: string | null;
  remarks?: string | null;
}

export interface IOrderWIP {
  id: string; // UUID
  order_id: string;
  stage: WIPStage;
  start_date: string;            // ISO 8601 Date
  completion_date?: string | null; // ISO 8601 Date
  remarks?: string | null;
}

export interface IOrderCostSummary {
  id: string; // UUID
  order_id: string;
  material_cost: number;
  labour_cost: number;
  transport_cost: number;
  misc_cost: number;
  total_cost: number;
  revenue: number;
  profit: number;
}

export interface IOrderWithDetails {
  order: IOrder;
  items: IOrderItem[];
  timeline: IOrderWIP[];
  costSummary?: IOrderCostSummary | null;
}
