import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../../customers/services/customer.service';
import { PaymentService } from '../../services/payment.service';
import { ILedgerEntry } from '../../../../data/models/customer.interface';
import { ICustomerOutstandingSummary } from '../../../../data/models/payment.interface';

@Component({
  selector: 'app-customer-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="customer-ledger-container p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-7xl mx-auto space-y-6">
      
      <!-- Back navigation banner -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-xl font-bold font-serif text-slate-100 flex items-center gap-2">
            <span>📜 Unified Accounts & Ledger Statements</span>
          </h2>
          <p class="text-xs text-slate-400 font-sans mt-0.5">
            Audit chronological invoices vs cash receipts on double-entry principles to reconcile client balances.
          </p>
        </div>

        <button
          (click)="triggerBack()"
          class="px-4 py-2 border border-slate-800 bg-slate-950/20 hover:bg-slate-850 text-slate-400 hover:text-slate-100 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer"
        >
          ← Return to Payments Home
        </button>
      </div>

      <!-- Customer Lookup Segment -->
      <div class="p-4 bg-slate-950/30 border border-slate-850 rounded-xl space-y-2.5 max-w-md">
        <label class="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
          <span>🔍 Choose Customer Account Ledger</span>
        </label>
        <select
          [(ngModel)]="selectedCustomerId"
          (ngModelChange)="onCustomerSelected()"
          class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition cursor-pointer"
        >
          <option value="" disabled>-- Choose Client Statement Profile --</option>
          <option *ngFor="let c of customers()" [value]="c.id">
            {{ c.name }} ({{ c.mobile }})
          </option>
        </select>
      </div>

      <!-- Empty state before selection -->
      <div *ngIf="!selectedCustomerId" class="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center space-y-2">
        <span class="text-3xl text-slate-600">🏛️</span>
        <div class="text-xs font-mono">No statement account selected</div>
        <p class="text-xs text-slate-500 max-w-xs leading-relaxed">Please select a customer profile from the picker above to compile their chronological transaction dues and payments received.</p>
      </div>

      <!-- Loaded ledger section -->
      <div *ngIf="selectedCustomerId && ledgerSummary()" class="space-y-6">
        
        <!-- Summary Dashboard row -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Customer contact card -->
          <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
            <div class="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Statement Subject</div>
            <div class="text-sm font-bold text-slate-100 truncate">{{ ledgerSummary()!.customer_name }}</div>
            <div class="text-[10px] text-slate-400 font-sans">📞 {{ ledgerSummary()!.mobile }}</div>
          </div>

          <!-- Total Debit Billings -->
          <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
            <div class="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Lifetime Billed Value (Debits)</div>
            <div class="text-lg font-bold text-slate-100 tracking-tight">₹{{ ledgerSummary()!.total_order_value.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</div>
            <div class="text-[10px] text-slate-500 font-sans">Sum of all fabrication jobs</div>
          </div>

          <!-- Total Credit Receipts -->
          <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
            <div class="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Lifetime Receipts (Credits)</div>
            <div class="text-lg font-bold text-emerald-400 tracking-tight">₹{{ ledgerSummary()!.total_payments.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</div>
            <div class="text-[10px] text-slate-500 font-sans">Total cleared deposits recorded</div>
          </div>

          <!-- Cumulative Net outstanding dues -->
          <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
            <div class="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Aggregate Net Outstanding</div>
            <div class="text-lg font-bold tracking-tight"
                 [class.text-rose-400]="ledgerSummary()!.aggregate_outstanding > 0"
                 [class.text-emerald-400]="ledgerSummary()!.aggregate_outstanding === 0">
              ₹{{ ledgerSummary()!.aggregate_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
            </div>
            <div class="text-[10px] text-slate-500 font-sans">Current accounts receivable balance</div>
          </div>
        </div>

        <!-- Statement ledger grid -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs uppercase font-mono tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
              <span>🧾 Double-Entry Transaction Ledger Entries</span>
            </h4>
            
            <button
              (click)="printLedgerSheet()"
              class="px-2.5 py-1.5 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>🖨️ Mock Print Statement</span>
            </button>
          </div>

          <div class="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-800/80 bg-slate-900/60 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                  <th class="px-5 py-4">Transaction Date</th>
                  <th class="px-5 py-4">Transaction Entry Type</th>
                  <th class="px-5 py-4 font-mono">Reference No.</th>
                  <th class="px-5 py-4">Reconciliation Description</th>
                  <th class="px-5 py-4 text-right">Debit amount (Invoiced)</th>
                  <th class="px-5 py-4 text-right">Credit amount (Paid)</th>
                  <th class="px-5 py-4 text-right">Running Balance (Audited)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-850/60 text-xs">
                <!-- Ledger line rows -->
                <tr *ngFor="let entry of ledgerHistory()" class="hover:bg-slate-850/30 transition text-slate-300">
                  <!-- Date of entry -->
                  <td class="px-5 py-4 font-mono text-slate-400">{{ entry.date | date:'dd MMM yyyy' }}</td>

                  <!-- Entry type -->
                  <td class="px-5 py-4 font-semibold uppercase tracking-wider text-[10px]">
                    <span *ngIf="entry.type.includes('Debit')" class="text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                      Invoiced Debit
                    </span>
                    <span *ngIf="entry.type.includes('Credit')" class="text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Payment Credit
                    </span>
                  </td>

                  <!-- Linked Ref ID -->
                  <td class="px-5 py-4 font-mono text-slate-400">{{ entry.reference_no }}</td>

                  <!-- Description -->
                  <td class="px-5 py-4 font-sans text-slate-200">{{ entry.description }}</td>

                  <!-- Debit billing amount -->
                  <td class="px-5 py-4 text-right font-mono font-bold text-slate-100">
                    {{ entry.debit_amount > 0 ? '₹' + entry.debit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '---' }}
                  </td>

                  <!-- Credit payment received amount -->
                  <td class="px-5 py-4 text-right font-mono font-bold text-emerald-400">
                    {{ entry.credit_amount > 0 ? '₹' + entry.credit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '---' }}
                  </td>

                  <!-- Recalculated double entry running balance status -->
                  <td class="px-5 py-4 text-right font-mono font-bold text-sm"
                      [class.text-rose-400]="entry.running_balance > 0"
                      [class.text-emerald-400]="entry.running_balance === 0">
                    ₹{{ entry.running_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                  </td>
                </tr>

                <tr *ngIf="ledgerHistory().length === 0">
                  <td colspan="7" class="px-5 py-12 text-center text-slate-500 font-sans">
                    No transactions registered under this customer statement registry.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  `
})
export class CustomerLedgerComponent implements OnInit {
  selectedCustomerId: string = '';

  // Core service selections signals mapping
  customers = this.customerService.customers;
  ledgerHistory = this.customerService.ledgerEntries; // from customer service entries
  ledgerSummary = signal<ICustomerOutstandingSummary | null>(null);

  constructor(
    private customerService: CustomerService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    // Populate customers dropdown list
    this.customerService.loadCustomers().subscribe();
  }

  onCustomerSelected(): void {
    if (this.selectedCustomerId) {
      // 1. Fetch chronological debit vs credit ledger log lines
      this.customerService.loadCustomerLedger(this.selectedCustomerId).subscribe();

      // 2. Fetch aggregate balance summaries
      this.paymentService.loadCustomerLedgerSummary(this.selectedCustomerId).subscribe({
        next: (summary) => {
          this.ledgerSummary.set(summary);
        }
      });
    } else {
      this.ledgerSummary.set(null);
    }
  }

  triggerBack(): void {
    // Reset selections on back click
    this.selectedCustomerId = '';
    this.ledgerSummary.set(null);
    // Raise return event to parent view
    const btn = document.getElementById('btn-create-payment-trigger');
    if (btn) btn.scrollIntoView({ behavior: 'smooth' });
    // Or let the parent know via custom event
    const returnEvent = new CustomEvent('payment-panel:return');
    window.dispatchEvent(returnEvent);
  }

  printLedgerSheet(): void {
    const summary = this.ledgerSummary();
    if (!summary) return;
    
    // Simulate opening an OS print dialogue safely without blocking preview window framing
    console.log(`Printing statement ledger of Customer: ${summary.customer_name}. Total Billed Debits: ₹${summary.total_order_value}, Total Collected: ₹${summary.total_payments}, Balance: ₹${summary.aggregate_outstanding}`);
    alert(`💡 SG Printable Statement Compiled:\n\nCustomer: ${summary.customer_name}\nMobile: ${summary.mobile}\n-----------------------------\nTotal Debits Billed: ₹${summary.total_order_value.toLocaleString('en-IN')}\nTotal Payments Cleared: ₹${summary.total_payments.toLocaleString('en-IN')}\nNet Receivable Balance: ₹${summary.aggregate_outstanding.toLocaleString('en-IN')}\n\nThis statement contains chronological ledger balance checks.`);
  }
}
