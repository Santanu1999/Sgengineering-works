import { Component, OnInit, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { IPayment, IOrderPaymentSummary, PaymentMethod } from '../../../../data/models/payment.interface';

@Component({
  selector: 'app-payment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="payment-list-container p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-7xl mx-auto space-y-6">
      
      <!-- Title Header segment -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold font-serif tracking-tight text-slate-100 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Accounts Collection & Payments Panel</span>
          </h2>
          <p class="text-xs text-slate-400 font-sans mt-1">
            Track customer payments, allocate dues to specific orders, and audit the outstanding ledger logs in real-time.
          </p>
        </div>

        <div class="flex gap-2 shrink-0">
          <button
            (click)="triggerViewLedger()"
            class="px-4 py-2 border border-slate-800 bg-slate-950/20 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold tracking-wide transition flex items-center gap-2 cursor-pointer"
          >
            <span>📜 View customer Statements</span>
          </button>
          
          <button
            (click)="triggerCreatePayment()"
            id="btn-create-payment-trigger"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold tracking-wide transition shadow-lg shadow-emerald-500/10 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>+ Record Received Payment</span>
          </button>
        </div>
      </div>

      <!-- Financial Metrics Signals Deck -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Collected Ledger -->
        <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Aggregate Receipts (Payments)</div>
          <div class="text-2xl font-bold text-emerald-400 tracking-tight">₹{{ collectedAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</div>
          <div class="text-[10px] text-slate-500 font-sans">Lifetime cleared receipts synced</div>
        </div>

        <!-- Total Logged Transactions -->
        <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Collected Receipts Count</div>
          <div class="text-2xl font-bold text-blue-400 tracking-tight">{{ totalPayments() }} Transactions</div>
          <div class="text-[10px] text-slate-500 font-sans">Audit-safe double-entry entries</div>
        </div>

        <!-- Receivables Outstanding Balance -->
        <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Outstanding Accounts Receivables</div>
          <div class="text-2xl font-bold text-rose-400 tracking-tight">₹{{ outstandingAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</div>
          <div class="text-[10px] text-slate-500 font-sans">Active billing dues awaiting clearance</div>
        </div>
      </div>

      <!-- Main Navigation Tab bar -->
      <div class="flex border-b border-slate-800">
        <button
          (click)="activeTab.set('payments')"
          [class.border-emerald-500]="activeTab() === 'payments'"
          [class.text-emerald-400]="activeTab() === 'payments'"
          class="px-5 py-3 border-b-2 border-transparent text-xs font-semibold tracking-wide text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          💳 Receipts Log Book
        </button>
        
        <button
          (click)="activeTab.set('orders')"
          [class.border-emerald-500]="activeTab() === 'orders'"
          [class.text-emerald-400]="activeTab() === 'orders'"
          class="px-5 py-3 border-b-2 border-transparent text-xs font-semibold tracking-wide text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          🎯 Orders Dues & Outstanding Summary
        </button>
      </div>

      <!-- TAB 1: RECEIPTS TRANSACTION HISTORY LOGS -->
      <div *ngIf="activeTab() === 'payments'" class="space-y-4">
        <!-- Filters Area -->
        <div class="p-4 bg-slate-950/30 border border-slate-850 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Text Matches -->
          <div class="space-y-1.5 col-span-1 md:col-span-2">
            <label class="text-[10px] font-mono uppercase text-slate-400">Search Receipts</label>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="applyLocalFilters()"
              placeholder="Search Order Number, Customer, Receipt ID, Remarks..."
              class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition"
            />
          </div>

          <!-- Payment Method Filter -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase text-slate-400">Payment Method</label>
            <select
              [(ngModel)]="selectedMethod"
              (ngModelChange)="applyLocalFilters()"
              class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="">All Payment Methods</option>
              <option *ngFor="let m of methods" [value]="m">{{ m }}</option>
            </select>
          </div>

          <!-- Date Filters Range -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase text-slate-400">Collections Date Range</label>
            <div class="flex gap-2">
              <input
                type="date"
                [(ngModel)]="fromDate"
                (ngModelChange)="applyLocalFilters()"
                class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-slate-400 outline-none focus:border-emerald-500 transition"
                title="Start Date"
              />
              <input
                type="date"
                [(ngModel)]="toDate"
                (ngModelChange)="applyLocalFilters()"
                class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-slate-400 outline-none focus:border-emerald-500 transition"
                title="End Date"
              />
            </div>
          </div>
        </div>

        <!-- Receipts Data Grid Table -->
        <div class="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-800/80 bg-slate-900/60 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                <th class="px-5 py-4">Receipt Date</th>
                <th class="px-5 py-4">Customer Details</th>
                <th class="px-5 py-4">Allocated Order #</th>
                <th class="px-5 py-4">Deposit Channel</th>
                <th class="px-5 py-4">Reference Codes</th>
                <th class="px-5 py-4">Verification Remarks</th>
                <th class="px-5 py-4 text-right">Cleared Amount</th>
                <th class="px-5 py-4 text-center">Controls</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-850/60 text-xs">
              <tr *ngFor="let p of payments()" class="hover:bg-slate-850/30 transition text-slate-300">
                <!-- Payment date -->
                <td class="px-5 py-4 font-mono">{{ p.payment_date | date:'dd MMM yyyy' }}</td>
                
                <!-- Customer info -->
                <td class="px-5 py-4 font-semibold text-slate-100">{{ p.customer_name }}</td>
                
                <!-- Allied Order number -->
                <td class="px-5 py-4 font-mono text-blue-400 font-bold">
                  {{ p.order_number || 'N/A' }}
                </td>

                <!-- Payment Method Badge -->
                <td class="px-5 py-4">
                  <span [ngClass]="getMethodClasses(p.payment_method)" class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                    {{ p.payment_method }}
                  </span>
                </td>

                <!-- Internal Txn reference -->
                <td class="px-5 py-4 font-mono text-slate-400">{{ p.reference_no || '---' }}</td>

                <!-- Remarks -->
                <td class="px-5 py-4 text-slate-400">{{ p.remarks || '---' }}</td>

                <!-- Applied amount credit and balance details -->
                <td class="px-5 py-4 text-right font-mono font-bold text-emerald-400 text-sm">
                  ₹{{ p.payment_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                </td>

                <!-- Row Controls -->
                <td class="px-5 py-4 text-center">
                  <div class="flex items-center justify-center space-x-2">
                    <button
                      (click)="triggerEditPayment(p)"
                      class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                      title="Edit Transaction Details"
                    >
                      ✏️
                    </button>
                    <button
                      (click)="triggerDeletePayment(p)"
                      class="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title="Purge Transaction log"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>

              <tr *ngIf="payments().length === 0">
                <td colspan="8" class="px-5 py-12 text-center text-slate-500 font-sans">
                  No payment receipt records found. Try adjusting dates or search queries.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: ORDERS DUE CALCULATIONS STATEMENT -->
      <div *ngIf="activeTab() === 'orders'" class="space-y-4">
        <!-- Quick Search Bar -->
        <div class="p-4 bg-slate-950/30 border border-slate-850 rounded-xl">
          <div class="space-y-1.5 max-w-md">
            <label class="text-[10px] font-mono uppercase text-slate-400">Search Orders Outstanding Matrix</label>
            <input
              type="text"
              [(ngModel)]="orderSearchQuery"
              (ngModelChange)="applyOrderSummaryFilters()"
              placeholder="Filter by Order ID or Client Name..."
              class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        <!-- Order Summary Cards Grid -->
        <div class="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-800/80 bg-slate-900/60 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                <th class="px-5 py-4">Fabrication Job #</th>
                <th class="px-5 py-4">Customer Segment</th>
                <th class="px-5 py-4 text-right">Order Ledger Total (A)</th>
                <th class="px-5 py-4 text-right">Cleared Payments (B)</th>
                <th class="px-5 py-4 text-right">Outstanding Receivable (A - B)</th>
                <th class="px-5 py-4 text-center">Receipt Options</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-850/60 text-xs">
              <tr *ngFor="let s of orderSummaries()" class="hover:bg-slate-850/30 transition text-slate-300">
                <!-- Job number -->
                <td class="px-5 py-4 font-mono font-bold text-blue-400">{{ s.order_number }}</td>

                <!-- Customer profile -->
                <td class="px-5 py-4">
                  <div class="font-semibold text-slate-100">{{ s.customer_name }}</div>
                </td>

                <!-- Order total aggregate billing valuation -->
                <td class="px-5 py-4 text-right font-mono text-slate-100 font-bold">
                  ₹{{ s.order_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                </td>

                <!-- Sum of payments accepted so far -->
                <td class="px-5 py-4 text-right font-mono text-emerald-400">
                  ₹{{ s.payments_received.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                </td>

                <!-- True outstanding balance -->
                <td class="px-5 py-4 text-right font-mono font-bold"
                    [class.text-rose-400]="s.outstanding_balance > 0"
                    [class.text-emerald-400]="s.outstanding_balance === 0">
                  ₹{{ s.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                  <span *ngIf="s.outstanding_balance === 0" class="text-[9px] uppercase border border-emerald-500/30 px-1 ml-1 rounded font-normal">CLEARED</span>
                </td>

                <!-- Allocate actions -->
                <td class="px-5 py-4 text-center">
                  <button
                    *ngIf="s.outstanding_balance > 0"
                    (click)="triggerPayOnOrder(s)"
                    class="px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-lg text-[10px] font-semibold transition cursor-pointer"
                  >
                    ⚡ Pay Outstanding Balance
                  </button>
                  <span *ngIf="s.outstanding_balance === 0" class="text-[10px] text-slate-500 font-mono">Receipt Terminated</span>
                </td>
              </tr>

              <tr *ngIf="orderSummaries().length === 0">
                <td colspan="6" class="px-5 py-12 text-center text-slate-500 font-sans">
                  No fabrication jobs detected under active balance filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
  styles: []
})
export class PaymentListComponent implements OnInit {
  @Output() createPayment = new EventEmitter<void>();
  @Output() payOnOrder = new EventEmitter<IOrderPaymentSummary>();
  @Output() editPayment = new EventEmitter<IPayment>();
  @Output() deletePayment = new EventEmitter<IPayment>();
  @Output() viewLedger = new EventEmitter<void>();

  // Local state indicators
  activeTab = signal<'payments' | 'orders'>('payments');
  searchQuery: string = '';
  selectedMethod: string = '';
  fromDate: string = '';
  toDate: string = '';

  orderSearchQuery: string = '';

  // Linked signal stores
  payments = this.paymentService.payments;
  orderSummaries = this.paymentService.orderSummaries;
  totalPayments = this.paymentService.totalPaymentsCount;
  collectedAmount = this.paymentService.totalCollectedAmount;
  outstandingAmount = this.paymentService.aggregateOutstandingAmount;

  methods: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    // Initial listings load
    this.paymentService.loadPayments().subscribe();
    this.paymentService.loadOrderSummaries().subscribe();
  }

  applyLocalFilters(): void {
    this.paymentService.loadPayments(
      this.searchQuery,
      this.selectedMethod ? this.selectedMethod : undefined,
      this.fromDate ? this.fromDate : undefined,
      this.toDate ? this.toDate : undefined
    ).subscribe();
  }

  applyOrderSummaryFilters(): void {
    this.paymentService.loadOrderSummaries(this.orderSearchQuery).subscribe();
  }

  getMethodClasses(method: PaymentMethod): string {
    switch (method) {
      case 'Cash':
        return 'bg-amber-500/10 border border-amber-500/20 text-amber-400';
      case 'UPI':
        return 'bg-sky-500/10 border border-sky-500/20 text-sky-400';
      case 'Bank Transfer':
        return 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400';
      case 'Cheque':
        return 'bg-purple-500/10 border border-purple-500/20 text-purple-400';
      default:
        return 'bg-slate-500/10 border border-slate-500/20 text-slate-400';
    }
  }

  triggerCreatePayment(): void {
    this.createPayment.emit();
  }

  triggerPayOnOrder(summary: IOrderPaymentSummary): void {
    this.payOnOrder.emit(summary);
  }

  triggerEditPayment(payment: IPayment): void {
    this.editPayment.emit(payment);
  }

  triggerDeletePayment(payment: IPayment): void {
    this.deletePayment.emit(payment);
  }

  triggerViewLedger(): void {
    this.viewLedger.emit();
  }
}
