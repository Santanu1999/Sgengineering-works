export interface IRawMaterial {
  id: string;
  name: string;
  code: string;
  category: string; // 'Steel Sheets' | 'Profiles & Angels' | 'Consumables' | 'Machinery' | 'Electrical'
  uom: string;      // 'Sheet' | 'Length' | 'Box' | 'Packet' | 'Unit' | 'Kg'
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  purchase_cost: number;
  selling_cost: number;
  supplier_id: string;
  supplier_name: string;
  description: string;
  created_date: string;
}

export interface ISupplier {
  id: string;
  name: string;
  contact_person: string;
  mobile: string;
  alternate_mobile: string | null;
  email: string | null;
  address: string;
  gst_number: string | null;
  notes: string;
  status: 'Active' | 'Inactive';
  outstanding_balance: number; // Balance we owe to the supplier
}

export interface ISupplierLedgerEntry {
  id: string;
  supplier_id: string;
  date: string;
  type: 'Purchase Invoice' | 'Payment Out' | 'Stock Adjustment' | 'Refund';
  reference_no: string;
  description: string;
  debit: number;  // decreases what we owe
  credit: number; // increases what we owe
  running_balance: number;
}

export type InventoryTransactionType = 'Stock In' | 'Stock Out' | 'Consumption' | 'Production' | 'Adjustment' | 'Return';
export type InventoryReferenceType = 'Purchase' | 'Production' | 'Order Sale' | 'Manual';

export interface IInventoryTransaction {
  id: string;
  date: string;
  type: InventoryTransactionType;
  quantity: number;
  item_id: string;
  item_name: string;
  is_finished_good: boolean; // true for Finished Goods, false for Raw Materials
  reference_type: InventoryReferenceType;
  reference_no: string;
  notes: string;
}

export interface IBomItem {
  material_id: string;
  material_name: string;
  quantity_required: number; // Quantity of RM needed per single product unit
  uom: string;
}

export interface IBom {
  id: string;
  product_id: string;       // Matches Finished Good ID
  product_name: string;
  materials: IBomItem[];
  notes?: string;
  created_date: string;
}

export type WipStage = 'Material Procurement' | 'Cutting' | 'Welding' | 'Assembly' | 'Painting' | 'Testing' | 'Ready';

export interface IWipStageMilestone {
  stage: WipStage;
  timestamp: string;
  notes: string;
}

export interface IWipJob {
  id: string;
  order_id?: string | null; // Linked CRM Order
  order_number?: string | null;
  product_id: string;      // Linked Finished Good
  product_name: string;
  quantity: number;
  current_stage: WipStage;
  start_date: string;
  estimated_completion_date: string;
  actual_completion_date?: string | null;
  notes: string;
  milestones: IWipStageMilestone[];
}

export interface IFinishedGood {
  id: string;
  name: string;
  code: string;
  quantity_available: number;
  manufacturing_cost: number;
  selling_price: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock';
}
