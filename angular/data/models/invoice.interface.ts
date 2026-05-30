/**
 * Invoice & Company Settings Interfaces - SG Engineering Works Manager
 * Aligned with the approved SQLite database structures and relational schema.
 */

import { IOrder, IOrderItem } from './order.interface';
import { ICustomer } from './customer.interface';

export interface IInvoice {
  id: string;                      // UUID
  invoice_number: string;          // Auto-generated or manual (pattern like SG/2026-27/001)
  order_id: string;                // References orders
  invoice_date: string;            // ISO 8601 Date
  taxable_amount: number;          // Subtotal without GST
  gst_rate: number;                // Tax percentage (e.g. 18.0)
  cgst: number;                    // Central GST
  sgst: number;                    // State GST
  igst: number;                    // Integrated GST (for interstate transactions)
  total_amount: number;            // Grand Total (Taxable + GST)
  paid_amount: number;             // Total payments received for this order
  due_amount: number;              // Total outstanding balance (total_amount - paid_amount)
  created_date: string;            // ISO 8601 UTC String
  
  // Joins properties for UI lists mapping
  customer_name?: string;
  order_number?: string;
}

export interface ICompanySettings {
  id: string;
  company_name: string;
  address: string;
  mobile: string;
  alternate_mobile?: string | null;
  email?: string | null;
  gstin?: string | null;
  logo_image_path?: string | null;
  logo_image_name?: string | null;
  logo_image_size?: number;
  signature_image_path?: string | null;
  signature_image_name?: string | null;
  signature_image_size?: number;
  updated_at: string;
}

export interface IInvoiceWithDetails {
  invoice: IInvoice;
  customer: ICustomer;
  order: IOrder;
  items: IOrderItem[];
  company: ICompanySettings;
}
