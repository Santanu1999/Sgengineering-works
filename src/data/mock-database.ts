/**
 * Relational SQLite simulation utilizing localStorage for the React preview environment.
 * Seeds deep, realistic starting data for SG Engineering Works.
 */

import { ICustomer, ICustomerInteraction, ILedgerEntry } from '../types/customer.interface';

export interface ISimulatedOrder {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  order_date: string;
  estimated_delivery_date: string;
  actual_delivery_date?: string | null;
  status: 'Received' | 'Material Procurement' | 'Cutting' | 'Welding' | 'Assembly' | 'Painting' | 'Testing' | 'Ready' | 'Delivered' | 'Cancelled';
  total_amount: number;
}

export interface ISimulatedInvoice {
  id: string;
  invoice_number: string;
  order_id: string;
  customer_id: string; // denormalized for lookups
  invoice_date: string;
  taxable_amount: number;
  gst_rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
}

export interface ISimulatedPayment {
  id: string;
  customer_id: string;
  order_id: string;
  invoice_id?: string | null;
  payment_amount: number;
  payment_date: string;
  payment_method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  notes?: string | null;
}

// Global Storage Keys
const CUSTOMER_KEY = 'sg_db_customers';
const INTERACTION_KEY = 'sg_db_interactions';
const ORDER_KEY = 'sg_db_orders';
const INVOICE_KEY = 'sg_db_invoices';
const PAYMENT_KEY = 'sg_db_payments';
const PIN_KEY = 'sg_db_pin_locked';

// Seed starting data if empty
export function initMockDatabase() {


  if (!localStorage.getItem(CUSTOMER_KEY)) {
    const rawCustomers: ICustomer[] = [
      {
        id: 'cust-1',
        name: 'Anupam Food Processors Ltd',
        mobile: '9830012345',
        alternate_mobile: '9830054321',
        address: 'B-12, Sector 5, Salt Lake, Kolkata, West Bengal, 700091',
        email: 'procurement@anupamfoods.com',
        gst_number: '19AAACA1122D1Z4',
        notes: 'Regular customer for stainless steel pulverizers and conveyor units.',
        outstanding_balance: 145000.0,
        created_date: '2026-01-15T12:00:00Z',
        updated_date: '2026-05-25T14:30:00Z'
      },
      {
        id: 'cust-2',
        name: 'Madan Mohan Bakery Products',
        mobile: '9435098765',
        alternate_mobile: null,
        address: '89, Rabindra Sarani, Liluah, Howrah, West Bengal, 711204',
        email: 'madan_bakery@gmail.com',
        gst_number: null,
        notes: 'Requests custom high-temp rotary oven gear components.',
        outstanding_balance: 45000.0,
        created_date: '2026-02-10T10:00:00Z',
        updated_date: '2026-05-18T09:15:00Z'
      },
      {
        id: 'cust-3',
        name: 'Sardarji Dairy & Sweets',
        mobile: '7003124567',
        alternate_mobile: '7003188992',
        address: 'Ganesh Chandra Avenue, Central Kolkata, WB, 700013',
        email: 'sardarjidairy@sweets.in',
        gst_number: '19AAACS2233M2Z9',
        notes: 'Milk boiling vat machines and cream separators maintenance contract.',
        outstanding_balance: 0.0,
        created_date: '2026-03-01T14:00:00Z',
        updated_date: '2026-05-28T16:20:00Z'
      },
      {
        id: 'cust-4',
        name: 'Techno-Pack Engineers',
        mobile: '9123456789',
        alternate_mobile: null,
        address: 'Phase-II, Kasba Industrial Estate, Kolkata, 700107',
        email: 'info@technopack.co.in',
        gst_number: '19AAGCT9090F1ZM',
        notes: 'Bulk partner for packaging machine frame weldings.',
        outstanding_balance: 95000.0,
        created_date: '2026-03-24T11:00:00Z',
        updated_date: '2026-05-29T10:00:00Z'
      }
    ];

    const rawInteractions: ICustomerInteraction[] = [
      {
        id: 'int-1',
        customer_id: 'cust-1',
        interaction_date: '2026-05-25',
        interaction_type: 'Phone Call',
        notes: 'Discussed minor delay in raw stainless steel sheets shipping for the pulverizer order.',
        follow_up_date: '2026-05-27',
        created_date: '2026-05-25T11:00:00Z'
      },
      {
        id: 'int-2',
        customer_id: 'cust-1',
        interaction_date: '2026-05-27',
        interaction_type: 'WhatsApp',
        notes: 'Shared pictures of the structural welding stage. Client confirmed satisfaction.',
        follow_up_date: '2026-06-05',
        created_date: '2026-05-27T14:30:00Z'
      },
      {
        id: 'int-3',
        customer_id: 'cust-2',
        interaction_date: '2026-05-18',
        interaction_type: 'Phone Call',
        notes: 'Payment follow up for Oven gear components. Client promised ₹45,000 release by start of June.',
        follow_up_date: '2026-06-01',
        created_date: '2026-05-18T09:15:00Z'
      }
    ];

    const rawOrders: ISimulatedOrder[] = [
      {
        id: 'ord-1',
        order_number: 'ORD-2026-001',
        customer_id: 'cust-1',
        customer_name: 'Anupam Food Processors Ltd',
        order_date: '2026-04-10T09:00:00Z',
        estimated_delivery_date: '2026-06-10',
        actual_delivery_date: null,
        status: 'Assembly',
        total_amount: 250000.0
      },
      {
        id: 'ord-2',
        order_number: 'ORD-2026-002',
        customer_id: 'cust-2',
        customer_name: 'Madan Mohan Bakery Products',
        order_date: '2026-04-15T10:30:00Z',
        estimated_delivery_date: '2026-05-20',
        actual_delivery_date: '2026-05-18',
        status: 'Delivered',
        total_amount: 85000.0
      },
      {
        id: 'ord-3',
        order_number: 'ORD-2026-003',
        customer_id: 'cust-3',
        customer_name: 'Sardarji Dairy & Sweets',
        order_date: '2026-05-01T11:00:00Z',
        estimated_delivery_date: '2026-05-25',
        actual_delivery_date: '2026-05-24',
        status: 'Delivered',
        total_amount: 110000.0
      },
      {
        id: 'ord-4',
        order_number: 'ORD-2026-004',
        customer_id: 'cust-4',
        customer_name: 'Techno-Pack Engineers',
        order_date: '2026-05-12T13:00:00Z',
        estimated_delivery_date: '2026-06-15',
        actual_delivery_date: null,
        status: 'Welding',
        total_amount: 195000.0
      }
    ];

    const rawInvoices: ISimulatedInvoice[] = [
      {
        id: 'inv-1',
        invoice_number: 'INV-2026-001',
        order_id: 'ord-2',
        customer_id: 'cust-2',
        invoice_date: '2026-05-18',
        taxable_amount: 72033.9,
        gst_rate: 18.0,
        cgst: 6483.05,
        sgst: 6483.05,
        igst: 0.0,
        total_amount: 85000.0,
        paid_amount: 40000.0,
        due_amount: 45000.0
      },
      {
        id: 'inv-2',
        invoice_number: 'INV-2026-002',
        order_id: 'ord-3',
        customer_id: 'cust-3',
        invoice_date: '2026-05-24',
        taxable_amount: 93220.34,
        gst_rate: 18.0,
        cgst: 8389.83,
        sgst: 8389.83,
        igst: 0.0,
        total_amount: 110000.0,
        paid_amount: 110000.0,
        due_amount: 0.0
      },
      {
        id: 'inv-3',
        invoice_number: 'INV-2026-003',
        order_id: 'ord-1', // Pre-billing partial
        customer_id: 'cust-1',
        invoice_date: '2026-05-25',
        taxable_amount: 122881.36,
        gst_rate: 18.0,
        cgst: 11059.32,
        sgst: 11059.32,
        igst: 0.0,
        total_amount: 145000.0,
        paid_amount: 0.0,
        due_amount: 145000.0
      },
      {
        id: 'inv-4',
        invoice_number: 'INV-2026-004',
        order_id: 'ord-4',
        customer_id: 'cust-4',
        invoice_date: '2026-05-29',
        taxable_amount: 80508.47,
        gst_rate: 18.0,
        cgst: 7245.76,
        sgst: 7245.76,
        igst: 0.0,
        total_amount: 95000.0,
        paid_amount: 0.0,
        due_amount: 95000.0
      }
    ];

    const rawPayments: ISimulatedPayment[] = [
      {
        id: 'pmt-1',
        customer_id: 'cust-2',
        order_id: 'ord-2',
        invoice_id: 'inv-1',
        payment_amount: 40000.0,
        payment_date: '2026-05-18T11:00:00Z',
        payment_method: 'UPI',
        notes: 'Initial token amount transferred online via UPI.'
      },
      {
        id: 'pmt-2',
        customer_id: 'cust-3',
        order_id: 'ord-3',
        invoice_id: 'inv-2',
        payment_amount: 50000.0,
        payment_date: '2026-05-01T12:00:00Z',
        payment_method: 'Cash',
        notes: 'Advance deposit during order booking.'
      },
      {
        id: 'pmt-3',
        customer_id: 'cust-3',
        order_id: 'ord-3',
        invoice_id: 'inv-2',
        payment_amount: 60000.0,
        payment_date: '2026-05-24T17:00:00Z',
        payment_method: 'Bank Transfer',
        notes: 'Final balance clearance paid via NEFT.'
      }
    ];

    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(rawCustomers));
    localStorage.setItem(INTERACTION_KEY, JSON.stringify(rawInteractions));
    localStorage.setItem(ORDER_KEY, JSON.stringify(rawOrders));
    localStorage.setItem(INVOICE_KEY, JSON.stringify(rawInvoices));
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(rawPayments));
  }
}

// SIMULATED DATABASE API CALLS
export const dbAPI = {
  // --- Customers ---
  getCustomers: (): ICustomer[] => {
    initMockDatabase();
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '[]');
  },

  saveCustomer: (customer: ICustomer) => {
    const list = dbAPI.getCustomers();
    const idx = list.findIndex(c => c.id === customer.id);
    if (idx >= 0) {
      list[idx] = customer;
    } else {
      list.unshift(customer);
    }
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(list));
  },

  deleteCustomer: (id: string): boolean => {
    const list = dbAPI.getCustomers();
    const filtered = list.filter(c => c.id !== id);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(filtered));
    return true;
  },

  // --- Interactions ---
  getInteractions: (customerId?: string): ICustomerInteraction[] => {
    initMockDatabase();
    const all: ICustomerInteraction[] = JSON.parse(localStorage.getItem(INTERACTION_KEY) || '[]');
    if (customerId) {
      return all.filter(i => i.customer_id === customerId).sort((a,b) => b.interaction_date.localeCompare(a.interaction_date));
    }
    return all;
  },

  addInteraction: (interaction: ICustomerInteraction) => {
    const all = dbAPI.getInteractions();
    all.unshift(interaction);
    localStorage.setItem(INTERACTION_KEY, JSON.stringify(all));
  },

  // --- Orders ---
  getOrders: (customerId?: string): ISimulatedOrder[] => {
    initMockDatabase();
    const all: ISimulatedOrder[] = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]');
    if (customerId) {
      return all.filter(o => o.customer_id === customerId);
    }
    return all;
  },

  // --- Invoices ---
  getInvoices: (customerId?: string): ISimulatedInvoice[] => {
    initMockDatabase();
    const all: ISimulatedInvoice[] = JSON.parse(localStorage.getItem(INVOICE_KEY) || '[]');
    if (customerId) {
      return all.filter(i => i.customer_id === customerId);
    }
    return all;
  },

  // --- Payments ---
  getPayments: (customerId?: string): ISimulatedPayment[] => {
    initMockDatabase();
    const all: ISimulatedPayment[] = JSON.parse(localStorage.getItem(PAYMENT_KEY) || '[]');
    if (customerId) {
      return all.filter(p => p.customer_id === customerId);
    }
    return all;
  },

  addPayment: (pmt: ISimulatedPayment) => {
    const all = dbAPI.getPayments();
    all.unshift(pmt);
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(all));

    // Side-effect: Allocate payment to customer invoice and adjust outstanding balance
    // 1. Let's find outstanding invoices for this customer
    const invoices = dbAPI.getInvoices(pmt.customer_id);
    let amountLeft = pmt.payment_amount;

    for (const inv of invoices) {
      if (inv.due_amount > 0 && amountLeft > 0) {
        const canPay = Math.min(inv.due_amount, amountLeft);
        inv.due_amount = parseFloat((inv.due_amount - canPay).toFixed(2));
        inv.paid_amount = parseFloat((inv.paid_amount + canPay).toFixed(2));
        amountLeft = parseFloat((amountLeft - canPay).toFixed(2));
      }
    }
    localStorage.setItem(INVOICE_KEY, JSON.stringify(dbAPI.getInvoices().map(i => {
      const updated = invoices.find(ui => ui.id === i.id);
      return updated ? updated : i;
    })));

    // 2. Synchronize customer outstanding balance
    dbAPI.syncCustomerOutstanding(pmt.customer_id);
  },

  syncCustomerOutstanding: (customerId: string) => {
    const invoices = dbAPI.getInvoices(customerId);
    const totalDues = invoices.reduce((sum, i) => sum + i.due_amount, 0);

    const customers = dbAPI.getCustomers();
    const idx = customers.findIndex(c => c.id === customerId);
    if (idx >= 0) {
      customers[idx].outstanding_balance = parseFloat(totalDues.toFixed(2));
      customers[idx].updated_date = new Date().toISOString();
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customers));
    }
  },

  // --- Compile Ledger History for Display ---
  getLedgerHistory: (customerId: string): ILedgerEntry[] => {
    const invoices = dbAPI.getInvoices(customerId);
    const payments = dbAPI.getPayments(customerId);

    const history: any[] = [];

    invoices.forEach(inv => {
      history.push({
        id: inv.id,
        date: inv.invoice_date,
        type: 'Debit (Invoice)',
        reference_no: inv.invoice_number,
        description: `Billing: Machine Fabrication Sales`,
        debit: inv.total_amount,
        credit: 0.0
      });
    });

    payments.forEach(p => {
      history.push({
        id: p.id,
        date: p.payment_date.split('T')[0],
        type: 'Credit (Payment)',
        reference_no: p.payment_method + ' txn',
        description: `PaymentReceived: ${p.notes || 'Ledger credit amount'}`,
        debit: 0.0,
        credit: p.payment_amount
      });
    });

    // Chronological sorting
    history.sort((a,b) => a.date.localeCompare(b.date));

    let runningBal = 0.0;
    return history.map(entry => {
      runningBal = parseFloat((runningBal + entry.debit - entry.credit).toFixed(2));
      return {
        id: entry.id,
        date: entry.date,
        type: entry.type,
        reference_no: entry.reference_no,
        description: entry.description,
        debit_amount: entry.debit,
        credit_amount: entry.credit,
        running_balance: runningBal
      };
    });
  },

  // --- Auth Secure PIN ---
  getPIN: (): string | null => {
    return localStorage.getItem(PIN_KEY);
  },

  savePIN: (newPin: string) => {
    localStorage.setItem(PIN_KEY, newPin);
  },

  // --- Setup Reset ---
  isConfigured: (): boolean => {
    return localStorage.getItem(CUSTOMER_KEY) !== null;
  }
};
