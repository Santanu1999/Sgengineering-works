# SG Engineering Works Manager - Complete Architecture & Implementation Foundation

This document specifies the finalized, production-grade application architecture, database lifecycle layer, repository/service boundaries, and offline execution strategies for **SG Engineering Works Manager**. 

Designed as a single-owner, zero-maintenance (zero-hosting cost), local Android-only application, this foundation is built to sustain **10+ years of dense operational history** using a high-performance **Angular Signals + Capacitor SQLite** design.

---

## 1. Complete Project Folder Structure

The layout follows a modular, feature-by-domain architecture. This isolates core singletons, shared UI constructs, strongly-typed data entities, and clean-cut domain scopes to ensure high maintainability as features scale.

```
src/
├── app/
│   ├── core/                           # Infrastructure & Platform Singletons (App-wide)
│   │   ├── database/
│   │   │   ├── database.service.ts     # Main SQLite initializer, connection pooler, & backup orchestrator
│   │   │   ├── schema.constants.ts     # Full frozen SQLite DDL schemas & seed variables
│   │   │   └── migrations.ts           # Dynamic serial migration runner maps
│   │   ├── guards/
│   │   │   ├── auth-lock.guard.ts      # Enforces local lock screen state checks on app boot / resume
│   │   │   └── onboarding.guard.ts     # Directs first-time configuration setup flows
│   │   ├── services/
│   │   │   ├── security.service.ts     # PBKDF2/SHA-256 local keys & biometric hardware drivers
│   │   │   ├── backup.service.ts       # Cloud Archive Lifecycles & Google Drive REST interface
│   │   │   ├── pdf-document.service.ts # In-memory pdfmake layout engine (Dynamic invoice rendering)
│   │   │   └── media-local.service.ts  # Orphans image storage cleanup operations
│   │   └── core.module.ts
│   │
│   ├── shared/                         # Reusable Presentation Layer Assets
│   │   ├── components/
│   │   │   ├── d3-charts/              # Custom lightweight, high-performance D3 widgets (Zero external chart libraries)
│   │   │   │   ├── monthly-pnl-chart.component.ts
│   │   │   │   └── stage-distribution.component.ts
│   │   │   ├── search-overlay/         # Debounced matching auto-complete lookups (Indexed memory lookup)
│   │   │   └── status-badge/           # Responsive visual UI state pills
│   │   ├── directives/
│   │   │   └── touch-feedback.directive.ts # Android native ripple animations & touch target sizing safety (Min 44px)
│   │   ├── pipes/
│   │   │   └── rps-format.pipe.ts      # Custom Indian Rupee formatter (Lakhs/Crores grouping: ₹12,34,567.00)
│   │   └── shared.module.ts
│   │
│   ├── data/                           # Strict Decoupled Data Isolation Layer
│   │   ├── models/                     # Shared Entity Interfaces
│   │   │   ├── company.model.ts
│   │   │   ├── customer.model.ts
│   │   │   ├── logistics.model.ts      # Raw Materials, Suppliers, Products & BOMs
│   │   │   ├── financials.model.ts     # Invoices, Payments, Expenses & Turnovers
│   │   │   └── system.model.ts         # Audit Logs, Backups, and Reminders
│   │   └── repositories/               # Raw SQLite Query Execution Modules (Decoupled from UI)
│   │       ├── customer.repository.ts
│   │       ├── order.repository.ts
│   │       ├── invoice.repository.ts
│   │       ├── supplier.repository.ts
│   │       ├── inventory.repository.ts # Raw materials, BOMs, WIP state queries
│   │       ├── product.repository.ts
│   │       ├── expense.repository.ts
│   │       ├── reminder.repository.ts
│   │       └── backup.repository.ts
│   │
│   └── modules/                        # Lazy-Loaded Isolated Feature Core Domains
│       ├── auth-gate/                  # Secure Lock screens (Keypads, Local fingerprint authorizations)
│       ├── dashboard/                  # Global Business Health cockpit (Signal State bindings)
│       ├── customers/                  # CRM profiles, detailed timelines & statements
│       ├── orders/                     # Orders Creation sheets, Payments Allocation & WIP stages kanbans
│       ├── products/                   # Catalog item definitions & BOM layout managers
│       ├── inventory/                  # Stock count indexes, low raw alerts & supplier registers
│       ├── expenses/                   # Simple operating expenditure ledgers
│       ├── reports/                    # Date range controls & dynamic PDF generation sheets
│       └── settings/                   # Backups, PIN locks, profile setups & media cleanups
│
├── assets/
│   ├── icon/                           # Custom app launch icons
│   └── fonts/                          # Bound local fonts for offline access
├── theme/
│   └── variables.css                   # Custom light/dark themes using strict Ionic standards
└── index.html
```

---

## 2. Database Layer (`DatabaseService` Architecture)

The persistent core database is governed by `DatabaseService`. It initiates raw connections, enforces schema integrity, executes serial structural updates, and supports system diagnostic capabilities.

```
                  +──────────────────────────+
                  │   Core Engine Bootstrap  │
                  +─────────────┬────────────+
                                │
                                ▼
                  +──────────────────────────+
                  │ Capacitor SQLite Native  │   (Open SQLite Database Connection)
                  │   Driver Registration    │
                  +─────────────┬────────────+
                                │
                                ▼
                  +──────────────────────────+
                  │ SQLite Encryption Check   │   (Attempt decipher using PBKDF2 Master Key)
                  │ - SQLCipher AES-256 Lock │
                  +─────────────┬────────────+
                                │
                                ▼
                  +──────────────────────────+
                  │ Schema Migration Engine  │   (Compare CURRENT schema version with target migrations)
                  │ - Runs Serial DDL blocks │
                  +─────────────┬────────────+
                                │
                                ▼
                  +──────────────────────────+
                  │   Foreign Key Activation │   (Executes: `PRAGMA foreign_keys = ON;`)
                  +─────────────┬────────────+
                                │
                                ▼
                  +──────────────────────────+
                  │ Active Connection Pool   │   (Exposes BehaviorSubject connection token)
                  +──────────────────────────+
```

### Key Lifecycle Operations
1. **Migrations & Versioning Strategy**:
   The user's local version states are recorded inside SQLite `PRAGMA user_version`. When booting the application, `DatabaseService` checks `user_version` against the migration map. Changes are executed sequentially within transactional boundaries, maintaining backwards compatibility with historical data structures.
2. **Dynamic Transaction Wraps**:
   Ensures absolute data safety by exposing an isolated database connection handler capable of processing batch queries natively in ACID-compliant routines:
   ```typescript
   public executeInTransaction(queries: { statement: string, values: any[] }[]): Observable<void>;
   ```
3. **Pre-Backup Integrity Validation Checks**:
   To prevent corrupt data from overwriting safe cloud records, a verification routine is executed before exporting databases:
   ```sql
   PRAGMA integrity_check;
   ```
   If this check returns values other than `ok`, the backup aborts, a warning log is recorded in `system_audit_logs`, and the user is alerted to the issue.

---

## 3. Repository Layer Design

Repositories are the database access layer, decanting raw SQL matrices into clean TypeScript arrays. They bypass intermediate state drivers, running operations directly on the persistent database.

| Repository Key | Master Operational Responsibilities | Primary Complex Methods / Queries |
| :--- | :--- | :--- |
| **CustomerRepository** | CRM profiles index, rapid query indices, interactions & customer ledger tracking. | `getCustomerLedgerAccount(id): Observable<ILedgerStatement>` |
| **OrderRepository** | Handles multiphasic fabrication pipelines, line allocations, and delivery timing. | `updateWIPStage(orderId, newStage, remarks): Observable<void>` |
| **InvoiceRepository** | Tax-adjusted billing logs, due tracking, and reprint index searches. | `createInvoice(IInvoice, custId): Observable<void>` (Isolated UoW lock) |
| **PaymentRepository** | Ledger clearance allocations, deposit registries, and outstanding balance syncs. | `applyPayment(IPayment, invoiceId?): Observable<void>` |
| **SupplierRepository** | Master commercial listings, raw materials matching, and fulfillment listings. | `getSupplierHistory(id): Observable<ISupplierBalanceSheet>` |
| **InventoryRepository** | Stock level adjustments, raw materials cataloging, shortage reports, and BOM definitions. | `executeBOMDeduction(orderId, productId, qty): Observable<void>` |
| **ProductRepository** | Manufacturing inventory catalogs, product specs, and blueprint lists. | `saveBOMMapping(productId, IProductMaterial[]): Observable<void>` |
| **ExpenseRepository** | Quick ledger entries, operating budget categorizations, and expense metrics. | `getExpenseSummaryByRange(from, to): Observable<IExpensesByCategory[]>` |
| **ReminderRepository** | Real-time pending follow-ups, low inventories, and outstanding due alerts. | `getPendingRemindersCount(): Observable<Record<string, number>>` |
| **BackupRepository** | Standardizing local logs, tracking backup counts, and maintaining history. | `writeBackupLog(IBackupHistory): Observable<string>` |

---

## 4. Service Layer Design & Business Logic Rules

The Service Layer acts as the business logic coordinator, handling data validation, programmatic calculations, and state dispatching to the presentation views using Angular Signals.

### CustomerService
- **Business Rule Strategy**: Enforces complete data validation prior to SQL insertion. A mobile number must strictly match standard patterns (10 digits). Modifying alternate phone numbers prevents overlapping records.
- **Outstandings Sync Engine**: When a customer detail is loaded, dynamic database audits count all lifetime invoices minus payments, programmatically writing the exact differences to `outstanding_balance` inside the customer record.

### OrderService
- **BOM Materials Tracker**: Initiating production on catalog items automatically triggers stock deduction logic in `InventoryService` based on Bill of Materials constraints.
- **Production Stage Controller**: Tracks manufacturing milestones. Milestone status updates are restricted to forward progressions (e.g. from `Material Procurement` to `Cutting`, not skipped directly to `Ready`), unless overridden by administrative actions.

### PaymentService
- **Double Entry Proof Checks**: The system prevents recording a payment amount that exceeds the remaining dues of an order. Partial payments automatically reduce the invoice's `due_amount` and the corresponding customer's `outstanding_balance`.

### InvoiceService
- **Tax Mapping Calculations**: Programmatically computes GST parameters based on the tax configuration of the company settings before generating the invoice record:
  - `taxable_amount` = `gross invoice amount` / (1 + (`gst_rate` / 100))
  - If Interstate transaction: `igst` = `taxable_amount` * (`gst_rate` / 100)
  - Else domestic: `cgst` = `sgst` = (`taxable_amount` * (`gst_rate` / 100)) / 2

### InventoryService
- **Automatic Stock Allocations**: When order fabrications start, raw stock quantities are parsed. If a component's stock level falls below its configured `minimum_stock_level`, the system records an automated `Inventory Alert` inside the reminders ledger.

---

## 5. Routing Structure

Routing uses clean dynamic module loadings (lazy-loading pattern) to optimize app boot speeds on standard mobile devices, keeping the memory footprint lightweight.

```typescript
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthLockGuard } from './core/guards/auth-lock.guard';
import { OnboardingGuard } from './core/guards/onboarding.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'gate',
    pathMatch: 'full'
  },
  {
    path: 'gate',
    loadChildren: () => import('./modules/auth-gate/auth-gate.module').then(m => m.AuthGateModule)
  },
  {
    path: 'app',
    canActivate: [AuthLockGuard, OnboardingGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'customers',
        loadChildren: () => import('./modules/customers/customers.module').then(m => m.CustomersModule)
      },
      {
        path: 'orders',
        loadChildren: () => import('./modules/orders/orders.module').then(m => m.OrdersModule)
      },
      {
        path: 'products',
        loadChildren: () => import('./modules/products/products.module').then(m => m.ProductsModule)
      },
      {
        path: 'warehouse',
        loadChildren: () => import('./modules/inventory/inventory.module').then(m => m.InventoryModule)
      },
      {
        path: 'ledger',
        loadChildren: () => import('./modules/expenses/expenses.module').then(m => m.ExpensesModule)
      },
      {
        path: 'reports',
        loadChildren: () => import('./modules/reports/reports.module').then(m => m.ReportsModule)
      },
      {
        path: 'settings',
        loadChildren: () => import('./modules/settings/settings.module').then(m => m.SettingsModule)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'gate'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
```

---

## 6. Complete Application Screen Inventory

### Dashboard Area
- **Cockpit Summary Page**: High-density business summary and visual analytics metrics.

### Customer Hub (CRM Profile & Accounts Ledger)
- **Customer Directory**: Interactive customer search list (collates name and phone index matches).
- **Customer Workspace Form**: Integrated creator/editor with strict input formatting.
- **Customer Operational Details**: Full records profile displaying outstanding balances and active delivery timelines.
- **Customer Financial Ledger**: Running statement statement displays highlighting debits and credits with an option to compile dynamic Account Statement PDFs.
- **Customer Interaction Diary**: Timeline interface log for WhatsApp, calls, meeting updates, and followup scheduling.

### Sales Operations (Fabrication Workstations & Deliveries)
- **Orders Pipeline Board**: Visual Kanban grouping orders by production phase filters.
- **Orders Placement sheets**: Interactive form supporting customer associations, multi-item declarations, specifications, and delivery forecasts.
- **Orders Operational Detail**: Direct workspace linking line items with active WIP stages logs.
- **Operations WIP Timeline tracker**: Full interactive tracking timeline displaying welding, assembly, and testing completion logs.
- **Payments Manager allocation**: Payments coordinator tracking received amounts, updating ledger dues, and logging micro-payments.

### Warehouses & Logistics (Suppliers, Bill of Materials, & Raw Stocks)
- **Raw Warehousing Inventory List**: Active stock level monitor with low-stock warnings highlighted in red.
- **Stock adjustments logbook**: Register log for manual adjustments, scraps, and supplier purchases.
- **Suppliers registry listing**: Standard index listings linking suppliers with associated raw materials catalogs.
- **Suppliers form builder**: Standard directory record generator.
- **Unified Catalog BOM Manager**: Interactive editor linking inventory products with component requirements using Unit of Measure standards.

### Daily Bookkeeping (Expenses Tracker)
- **Operating cost register**: Lists recent overhead payments, labor wages, or raw shipping records.
- **Expense ledger compiler**: Integrated expense logging form.

### Reports Center
- **Dynamic analytical portal**: Single screen interface with modular parameters (custom date pickers, customer records, supplier accounts) to compile Dynamic PDF statements on demand.

### Control Preferences
- **System settings desk**: Profile information setups, owner signature uploads, PIN modifications, and Google Drive recovery configuration consoles.

---

## 7. Operational Dashboard Design

The dashboard uses high-contrast visual metric cards and responsive D3 chart widgets to display key performance indicators (KPIs) clearly.

```
+───────────────────────────────────────────────────────────────────────────────+
│                            SG OPERATIONAL DASHBOARD                           │
+───────────────────────────────────────────────────────────────────────────────+
│                                                                               │
│  [ CUSTOMERS ]     [ ORDERS ]       [ NET REVENUE ]    [ OUTSTANDING DUES ]   │
│     * 142 *          * 18 *          * ₹12,45,000 *        * ₹2,85,000 *       │
│                                                                               │
│  [ EXPENSES ]      [ NET PROFIT ]   [ LOW STOCKS ]     [ UPCOMING Dispatches] │
│   * ₹3,80,000 *     * ₹8,65,000 *        * 4 *               * 3 *            │
│                                                                               │
│  +─────────────────────────────────────────────────────────────────────────+  │
│  │ D1: Monthly Profitability Matrix                                        │  │
│  │ (D3 Chart: Month-on-Month comparative bars: Revenues vs Total Costs)     │  │
│  +─────────────────────────────────────────────────────────────────────────+  │
│                                                                               │
│  +─────────────────────────────────────────────────────────────────────────+  │
│  │ D2: Production Distribution Pipeline                                     │  │
│  │ (D3 Chart: Stage distribution: Cutting, Welding, Assembly, to Testing)  │  │
│  +─────────────────────────────────────────────────────────────────────────+  │
│                                                                               │
+───────────────────────────────────────────────────────────────────────────────+
```

### Dashboard Analytical Queries
The dashboard updates all metric cards dynamically on initialization using a single query:
```sql
SELECT 
    (SELECT COUNT(id) FROM customers) as count_customers,
    (SELECT COUNT(id) FROM orders WHERE status != 'Delivered' AND status != 'Cancelled') as open_orders,
    (SELECT COALESCE(SUM(total_amount), 0.0) FROM invoices) as turnover_revenue,
    (SELECT COALESCE(SUM(amount), 0.0) FROM expenses) as operating_expenses,
    (SELECT COALESCE(SUM(due_amount), 0.0) FROM invoices) as current_receivables,
    (SELECT COUNT(id) FROM raw_materials WHERE quantity < minimum_stock_level) as short_materials_count;
```

---

## 8. High-Performance Global Search Architecture

To ensure fast search performance as data scales over ten years, typing matches do not run loose, un-indexed text queries. Instead, the application implements a unified search processor using indexed columns:

* **Customer Index Searches**: Matches typed queries against customer indexes, utilizing COLLATE NOCASE and indexing configurations.
  ```sql
  SELECT id, name, mobile, outstanding_balance FROM customers WHERE name LIKE ? OR mobile LIKE ? LIMIT 20;
  ```
* **Invoice Directory Searches**: Resolves historical invoices using exact string numbers.
  ```sql
  SELECT id, invoice_number, total_amount, due_amount FROM invoices WHERE invoice_number LIKE ? LIMIT 10;
  ```
* **Composite Query Pipeline Flow**:
  ```
  [User inputs query string on keyboard interface]
                         │
                         ▼ (Debounced exactly 200ms in Angular Signal)
             [Global Search Service]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
  Is search alphanumeric?           Is search numeric?
  - Query Customer names COLLATE    - Query mobile indexes
  - Query Catalog products          - Query invoice number indexs
        │                                 │
        └────────────────┬────────────────┘
                         ▼
  [Merged result matrices returned to display screen list overlay results]
  ```

---

## 9. Offline Reliability & Failure Recovery Strategies

Since the application runs entirely offline on local Android devices, it incorporates robust strategies to prevent data loss or corruption:

### Data Write Consistency
All multi-table insertions (e.g., creating an order line transaction and updating raw material stock balances simultaneously) are executed within programmatic database transactions. Any inner check failures trigger an immediate rollback, returning state registers to their baseline.

### Database Corruption Prevention and Recovery
- **WAL Journaling Mode**: Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) prevents write operations from blocking search queries, reducing the risk of file access locks.
- **App Crash Protection**: During startup, `DatabaseService` runs `PRAGMA integrity_check;`. If a corruption issue is detected (e.g., due to an abrupt device power cut):
  ```
  [Database Boot Checks detect file system faults]
                         │
                         ▼
  [Lock down application; show Recovery Dashboard]
                         │
                         ▼
  [Prompt User to Retrieve verified backup from cloud storage]
                         │
                         ▼ (Establish OAuth API token validation)
  [Download verified GZip database file from Google Drive]
                         │
                         ▼ (Validate Integrity check: pragma returns 'ok')
  [Overwrite local corrupt DB file with cloud restore state]
                         │
                         ▼
  [Restart Database Engine and restore standard operational access]
  ```

---

## 10. Complete Development Roadmap & Recommended Phases

This roadmap coordinates the development tasks sequentially, ensuring each module has its underlying data models, repositories, and transaction controls ready before UI implementation begins.

```
 PHASE 1: Storage Layer & Security Setup (Weeks 1-2)
 ├─ Establish Capacitor SQLCipher encrypted storage profiles
 ├─ Execute core schema setups & test relational migrations
 └─ Build PIN lock page and secure local encryption key derivations
                   │
                   ▼
 PHASE 2: Customer Registry & Ledger statements (Weeks 3-4)
 ├─ Deliver CRM profiles, form registers & interaction diaries
 ├─ Write Customer ledger account double-entry calculations
 └─ Integrate pdfmake to compile Account Statements dynamically
                   │
                   ▼
 PHASE 3: Product Catalogs & Orders Assembly (Weeks 5-6)
 ├─ Construct catalogs schemas and BOM component specifications
 ├─ Implement orders placement sheets & multi-line item builders
 └─ Deliver Operations WIP stage tracking Kanbans
                   │
                   ▼
 PHASE 4: Stocks Allocations & Automatic Deduct Inventory (Weeks 7-8)
 ├─ Build raw stocks trackers, supplier tables & adjustments logbooks
 ├─ Write Auto-Deduction Engine (reduces raw stock counts on fabrication start)
 └─ Integrate shortage reminder notifications and inventory alert triggers
                   │
                   ▼
 PHASE 5: BIlling, Invoicing & Financial Accounting (Weeks 9-10)
 ├─ Construct invoices databases with dynamic GST rules
 ├─ Build micro-payments allocation managers and tracking ledgers
 └─ Deliver profit computations & cost tracking engines (order_cost_summary)
                   │
                   ▼
 PHASE 6: Analytical Charts, Dashboards, & Reports (Weeks 11-12)
 ├─ Render comparative MoM cost bars and WIP stage pies using D3
 ├─ Deliver report generators supporting date ranges and PDF exports
 └─ Build global search engines utilising SQL index registers
                   │
                   ▼
 PHASE 7: Google Drive Vault Keepers Sync & Polish (Weeks 13-14)
 ├─ Integrate Google Drive cloud client restore controllers
 ├─ Set automatic backup reminders and database validation steps
 └─ Perform edge-case stress tests & deploy production builds
```
