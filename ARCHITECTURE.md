# SG Engineering Works Manager - Advanced Production-Grade Manufacturing ERP Specification

This document contains the finalized, production-ready, upgraded system architecture, database design, ER schema, repository patterns, operational workflows, and offline sync strategies for **SG Engineering Works Manager**.

Designed as a single-owner, offline-first system capable of supporting **10+ years of heavy manufacturing operational data** on a local Android device, this architecture avoids third-party platform costs, implements robust audit trails, establishes programmatic validation, and removes unnecessary state complexity.

---

## 1. Final System Architecture

The state architecture has been streamlined to remove enterprise state managers (such as NgRx or Akita) and replace them with a responsive, native-feeling **Angular Signals + RxJS Service-Repository** topology. This aligns with single-operator workloads while maintaining strict isolation, decoupling logic, and guaranteeing transactional safety.

```
┌──────────────────────────────────────────────────────────┐
│                       IONIC VIEW LAYER                   │
│   (Ionic Pages, Components, Angular Reactive Forms)      │
│   - Consumes Angular Signals for UI data-properties      │
│   - Triggers UI Actions through Component Controllers     │
└────────────┬───────────────────────────────────▲─────────┘
             │ Calls Action                      │ Updates UI Bound Signals
             ▼                                   │ (Computed/Writable)
┌────────────┴───────────────────────────────────┴─────────┐
│                     SERVICE LAYER                        │
│   - Business Logic & Manufacturing Engines (BOM, Profit) │
│   - Dynamic PDF Renderer (pdfmake Invoice Compilation)   │
│   - Google Drive Sync & Backup Integrity Service          │
│   - Disk-Level Image Storage & Orphan Cleanup Manager     │
└────────────┬───────────────────────────────────▲─────────┘
             │ Programmatic Calls                │ Emits Observables
             ▼                                   │ 
┌────────────┴───────────────────────────────────┴─────────┐
│                  REPOSITORY LAYER        │
│   - Decoupled Database Interfaces (UoW Transactions)      │
│   - SQL Script Generation & Raw Connection Execution     │
└────────────┬───────────────────────────────────▲─────────┘
             │ Executes Commands / Queries       │ Hydrates Datatables
             ▼                                   │ 
┌────────────┴───────────────────────────────────┴─────────┐
│               CAPACITOR SQLITE MODULE                    │
│   - Native SQLite Driver (SQLCipher PK Integration)       │
└────────────┬─────────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────────┐
│               ENCRYPTED LOCAL SQLITE FILE                │
│   - AES-256 SQLCipher Database on Protected Storage      │
└──────────────────────────────────────────────────────────┘
```

### Architectural Advancements
1. **State Management with Angular Signals**: View states (such as active selections, search queries, filters, and record lists) are represented as standard `WritableSignal` and `Computed` pipelines in services, providing optimal change tracking without lifecycle re-render patterns or excessive memory overhead.
2. **Programmatic Transaction Management**: Rather than relying on SQL triggers or generated columns, standard service modules orchestrate relational mutations (e.g. creating an invoice, deducting material inventories, logging stock movements, and updating profit calculations) by packaging multiple repository operations inside programmatic, isolated SQLite Transaction Blocks.
3. **Thread Safety & Connection Pools**: Capacitor SQLite database connections are kept persistent in memory via a singleton service, with sequential locking preventing thread collisions on rapid database writes.

---

## 2. Complete ER Diagram

This diagram displays the fully normalized tables, primary keys, foreign keys, and indexes required for transactional business consistency.

```
       +───────────────────────+                 +───────────────────────+
       │   COMPANY_SETTINGS    │                 │   SYSTEM_AUDIT_LOGS   │
       +───────────────────────+                 +───────────────────────+
       │ PK: id (UUID)         │                 │ PK: id (UUID)         │
       │ company_name          │                 │ event_timestamp       │
       │ address               │                 │ event_type            │
       │ mobile                │                 │ status                │
       │ email                 │                 │ details               │
       │ gstin                 │                 +───────────────────────+
       │ logo_image_path       │
       │ c_signature_path      │                 +───────────────────────+
       +───────────────────────+                 │    BACKUP_HISTORY     │
                                                 +───────────────────────+
       +───────────────────────+                 │ PK: id (UUID)         │
       │       SUPPLIERS       │                 │ backup_date           │
       +───────────────────────+                 │ backup_file_name      │
       │ PK: id (UUID)         │                 │ backup_type           │
       │ supplier_name         │                 │ backup_status         │
       │ contact_person        │                 │ notes                 │
       │ mobile (Index)        │                 +───────────────────────+
       │ address               │
       │ created_date          │
       +───────────┬───────────+
                   │ 1
                   │
                   │ N
       +───────────▼───────────+                 +───────────────────────+
       │     RAW_MATERIALS     │◄────────────────┤PRODUCT_MATERIALS (BOM)│
       +───────────────────────+ 1             N +───────────────────────+
       │ PK: id (UUID)         │                 │ PK: id (UUID)         │
       │ FK: supplier_id       │                 │ FK: product_id ───┐   │
       │ name (Index)          │                 │ FK: material_id   │   │
       │ quantity              │                 │ quantity_required │   │
       │ unit                  │                 │ unit              │   │
       │ purchase_cost         │                 +───────────────────+   │
       │ min_stock_level       │                                         │
       +───────────┬───────────+                                         │
                   │                                                     │
                   │ 1                                                   │
                   │                                                     │
                   │ N                                                   │
       +───────────▼───────────+                 +───────────────────+   │
       │INVENTORY_TRANSACTIONS │                 │     PRODUCTS      │◄──┘
       +───────────────────────+                 +───────────────────+ 1
       │ PK: id (UUID)         │                 │ PK: id (UUID)         │
       │ FK: material_id       │                 │ name (Index)          │
       │ transaction_type      │                 │ selling_price         │
       │ quantity              │                 │ manufacturing_cost    │
       │ transaction_date      │                 │ specs, image_path     │
       │ reference_type        │                 +───────────────────────+
       │ reference_id          │
       │ remarks               │                 +───────────────────────+
       +───────────────────────+                 │ CUSTOMER_INTERACTIONS │
                                                 +───────────────────────+
                                                 │ PK: id (UUID)         │
                                                 │ FK: customer_id ──┐   │
                                                 │ interaction_date  │   │
                                                 │ interaction_type  │   │
                                                 │ notes, followup   │   │
                                                 +───────────────────+   │
       +───────────────────────+                                         │
       │       CUSTOMERS       │◄────────────────────────────────────────┘
       +───────────────────────+ 1
       │ PK: id (UUID)         │
       │ name (Index)          │
       │ mobile (Index)        │
       │ outstanding_balance   │
       +───────────┬───────────+
                   │ 1
                   │
                   │ N
       +───────────▼───────────+                 +───────────────────────+
       │        ORDERS         │◄────────────────┤       REMINDERS       │
       +───────────────────────+ 1             N +───────────────────────+
       │ PK: id (UUID)         │                 │ PK: id (UUID)         │
       │ FK: customer_id       │                 │ FK: customer_id       │
       │ order_date (Index)    │                 │ FK: order_id          │
       │ status (Index)        │                 │ reminder_type, date   │
       │ est_delivery          │                 │ status                │
       +───────────┬───────────+                 +───────────────────────+
                   │
                   ├─────────────────────────────┬───────────────────────┐
                   │ 1                           │ 1                     │ 1
                   │                             │                       │
                   │ N                           │ N                     │ 1
       +───────────▼───────────+     +───────────▼───────────+     +─────▼─────────────────+
       │      ORDER_ITEMS      │     │       ORDER_WIP       │     │  ORDER_COST_SUMMARY   │
       +───────────────────────+     +───────────────────────+     +───────────────────────+
       │ PK: id (UUID)         │     │ PK: id (UUID)         │     │ PK: id (UUID)         │
       │ FK: order_id          │     │ FK: order_id          │     │ FK: order_id          │
       │ item_name, quantity   │     │ stage (Index)         │     │ material_cost         │
       │ unit_price, final     │     │ start_date, completion│     │ labour_cost           │
       +───────────────────────+     +───────────────────────+     │ transport, misc       │
                                                                   │ total_cost, revenue   │
                                                                   │ profit                │
                                                                   +───────────────────────+

       +───────────────────────+                 +───────────────────────+
       │       INVOICES        │◄────────────────┤       PAYMENTS        │
       +───────────────────────+ 1             N +───────────────────────+
       │ PK: id (UUID)         │                 │ PK: id (UUID)         │
       │ invoice_number (Index)│                 │ FK: customer_id       │
       │ FK: order_id          │                 │ FK: order_id          │
       │ invoice_date          │                 │ FK: invoice_id        │
       │ taxable_amount        │                 │ payment_amount        │
       │ gst_rate, cgst, sgst  │                 │ payment_date (Index)  │
       │ total_amount, due     │                 │ payment_method        │
       +───────────────────────+                 +───────────────────────+

       +───────────────────────+
       │       EXPENSES        │
       +───────────────────────+
       │ PK: id (UUID)         │
       │ expense_date (Index)  │
       │ category (Index)      │
       │ amount                │
       +───────────────────────+
```

---

## 3. Complete SQLite Database Schema (Production-Grade DDL)

This DDL avoids deprecated keywords, restricts generated columns (`GENERATED ALWAYS AS STORED` matches NO generated column rule), implements robust local data audit indexing, and establishes clean local tables. All primary keys utilize text-based UUIDs.

```sql
-- 1. Enable Native Foreign Key Enforcement
PRAGMA foreign_keys = ON;

-- 2. Company Settings Table
CREATE TABLE IF NOT EXISTS company_settings (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    address TEXT NOT NULL,
    mobile TEXT NOT NULL,
    alternate_mobile TEXT,
    email TEXT,
    gstin TEXT,
    logo_image_path TEXT,
    logo_image_name TEXT,
    logo_image_size INTEGER DEFAULT 0,
    signature_image_path TEXT,
    signature_image_name TEXT,
    signature_image_size INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 3. Suppliers Master Table
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    supplier_name TEXT NOT NULL,
    contact_person TEXT,
    mobile TEXT NOT NULL UNIQUE,
    alternate_mobile TEXT,
    email TEXT,
    address TEXT,
    created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_suppliers_mobile ON suppliers(mobile);

-- 4. Customers Lookup Table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL UNIQUE,
    alternate_mobile TEXT,
    address TEXT,
    email TEXT,
    gst_number TEXT,
    notes TEXT,
    outstanding_balance REAL NOT NULL DEFAULT 0.0,
    created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name COLLATE NOCASE);

-- 5. Customer Interaction Log Table
CREATE TABLE IF NOT EXISTS customer_interactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    interaction_date TEXT NOT NULL,
    interaction_type TEXT CHECK(interaction_type IN ('Phone Call', 'WhatsApp', 'Meeting', 'Site Visit', 'Delivery Discussion', 'Payment Follow Up', 'Other')) NOT NULL,
    notes TEXT,
    follow_up_date TEXT,
    created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interactions_customer ON customer_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_followup ON customer_interactions(follow_up_date);

-- 6. Product Catalog Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    specifications TEXT,
    manufacturing_cost REAL NOT NULL DEFAULT 0.0 CHECK(manufacturing_cost >= 0.0),
    selling_price REAL NOT NULL DEFAULT 0.0 CHECK(selling_price >= 0.0),
    image_path TEXT,
    image_name TEXT,
    image_size INTEGER DEFAULT 0,
    created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name COLLATE NOCASE);

-- 7. Raw Materials Inventory Table
CREATE TABLE IF NOT EXISTS raw_materials (
    id TEXT PRIMARY KEY,
    supplier_id TEXT,
    name TEXT NOT NULL UNIQUE,
    quantity REAL NOT NULL DEFAULT 0.0,
    unit TEXT NOT NULL CHECK(unit IN ('Piece', 'Kg', 'Gram', 'Meter', 'Foot', 'Litre')),
    purchase_cost REAL NOT NULL DEFAULT 0.0 CHECK(purchase_cost >= 0.0),
    minimum_stock_level REAL NOT NULL DEFAULT 0.0 CHECK(minimum_stock_level >= 0.0),
    updated_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_materials_name ON raw_materials(name COLLATE NOCASE);

-- 8. Manufacturing BOM (Bill of Materials) Mapping Table
CREATE TABLE IF NOT EXISTS product_materials (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    material_id TEXT NOT NULL,
    quantity_required REAL NOT NULL CHECK(quantity_required > 0.0),
    unit TEXT NOT NULL CHECK(unit IN ('Piece', 'Kg', 'Gram', 'Meter', 'Foot', 'Litre')),
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY(material_id) REFERENCES raw_materials(id) ON DELETE RESTRICT,
    UNIQUE(product_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_bom_product ON product_materials(product_id);

-- 9. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    order_date TEXT NOT NULL,
    estimated_delivery_date TEXT NOT NULL,
    actual_delivery_date TEXT,
    status TEXT CHECK(status IN ('Received', 'Material Procurement', 'Cutting', 'Welding', 'Assembly', 'Painting', 'Testing', 'Ready', 'Delivered', 'Cancelled')) NOT NULL DEFAULT 'Received',
    notes TEXT,
    created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_est_delivery ON orders(estimated_delivery_date);

-- 10. Order Line Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL DEFAULT 0.0 CHECK(unit_price >= 0.0),
    estimated_cost REAL NOT NULL DEFAULT 0.0 CHECK(estimated_cost >= 0.0),
    final_cost REAL NOT NULL DEFAULT 0.0 CHECK(final_cost >= 0.0),
    description TEXT,
    remarks TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_order ON order_items(order_id);

-- 11. Order WIP & Manufacturing Stages Tracking Table
CREATE TABLE IF NOT EXISTS order_wip (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    stage TEXT CHECK(stage IN ('Received', 'Material Procurement', 'Cutting', 'Welding', 'Assembly', 'Painting', 'Testing', 'Ready', 'Delivered')) NOT NULL,
    start_date TEXT NOT NULL,
    completion_date TEXT,
    remarks TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wip_order ON order_wip(order_id);
CREATE INDEX IF NOT EXISTS idx_wip_stage ON order_wip(stage);

-- 12. Invoices Managed Table (Includes Detailed Tax/GST Configurations)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    order_id TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    taxable_amount REAL NOT NULL CHECK(taxable_amount >= 0.0),
    gst_rate REAL NOT NULL DEFAULT 0.0 CHECK(gst_rate >= 0.0),
    cgst REAL NOT NULL DEFAULT 0.0 CHECK(cgst >= 0.0),
    sgst REAL NOT NULL DEFAULT 0.0 CHECK(sgst >= 0.0),
    igst REAL NOT NULL DEFAULT 0.0 CHECK(igst >= 0.0),
    total_amount REAL NOT NULL CHECK(total_amount >= 0.0),
    paid_amount REAL NOT NULL DEFAULT 0.0 CHECK(paid_amount >= 0.0 or paid_amount <= total_amount),
    due_amount REAL NOT NULL DEFAULT 0.0,
    created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- 13. Payments Module Table 
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    invoice_id TEXT,
    payment_amount REAL NOT NULL CHECK(payment_amount > 0.0),
    payment_date TEXT NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')) NOT NULL,
    notes TEXT,
    created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- 14. Complete Inventory Transaction Audit Journal
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL,
    transaction_type TEXT CHECK(transaction_type IN ('Stock-In', 'Stock-Out', 'Adjustment')) NOT NULL,
    quantity REAL NOT NULL,
    transaction_date TEXT NOT NULL,
    reference_type TEXT CHECK(reference_type IN ('BOM_Deduction', 'Purchase', 'Manual_Correction', 'Scrap')) NOT NULL,
    reference_id TEXT,
    remarks TEXT,
    FOREIGN KEY(material_id) REFERENCES raw_materials(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_material ON inventory_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_date ON inventory_transactions(transaction_date);

-- 15. Order Cost & Profit Analytics Consolidation (Calculated & Updated Programmatically in Services)
CREATE TABLE IF NOT EXISTS order_cost_summary (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    material_cost REAL NOT NULL DEFAULT 0.0 CHECK(material_cost >= 0.0),
    labour_cost REAL NOT NULL DEFAULT 0.0 CHECK(labour_cost >= 0.0),
    transport_cost REAL NOT NULL DEFAULT 0.0 CHECK(transport_cost >= 0.0),
    miscellaneous_cost REAL NOT NULL DEFAULT 0.0 CHECK(miscellaneous_cost >= 0.0),
    total_cost REAL NOT NULL DEFAULT 0.0 CHECK(total_cost >= 0.0),
    revenue REAL NOT NULL DEFAULT 0.0 CHECK(revenue >= 0.0),
    profit REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 16. Action Reminders & Local Notification Indexes
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    order_id TEXT,
    reminder_type TEXT CHECK(reminder_type IN ('Payment Due', 'Delivery Due', 'Follow Up', 'Inventory Alert')) NOT NULL,
    reminder_date TEXT NOT NULL,
    status TEXT CHECK(status IN ('Pending', 'Dismissed', 'Snoozed')) NOT NULL DEFAULT 'Pending',
    notes TEXT,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);

-- 17. Expenses Register Table
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    expense_date TEXT NOT NULL,
    category TEXT CHECK(category IN ('Raw Material', 'Labour', 'Transport', 'Electricity', 'Miscellaneous')) NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0.0),
    notes TEXT,
    created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- 18. Google Drive Sync History Table
CREATE TABLE IF NOT EXISTS backup_history (
    id TEXT PRIMARY KEY,
    backup_date TEXT NOT NULL,
    backup_file_name TEXT NOT NULL,
    backup_type TEXT CHECK(backup_type IN ('Manual', 'Auto_Daily', 'Auto_Weekly')) NOT NULL,
    backup_status TEXT CHECK(backup_status IN ('Success', 'Failed')) NOT NULL,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_backup_date ON backup_history(backup_date);

-- 19. Consolidated Local System Audit Log
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id TEXT PRIMARY KEY,
    event_timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT
);
```

---

## 4. Foreign Key Relationships Analysis

To prevent data serialization inconsistencies and maintain referential safety under completely offline environments:

1. **Suppliers & Raw Materials (`ON DELETE SET NULL`)**:
   - Deleting a supplier does not clear historic inventory catalogs. The raw material stock and consumption history persist with the supplier ID marked as `NULL`, enabling consistent valuation audits.
2. **Customers & Interactions (`ON DELETE CASCADE`)**:
   - Customer interaction records are dependent on Customer data. Deleting a customer purges interaction histories.
3. **Customers & Orders (`ON DELETE RESTRICT`)**:
   - A business operator is strictly prevented from deleting a customer who has registered operations. This prevents empty foreign bindings across Orders, Invoices, and Dues Ledger listings.
4. **Orders & Invoices/Payments (`ON DELETE RESTRICT`)**:
   - Order records cannot be deleted if associated invoices or payments exist. This preserves legal billing footprints and double-entry accuracy.
5. **Orders & Order Items/WIP/Cost Summaries (`ON DELETE CASCADE`)**:
   - Core sub-components of an order are deleted atomically alongside the parent order to keep the database footprint clean.

---

## 5. Indexing Strategy

To maintain rapid searches on the Android interface while storing over ten years of historical billing and order states, composite and COLLATE indexes are strategically placed:

* **Text Matching on Mobile Names**:
  Text indexes are generated using case-insensitive parameters to optimize physical search.
  - `idx_customers_name ON customers(name COLLATE NOCASE);`
  - `idx_suppliers_name ON suppliers(supplier_name COLLATE NOCASE);`
  - `idx_products_name ON products(name COLLATE NOCASE);`
* **Indexed Financial Audit Paths**:
  Speeds up the performance of accounts receivable reports and date-range invoice lookups.
  - `idx_payments_date ON payments(payment_date);`
  - `idx_invoices_number ON invoices(invoice_number);`
* **Nested Stage Progressing Indices**:
  Optimizes the loading of production Kanban lists.
  - `idx_wip_stage ON order_wip(stage);`
  - `idx_orders_status ON orders(status);`

---

## 6. Repository Pattern Design

The repository pattern handles the abstraction of database queries. Dynamic Unit-of-Work (UoW) helper classes allow bundling multi-table write tasks into isolated transactions.

### Core Billing & Invoice Repository Interface (`invoice.repository.ts`)

```typescript
import { Injectable } from '@angular/core';
import { DatabaseService } from '../core/services/database.service';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';

export interface IInvoiceEntity {
  id: string;
  invoice_number: string;
  order_id: string;
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

@Injectable({
  providedIn: 'root'
})
export class InvoiceRepository {
  constructor(private dbService: DatabaseService) {}

  /**
   * Persists a newly composed invoice and updates customer balance atomically.
   */
  public createInvoiceTransaction(invoice: IInvoiceEntity, customerId: string): Observable<void> {
    return this.dbService.getDbConnection().pipe(
      switchMap(async (db: SQLiteDBConnection) => {
        await db.execute('BEGIN TRANSACTION;');
        try {
          // 1. Insert Invoice Record
          const invoiceQuery = `
            INSERT INTO invoices (
              id, invoice_number, order_id, invoice_date, taxable_amount, 
              gst_rate, cgst, sgst, igst, total_amount, paid_amount, due_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `;
          await db.run(invoiceQuery, [
            invoice.id, invoice.invoice_number, invoice.order_id, invoice.invoice_date,
            invoice.taxable_amount, invoice.gst_rate, invoice.cgst, invoice.sgst,
            invoice.igst, invoice.total_amount, invoice.paid_amount, invoice.due_amount
          ]);

          // 2. Adjust Corresponding Customer Outstanding Balance
          const updateCustomerQuery = `
            UPDATE customers 
            SET outstanding_balance = outstanding_balance + ?, updated_date = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            WHERE id = ?;
          `;
          await db.run(updateCustomerQuery, [invoice.due_amount, customerId]);

          // 3. Log System Action
          const logId = crypto.randomUUID();
          const logQuery = `
            INSERT INTO system_audit_logs (id, event_type, status, details)
            VALUES (?, 'INVOICE_CREATED', 'Success', ?);
          `;
          await db.run(logQuery, [logId, `Invoice ${invoice.invoice_number} created for customer ${customerId}.`]);

          await db.execute('COMMIT;');
        } catch (error: any) {
          await db.execute('ROLLBACK;');
          throw new Error(`Invoice Transaction Rolled Back: ${error.message}`);
        }
      })
    );
  }

  /**
   * Performs dynamic full-text search against Invoice index.
   */
  public searchInvoices(query: string): Observable<IInvoiceEntity[]> {
    return this.dbService.getDbConnection().pipe(
      switchMap(db => {
        const sql = `
          SELECT * FROM invoices 
          WHERE invoice_number LIKE ? 
          ORDER BY invoice_date DESC;
        `;
        return from(db.query(sql, [`%${query}%`]));
      }),
      map(res => (res.values ? (res.values as IInvoiceEntity[]) : []))
    );
  }
}
```

---

## 7. Angular Folder Structure

```
src/
├── app/
│   ├── core/                           # Singleton Core Services
│   │   ├── guards/
│   │   │   ├── pin-lock.guard.ts       # Locks route stack if inactive
│   │   │   └── setup.guard.ts          # Onboarding detection
│   │   └── services/
│   │       ├── database.service.ts     # SQLite Lifecycle & Migrator
│   │       ├── security.service.ts     # PIN & Biometric Authorization
│   │       ├── backup.service.ts       # Cloud Archive Lifecycle Manager
│   │       ├── pdf-document.service.ts # Dynamic pdfmake Invoice compiler
│   │       └── media-local.service.ts  # Orphans image file cleanup
│   │
│   ├── shared/                         # Reusable Presentation Components
│   │   ├── modules/
│   │   │   └── shared-common.module.ts
│   │   ├── pipes/
│   │   │   └── rps-format.pipe.ts      # Indian Currency Formatter (12,34,567 formats)
│   │   └── components/
│   │       ├── d3-charts/              # Analytical Chart Framework (Custom D3)
│   │       └── search-dropdown/        # Async relational selector
│   │
│   ├── data/                           # Strict Data Model Architecture
│   │   ├── models/
│   │   │   ├── customer.model.ts
│   │   │   ├── logistics.model.ts      # Inventory & BOM Interfaces
│   │   │   └── financial.model.ts      # Tax, Payment & Invoice Interfaces
│   │   └── repositories/
│   │       ├── customer.repository.ts
│   │       ├── invoice.repository.ts
│   │       ├── manufacturing.repository.ts
│   │       ├── logistics.repository.ts
│   │       └── settings.repository.ts
│   │
│   └── modules/                        # Lazy-Loaded Views Context
│       ├── auth/                       # PIN locks & Key setup panels
│       ├── dashboard/                  # Dashboard containing Signals summary cards
│       ├── crm/                        # Customer profiles, timelines & statements
│       ├── operator/                   # Orders, WIP boards & Payments allocation
│       ├── warehouse/                  # Inventory counts, supplier directories & BOM sheets
│       ├── ledger/                     # Expenses logging & ledger analysis
│       ├── reporting/                  # Date-pickers & PDF report sheets
│       └── settings/                   # Backups, pin changes & logo uploads
├── assets/
└── index.html
```

---

## 8. Inventory Flow Diagram

The offline transaction logs register every raw structural update, guaranteeing trace tracking:

```
                  +──────────────────────────+
                  │ SUPPLIER PURCHASE ENTRY  │
                  +─────────────┬────────────+
                                │
                                ▼
                  +──────────────────────────+
                  │ STOCK-IN : UPDATE STORES │   (Logs positive record to
                  │   - Updates raw stock    ├───► inventory_transactions)
                  │   - Records unit purchase│
                  +─────────────┬────────────+
                                │
                  Order Status transforms to 'Manufacturing'?
                                │
                                ▼
                  +──────────────────────────+
                  │   AUTO-DEDUCTION ENGINE  │
                  │   - Queries Product BOM  │
                  │   - Computes components  │
                  +─────────────┬────────────+
                                │
                     Is Inventory Available?
                     ├── (Yes) ──► Apply Auto Deductions
                     │             - Deducts from `raw_materials`
                     │             - Records 'Stock-Out' log entry
                     │             - Updates active WIP timeline
                     │
                     └── (No)   ──► Flag Shortage Warning
                                   - Triggers 'Inventory Alert' reminder
                                   - Shows indicator on Materials List
```

---

## 9. Manufacturing Flow Diagram

```
           [ORDER RECEIVED : Received Stage]
                          │
                          ▼
    [MATERIAL PROCUREMENT : Procurement Stage]
  (Checks against BOM constraints - deducts stocks)
                          │
                          ├─────────────────────────────────────────────────┐
                          ▼                                                 ▼
             [FABRICATING : Cutting Stage]                    [ALERT: Stock deficiency]
                          │                                                 │
                          ▼                                          (Orders Supplier
             [FABRICATING : Welding Stage]                            fulfillment log)
                          │                                                 │
                          ▼                                                 │
            [FABRICATING : Assembly Stage]                                  │
                          │                                                 │
                          ▼                                                 │
             [FINISHING : Painting Stage]                                   │
                          │                                                 │
                          ▼                                                 │
             [QUALITY ASSURED : Testing Stage]                              │
                          │                                                 │
                          ▼                                                 │
              [COMPLETED : Ready Stage]                                    │
                          │                                                 │
                          ▼                                                 │
           [DISPATCHED : Delivered Stage] ◄─────────────────────────────────┘
  (Triggers Invoice Creation & Ledger entry)
```

---

## 10. Payment Flow Diagram

```
                             [INVOICE DELIVERED]
                         (Debit placed on Customer)
                                      │
                                      ▼
                        [LEDGER BALANCE INCREASES]
                        (Customers Statement list)
                                      │
                                      ▼
                        +───────────────────────────+
                        │ MULTI-PAYMENT ALLOCATION  │
                        +─────────────┬─────────────+
                                      │
                       Select Payment Mode: UPI, Cash, Bank?
                                      │
                                      ▼
                        +───────────────────────────+
                        │   TRANSACTION COMMITTED   │
                        │ - Inserts Payment record  │
                        │ - Updates Invoice Paid Bal│
                        │ - Reduces Customer Dues   │
                        +─────────────┬─────────────+
                                      │
                                      ▼
                        [DUES EQUAL TO INVOICE VALUE?]
                        ├── (Yes) ──► Mark Invoice 'Paid'
                        │             Hide due reminders
                        │
                        └── (No)  ──► Update partial balances
                                      Record remaining dues
```

---

## 11. Reporting Architecture

Analytical reporting is executed directly on the offline SQLite file system, utilizing complex queries instead of processing data in application loops:

### Dynamic aging analysis of Outstanding Payments
This query calculates aging-due intervals for accounts receivable, categorizing outstanding balances into standard 30, 60, and 90+ day buckets.

```sql
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    c.mobile as contact_number,
    COALESCE(SUM(i.due_amount), 0) as aggregate_outstanding,
    COALESCE(SUM(CASE WHEN (strftime('%s', 'now') - strftime('%s', i.invoice_date)) / 86400 <= 30 THEN i.due_amount ELSE 0 END), 0) as dues_0_30_days,
    COALESCE(SUM(CASE WHEN (strftime('%s', 'now') - strftime('%s', i.invoice_date)) / 86400 BETWEEN 31 AND 60 THEN i.due_amount ELSE 0 END), 0) as dues_31_60_days,
    COALESCE(SUM(CASE WHEN (strftime('%s', 'now') - strftime('%s', i.invoice_date)) / 86400 BETWEEN 61 AND 90 THEN i.due_amount ELSE 0 END), 0) as dues_61_90_days,
    COALESCE(SUM(CASE WHEN (strftime('%s', 'now') - strftime('%s', i.invoice_date)) / 86400 > 90 THEN i.due_amount ELSE 0 END), 0) as dues_above_90_days
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN invoices i ON o.id = i.order_id
WHERE i.due_amount > 0.0
GROUP BY c.id, c.name, c.mobile
ORDER BY aggregate_outstanding DESC;
```

### Monthly Operating Profit Matrix
Compiles sales revenues alongside manufacturing and material overhead costs to provide clear visibility into monthly operating profits.

```sql
SELECT 
    strftime('%Y-%m', i.invoice_date) as financial_month,
    COALESCE(SUM(i.taxable_amount), 0) as calculated_revenue,
    COALESCE(SUM(ocs.total_cost), 0) as total_manufacturing_cost,
    COALESCE(SUM(ocs.material_cost), 0) as direct_materials_cost,
    COALESCE(SUM(ocs.labour_cost), 0) as labour_overhead,
    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', i.invoice_date)) as structural_expenses,
    (COALESCE(SUM(i.taxable_amount), 0) - COALESCE(SUM(ocs.total_cost), 0) - (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', i.invoice_date))) as net_operating_profit
FROM invoices i
LEFT JOIN order_cost_summary ocs ON i.order_id = ocs.order_id
GROUP BY financial_month
ORDER BY financial_month DESC;
```

---

## 12. Backup & Restore Architecture

Since the application operates entirely serverless, backing up the central base repository depends on utilizing the user's private Google Drive storage space. To prevent the upload of corrupt files, a strict validation execution is run before every backup:

```
[TRIGGER BACKUP ACTIONS]
           │
           ▼
[Step 1: Check Database State Integrity]
- Executes: `PRAGMA integrity_check;`
- Returns "ok"? Proceed to Step 2.
- Returns Error? Stop sequence, log system fault, block sync.
           │
           ▼
[Step 2: Flush Log Queues to Disk]
- Writes WAL checkpoint: `PRAGMA wal_checkpoint(TRUNCATE);`
- Ensures all log data is flushed and written to the SQLite file on disk.
           │
           ▼
[Step 3: Compiling Archive Package]
- Compress SQLite DB using GZIP.
- Extract relative image directories from disk; bundle into archive.
           │
           ▼
[Step 4: Check Private Google Drive Workspace]
- Query Google Drive's hidden `appDataFolder` directory.
           │
           ▼
[Step 5: Backup Version Rotation]
- Count existing backup files.
- If total backups >= 7: Identify and delete the oldest backup file.
           │
           ▼
[Step 6: Database Transfer Upload]
- Stream compressed archive file using standard Multipart Form request payload.
- Log action in `backup_history` and `system_audit_logs` tracking events.
```

---

## 13. Security Architecture

1. **Secure App Lock screen**:
   - Access is managed via a dedicated lock page that intercepts route lifecycle transitions (`CanActivate` lock).
   - This page handles standard input entries for a 4-digit PIN stored in encrypted local storage.
2. **Local Key Derivation Engine**:
   - The user's master passcode is not stored as plain text. Instead, code entries undergo derivation matching using **PBKDF2 with SHA-256**, utilizing a unique device-level UUID to secure the hashing logic.
3. **Hardware Biometrics Layer**:
   - Implements bio-fingerprint matching using Capacitor native biometrics. Authorization triggers keys verification from the secure Android Keychain.
4. **Database-Level Encryption (SQLCipher)**:
   - Encrypts local tables and audit indexes on protected storage using SQLCipher AES-256 configurations, protecting raw business data from unauthorized access on rooted devices.

---

## 14. Performance Optimization Strategy

Operating on a local device for over ten years without a server requires careful and proactive database resource management:

1. **Disable Autocommit Overhead; Bundle Operations in Transactions**:
   - Executing sequential database inserts yields a separate write cycle for each row. Using explicit, programmatic transactions (`BEGIN TRANSACTION; ... COMMIT;`) bundles updates into a single write operation, improving application speed.
2. **Regular Vacuum Maintenance Cycles**:
   - Deleting rows leaves empty pages inside the SQLite binary structure, leading to file fragmentation. The database service executes maintenance operations periodically when available storage space allows:
     - `PRAGMA incremental_vacuum;`
     - `PRAGMA optimize;`
3. **Database Cache Allocation Tuning**:
   - Optimizes cache settings to match typical Android mobile memory limitations:
     `PRAGMA cache_size = -2000;` -- Allocates a dedicated 2MB in-memory buffer pool to accelerate recurring search queries.

---

## 15. Image & Storage Optimization Strategy

To keep the database lightweight and fast over a ten-year operational lifespan, image files are kept out of the SQLite binary itself. Storing large image files in a database causes file bloat and degrades performance over time.

### Local Disk-Level Image Storage
All photos (such as company logos, owner signatures, and product catalog designs) are stored as physical files in the secure Local Application sandbox directory on the Android device using Capacitor's Filesystem API.

### Catalog Database Representation
Catalog entries and settings tables store metadata only:

```sql
-- Represents raw SQLite product record structure
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_path TEXT, -- e.g. "relative_path/product_image_123.jpg"
    image_name TEXT, -- e.g. "product_image_123.jpg"
    image_size INTEGER DEFAULT 0 -- Encodes physical file size in bytes
);
```

### Orphaned Image Files Cleanup Program
Since deleting a product catalog entry or updating a configuration logo does not automatically delete physical files, an asynchronous cleanup job is executed automatically:

```typescript
import { Injectable } from '@angular/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { DatabaseService } from '../core/services/database.service';
import { forkJoin, from, Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MediaCleanupService {
  constructor(private dbService: DatabaseService) {}

  /**
   * Scans local filesystem image storage for orphans and purges untracked files.
   */
  public runOrphanedMediaCleanup(): Observable<number> {
    return this.dbService.getDbConnection().pipe(
      switchMap(async (db) => {
        // 1. Fetch valid stored reference paths from the inventory schemas
        const productRes = await db.query('SELECT image_name FROM products WHERE image_name IS NOT NULL;');
        const settingsRes1 = await db.query('SELECT logo_image_name FROM company_settings WHERE logo_image_name IS NOT NULL;');
        const settingsRes2 = await db.query('SELECT signature_image_name FROM company_settings WHERE signature_image_name IS NOT NULL;');

        const referencedFiles = new Set<string>();
        productRes.values?.forEach(val => referencedFiles.add(val.image_name));
        settingsRes1.values?.forEach(val => referencedFiles.add(val.logo_image_name));
        settingsRes2.values?.forEach(val => referencedFiles.add(val.signature_image_name));

        return { referencedFiles };
      }),
      switchMap(({ referencedFiles }) => {
        // 2. Read physical media files from local storage
        return from(Filesystem.readdir({
          path: 'media',
          directory: Directory.Data
        })).pipe(
          switchMap(async (dirResult) => {
            let filesDeleted = 0;
            const physicalFiles = dirResult.files || [];

            for (const fileInfo of physicalFiles) {
              // Delete files that are no longer referenced in the database
              if (!referencedFiles.has(fileInfo.name)) {
                await Filesystem.deleteFile({
                  path: `media/${fileInfo.name}`,
                  directory: Directory.Data
                });
                filesDeleted++;
              }
            }
            return filesDeleted;
          })
        );
      })
    );
  }
}
```

---

## 16. Module Dependency Architecture

```
                       ┌───────────────────────┐
                       │   COMPANY_SETTINGS    │
                       └───────────┬───────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │       SUPPLIERS       │
                       └───────────┬───────────┘
                                   │
                                   ▼
  ┌──────────────────┐ ┌───────────┴───────────┐ ┌──────────────────┐
  │ CUSTOMER_CENTER  │ │     RAW_MATERIALS     │ │     PRODUCTS     │
  └────────┬─────────┘ └───────────┬───────────┘ └────────┬─────────┘
           │                       │                      │
           │                       ▼                      │
           │           ┌───────────────────────┐          │
           │           │PRODUCT_MATERIALS (BOM)│◄─────────┘
           │           └───────────────────────┘
           │                       │
           └─────────────────┬─────┴──────────────────────┐
                             │                            │
                             ▼                            ▼
                       ┌───────────────────────┐   ┌───────────────┐
                       │        ORDERS         ├──►│   ORDER_WIP   │
                       └───────────┬───────────┘   └───────────────┘
                                   │
                                   ▼
  ┌──────────────────┐ ┌───────────┴───────────┐ ┌──────────────────┐
  │     INVOICES     │◄┤      ORDER_ITEMS      │ │ ORDER_C_SUMMARY  │
  └────────┬─────────┘ └───────────────────────┘ └────────┬─────────┘
           │                                              │
           ▼                                              ▼
  ┌──────────────────┐                           ┌──────────────────┐
  │     PAYMENTS     │                           │     EXPENSES     │
  └──────────────────┘                           └──────────────────┘
```

---

## 17. Recommended Implementation Sequence

To ensure systematic validation and maintain high platform integrity:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. INFRASTRUCTURE & ENCRYPTION STORAGE (SQLite, SQLCipher, Key derivation) │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 2. REPOSITORY PATTERNS & TRANSACTION ENGINES (UoW, DB connections locking) │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 3. MASTER CATALOGS & WORKFLOWS (Suppliers, Customers, Products, BOMs)      │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 4. ORDER TRANSACTIONS & INVENTORY (Order items, WIP status, Auto deductions)│
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 5. BILLING & REVENUE CHANNELS (Tax/GST dynamic Invoices, Payments tracking)│
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 6. LOCAL MEDIA & AUDIT ENGINE (Sandbox images, Media cleans, audit logs)   │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 7. REPORTING HUB & pdfmake SERVICES (Accounts Aging, Profit statements)    │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 8. GOOGLE DRIVE BACKUP ROTATOR (Integrity checker, 7-backup version cap)   │
└────────────────────────────────────────────────────────────────────────────┘
```
