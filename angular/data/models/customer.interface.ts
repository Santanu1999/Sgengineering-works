/**
 * Customer & Interaction Interfaces - SG Engineering Works Manager
 * Fully aligned with approved SQLite database structures.
 */

export type InteractionType = 
  | 'Phone Call'
  | 'WhatsApp'
  | 'Meeting'
  | 'Site Visit'
  | 'Delivery Discussion'
  | 'Payment Follow Up'
  | 'Other';

export interface ICustomer {
  id: string; // UUID
  name: string;
  mobile: string;
  alternate_mobile?: string | null;
  address?: string | null;
  email?: string | null;
  gst_number?: string | null;
  notes?: string | null;
  outstanding_balance: number; // Programmatically synced
  created_date: string;        // ISO 8601 UTC String
  updated_date: string;        // ISO 8601 UTC String
}

export interface ICustomerInteraction {
  id: string; // UUID
  customer_id: string;
  interaction_date: string; // ISO 8601 Date
  interaction_type: InteractionType;
  notes?: string | null;
  follow_up_date?: string | null; // ISO 8601 Date
  created_date: string;           // ISO 8601 UTC String
}

export interface ILedgerEntry {
  id: string;
  date: string;
  type: 'Debit (Invoice)' | 'Credit (Payment)';
  reference_no: string; // Invoice number or Payment ID
  description: string;
  debit_amount: number;  // For invoices
  credit_amount: number; // For payments
  running_balance: number;
}

export interface ICustomerLedger {
  customer: ICustomer;
  statement_period_start: string;
  statement_period_end: string;
  history: ILedgerEntry[];
  total_billed: number;
  total_paid: number;
  current_due: number;
}
