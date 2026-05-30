import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentListComponent } from './payment-list/payment-list.component';
import { PaymentFormComponent } from './payment-form/payment-form.component';
import { CustomerLedgerComponent } from './customer-ledger/customer-ledger.component';
import { PaymentService } from '../services/payment.service';
import { IPayment, IOrderPaymentSummary } from '../../../data/models/payment.interface';

@Component({
  selector: 'app-payments-module',
  standalone: true,
  imports: [CommonModule, PaymentListComponent, PaymentFormComponent, CustomerLedgerComponent],
  template: `
    <div class="payments-dashboard-wrapper bg-[#0b0f19] text-slate-100 min-h-screen font-sans">
      
      <!-- Sticky Navigation Header -->
      <header class="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur border-b border-slate-800 py-4 px-6 shadow-md shadow-slate-950/20">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">⚡</span>
            <div>
              <h1 class="text-base font-bold font-serif tracking-tight text-white flex items-center gap-2">
                <span>SG Works Manager</span>
                <span class="text-[9px] font-mono font-normal uppercase bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300">Offline-Core</span>
              </h1>
              <p class="text-[10px] text-slate-400 font-mono">Module :: Billing Allocations & Accounts Ledger</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- UTC clock tracking -->
            <div class="hidden sm:flex flex-col text-right font-mono text-[9px] text-slate-500">
              <span>SYSTEM CHRONOS</span>
              <span class="text-slate-400">May 30, 2026 - 12:56 UTC</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Active workspace content view rendering with animations -->
      <main class="py-6 px-4 sm:px-6">
        <div class="max-w-7xl mx-auto">
          
          <div class="views-flow-renderer" [ngSwitch]="currentView()">
            <!-- 1. Receipts Listings & summaries -->
            <app-payment-list
              *ngSwitchCase="'list'"
              (createPayment)="navigateToCreate()"
              (payOnOrder)="navigateToPayOnOrder($event)"
              (editPayment)="navigateToEdit($event)"
              (deletePayment)="confirmDelete($event)"
              (viewLedger)="navigateToLedger()"
            ></app-payment-list>

            <!-- 2. Create/Update form wrapper -->
            <app-payment-form
              *ngSwitchCase="'form'"
              [paymentToEdit]="selectedPaymentForEdit"
              [preallocatedOrder]="preallocatedOrderSummary"
              (cancel)="resetToListView()"
              (paymentSaved)="onPaymentOperationSaved()"
            ></app-payment-form>

            <!-- 3. Client Account Ledger Ledger double-entry lines -->
            <app-customer-ledger
              *ngSwitchCase="'ledger'"
            ></app-customer-ledger>
          </div>

        </div>
      </main>

      <!-- Clean footer -->
      <footer class="border-t border-slate-900 py-6 text-center text-[10px] text-slate-600 font-mono">
        SG Engineering Works Manager &copy; 2026. SQLite Database Journaling WAL Mode Active.
      </footer>
    </div>
  `
})
export class PaymentsModuleComponent implements OnInit {
  currentView = signal<'list' | 'form' | 'ledger'>('list');

  selectedPaymentForEdit: IPayment | null = null;
  preallocatedOrderSummary: IOrderPaymentSummary | null = null;

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    // Scroll to top of window on startup
    window.scrollTo({ top: 0 });
  }

  // Handle callback return event raised by ledger component return button
  @HostListener('window:payment-panel:return')
  handleReturn(): void {
    this.resetToListView();
  }

  navigateToCreate(): void {
    this.selectedPaymentForEdit = null;
    this.preallocatedOrderSummary = null;
    this.currentView.set('form');
  }

  navigateToPayOnOrder(summary: IOrderPaymentSummary): void {
    this.selectedPaymentForEdit = null;
    this.preallocatedOrderSummary = summary;
    this.currentView.set('form');
  }

  navigateToEdit(payment: IPayment): void {
    this.selectedPaymentForEdit = payment;
    this.preallocatedOrderSummary = null;
    this.currentView.set('form');
  }

  navigateToLedger(): void {
    this.currentView.set('ledger');
  }

  resetToListView(): void {
    this.selectedPaymentForEdit = null;
    this.preallocatedOrderSummary = null;
    this.currentView.set('list');
  }

  onPaymentOperationSaved(): void {
    this.resetToListView();
  }

  confirmDelete(payment: IPayment): void {
    const formattedAmount = payment.payment_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const isApproved = confirm(
      `⚠️ CRITICAL DATA INTEGRITY WARNING:\n\nAre you sure you want to permanently delete the Payment Receipt of ₹${formattedAmount} logged on ${payment.payment_date} for customer '${payment.customer_name}'?\n\nDeleting this credit entry will automatically recalculate and INCREASE client active outstanding dues by ₹${formattedAmount} immediately.`
    );

    if (isApproved) {
      this.paymentService.purgePayment(payment.id, payment.customer_id).subscribe({
        next: () => {
          console.log(`Payment Receipt ${payment.id} purged successfully.`);
          alert(`✅ Success: Payment receipt deleted. Client outstanding balance recalculated.`);
        }
      });
    }
  }
}
