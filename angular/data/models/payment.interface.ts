/**
 * Payment & Ledger Interfaces - SG Engineering Works Manager
 * Aligned with the approved SQLite database structures and relational schema.
 */

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';

export interface IPayment {
  id: string;                      // UUID
  customer_id: string;             // UUID referencing customers
  order_id: string;                // UUID referencing orders
  payment_date: string;            // ISO 8601 Date (YYYY-MM-DD or full timestamp)
  payment_amount: number;          // Cleared amount
  payment_method: PaymentMethod;
  reference_no?: string | null;    // UPI Txn ID, bank ref, cheque no.
  remarks?: string | null;         // Admin instructions/comments
  created_date: string;            // ISO 8601 UTC String
  updated_date: string;            // ISO 8601 UTC String

  // Extended UI Properties (populated via JOIN queries)
  customer_name?: string;
  order_number?: string;
}

export interface IOrderPaymentSummary {
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  order_total: number;
  payments_received: number;
  outstanding_balance: number;
}

export interface ICustomerOutstandingSummary {
  customer_id: string;
  customer_name: string;
  mobile: string;
  total_order_value: number;
  total_payments: number;
  aggregate_outstanding: number;
}
