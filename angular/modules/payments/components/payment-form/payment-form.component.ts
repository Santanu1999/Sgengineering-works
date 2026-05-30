import { Component, OnInit, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { CustomerService } from '../../../customers/services/customer.service';
import { OrderService } from '../../../orders/services/order.service';
import { IPayment, PaymentMethod, IOrderPaymentSummary } from '../../../../data/models/payment.interface';
import { IOrder } from '../../../../data/models/order.interface';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="payment-form-container p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-4xl mx-auto space-y-6">
      
      <!-- Title segment -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-lg font-bold font-serif text-slate-100">
            <span>{{ isEditMode ? 'Modify Payment Receipt log' : 'Record Received Payment Receipt (SQLite Credit)' }}</span>
          </h2>
          <p class="text-xs text-slate-400 font-sans mt-0.5">
            {{ isEditMode ? 'Acknowledge revisions for historical ledger balance' : 'Allocate cleared funds to client order invoices cleanly' }}
          </p>
        </div>
        
        <button
          (click)="triggerCancel()"
          class="px-3.5 py-1.5 border border-slate-800 bg-slate-950/20 hover:bg-slate-850 text-slate-400 hover:text-slate-100 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <!-- Main Form -->
      <form #form="ngForm" (ngSubmit)="save(form)" class="space-y-6">
        
        <!-- Part 1: Segment associations -->
        <h3 class="text-xs uppercase tracking-wider text-slate-500 font-mono font-bold">1. Account & Order Allocations</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/20 border border-slate-850 p-4 rounded-xl">
          
          <!-- Selected Customer profile -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <span>Customer Name</span>
              <span class="text-rose-400">*</span>
            </label>
            <select
              [(ngModel)]="payment.customer_id"
              (ngModelChange)="onCustomerChange()"
              name="customer_id"
              required
              [disabled]="isEditMode || !!preallocatedOrder"
              class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <option value="" disabled>-- Select Customer Account --</option>
              <option *ngFor="let c of customers()" [value]="c.id">
                {{ c.name }} ({{ c.mobile }})
              </option>
            </select>
          </div>

          <!-- Selected Order Booking reference -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <span>Allocate to Fabrication Order #</span>
              <span class="text-rose-400">*</span>
            </label>
            <select
              [(ngModel)]="payment.order_id"
              (ngModelChange)="onOrderChange()"
              name="order_id"
              required
              [disabled]="isEditMode || !payment.customer_id || !!preallocatedOrder"
              class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <option value="" disabled>-- Select Order Reference --</option>
              <option *ngFor="let o of filteredOrders" [value]="o.id">
                {{ o.order_number }} - Due Date: {{ o.estimated_delivery_date | date:'dd MMM yy' }}
              </option>
            </select>
            <p *ngIf="payment.customer_id && filteredOrders.length === 0" class="text-[10px] text-rose-400 font-sans mt-1">
              ⚠️ This customer has no active fabrication orders logged.
            </p>
          </div>
        </div>

        <!-- Dynamic Outstanding Calculations Pane -->
        <div *ngIf="payment.order_id && orderSummary()" class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3.5">
          <h4 class="text-xs uppercase font-mono text-slate-400 font-bold flex items-center gap-1.5">
            <span>⚙️ Double-Entry Outstanding Recalculations</span>
          </h4>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <!-- Order total -->
            <div class="p-3 bg-slate-900/60 border border-slate-850 rounded-lg">
              <span class="text-[9px] uppercase text-slate-500">Order Booking Total</span>
              <div class="text-sm font-bold text-slate-100 mt-1">₹{{ orderSummary()!.order_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</div>
            </div>

            <!-- Total payments received -->
            <div class="p-3 bg-slate-900/60 border border-slate-850 rounded-lg">
              <span class="text-[9px] uppercase text-slate-500">Cleared Payments (Historic)</span>
              <div class="text-sm font-bold text-blue-400 mt-1">₹{{ orderSummary()!.payments_received.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</div>
            </div>

            <!-- Outstanding Balance dues -->
            <div class="p-3 bg-slate-900/60 border border-slate-850 rounded-lg">
              <span class="text-[9px] uppercase text-slate-500">Net Outstanding dues</span>
              <div class="text-sm font-bold text-rose-400 mt-1">₹{{ orderSummary()!.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</div>
            </div>
          </div>

          <!-- Real-Time recalculated outstanding balance after current payment amount -->
          <div class="flex items-center justify-between border-t border-slate-900 pt-3 text-xs font-mono" *ngIf="payment.payment_amount > 0">
            <span class="text-slate-500 uppercase">Projected Outstanding balance post-allocation:</span>
            <div class="font-bold flex items-center gap-1.5">
              <span [class.text-rose-400]="projectedOutstanding() > 0"
                    [class.text-emerald-400]="projectedOutstanding() === 0"
                    [class.text-amber-400]="projectedOutstanding() < 0">
                ₹{{ projectedOutstanding().toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
              </span>
              <span *ngIf="projectedOutstanding() === 0" class="text-[9px] bg-emerald-950/40 text-emerald-400 px-1.5 rounded uppercase border border-emerald-500/20">Cleared</span>
              <span *ngIf="projectedOutstanding() < 0" class="text-[9px] bg-amber-950/40 text-amber-400 px-1.5 rounded uppercase border border-amber-500/20">Customer Credit</span>
            </div>
          </div>

          <!-- Business Warning constraint triggers -->
          <div *ngIf="projectedOutstanding() < 0" class="p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg flex items-start gap-2.5 text-[11px] text-rose-300 font-sans leading-relaxed">
            <span>⚠️</span>
            <div>
              <strong class="font-bold text-rose-200">Double-Entry Audit Warning:</strong> Received payment amount (₹{{ payment.payment_amount.toLocaleString('en-IN') }}) exceeds the order's remaining outstanding dues of ₹{{ orderSummary()!.outstanding_balance.toLocaleString('en-IN') }}. Please verify allocation to prevent recording improper surplus, or log balance notes in Remarks.
            </div>
          </div>
        </div>

        <!-- Part 2: Payment Parameters -->
        <h3 class="text-xs uppercase tracking-wider text-slate-500 font-mono font-bold pt-2">2. Receipt Transaction Parameters</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/20 border border-slate-850 p-4 rounded-xl">
          
          <!-- Payment Booking Date -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase text-slate-400">Payment Clearance Date</label>
            <input
              type="date"
              [(ngModel)]="payment.payment_date"
              name="payment_date"
              required
              class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition"
            />
          </div>

          <!-- Payment Amount with constraint rules -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase text-slate-400">Received Cleared Amount (₹)</label>
            <input
              type="number"
              [(ngModel)]="payment.payment_amount"
              name="payment_amount"
              required
              min="0.01"
              placeholder="Enter cleared payment amount e.g. 15000"
              class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition"
            />
          </div>

          <!-- Payment Channel method -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase text-slate-400">Deposit Channel (Method)</label>
            <select
              [(ngModel)]="payment.payment_method"
              name="payment_method"
              required
              class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option *ngFor="let m of methods" [value]="m">{{ m }}</option>
            </select>
          </div>

          <!-- Reference ID / Transaction codes -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase text-slate-400">Reference No. (UPI Txn ID, Cheque #, etc.)</label>
            <input
              type="text"
              [(ngModel)]="payment.reference_no"
              name="reference_no"
              placeholder="e.g. UPI Ref, NEFT transfer code, Cheque ledger no..."
              class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        <!-- Part 3: Operational Notes -->
        <h3 class="text-xs uppercase tracking-wider text-slate-500 font-mono font-bold pt-2">3. Reconciliation Remarks</h3>
        <div class="space-y-1.5 bg-slate-950/20 border border-slate-850 p-4 rounded-xl">
          <label class="text-[10px] font-mono uppercase text-slate-400">Internal Verification remarks / ledger comments</label>
          <textarea
            [(ngModel)]="payment.remarks"
            name="remarks"
            rows="3"
            placeholder="Log details such as banker confirmations, installment numbers, partner signatures, or general double-entry logs..."
            class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition resize-none"
          ></textarea>
        </div>

        <!-- Actions panel -->
        <div class="flex items-center justify-end space-x-3 pt-3">
          <button
            type="button"
            (click)="triggerCancel()"
            class="px-5 py-2.5 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer"
          >
            Go Back
          </button>
          
          <button
            type="submit"
            [disabled]="!form.valid || isSaving"
            class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold tracking-wide transition shadow-lg shadow-emerald-500/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {{ isSaving ? 'Executing SQLite Transactions...' : (isEditMode ? 'Save and Override Receipt' : 'Confirm & Commit cleared Funds') }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class PaymentFormComponent implements OnInit {
  @Input() paymentToEdit: IPayment | null = null;
  @Input() preallocatedOrder: IOrderPaymentSummary | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() paymentSaved = new EventEmitter<void>();

  isEditMode: boolean = false;
  isSaving: boolean = false;

  payment = {
    customer_id: '',
    order_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_amount: 0,
    payment_method: 'Cash' as PaymentMethod,
    reference_no: '',
    remarks: ''
  };

  // State Stores
  customers = this.customerService.customers;
  orders = this.orderService.orders;
  orderSummary = this.paymentService.selectedOrderSummary;

  filteredOrders: IOrder[] = [];
  methods: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];

  // Calculate projected outstanding balance on-the-fly
  projectedOutstanding = computed(() => {
    const summary = this.orderSummary();
    if (!summary) return 0;
    
    // If we're editing, we adjust the projection relative to the previous amount to avoid listing duplicates
    const previousAmount = this.paymentToEdit ? this.paymentToEdit.payment_amount : 0;
    const paymentDelta = this.payment.payment_amount - previousAmount;
    
    return summary.outstanding_balance - paymentDelta;
  });

  constructor(
    private paymentService: PaymentService,
    private customerService: CustomerService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    // 1. Initial State Hydrations
    this.customerService.loadCustomers().subscribe();
    this.orderService.loadOrders().subscribe({
      next: () => {
        this.filterOrdersByCustomer();
      }
    });

    // 2. Pre-filled parameters if navigating directly of an order summary link
    if (this.preallocatedOrder) {
      this.isEditMode = false;
      this.payment.customer_id = this.preallocatedOrder.customer_id;
      this.payment.order_id = this.preallocatedOrder.order_id;
      this.payment.payment_amount = this.preallocatedOrder.outstanding_balance;
      
      // Load specific balance details instantly
      this.paymentService.loadOrderPaymentSummary(this.preallocatedOrder.order_id).subscribe();
    } else if (this.paymentToEdit) {
      // 3. Edit mode load parameters
      this.isEditMode = true;
      this.payment = {
        customer_id: this.paymentToEdit.customer_id,
        order_id: this.paymentToEdit.order_id,
        payment_date: this.paymentToEdit.payment_date.split('T')[0],
        payment_amount: this.paymentToEdit.payment_amount,
        payment_method: this.paymentToEdit.payment_method,
        reference_no: this.paymentToEdit.reference_no || '',
        remarks: this.paymentToEdit.remarks || ''
      };

      // Recalculate related summary logs
      this.paymentService.loadOrderPaymentSummary(this.paymentToEdit.order_id).subscribe();
    }

    // React to orders list hydration to filtered listings mapping
    effect(() => {
      if (this.orders().length > 0) {
        this.filterOrdersByCustomer();
      }
    }, { allowSignalWrites: true });
  }

  onCustomerChange(): void {
    this.payment.order_id = '';
    this.filteredOrders = [];
    this.paymentService.loadOrderPaymentSummary('').subscribe();
    this.filterOrdersByCustomer();
  }

  onOrderChange(): void {
    if (this.payment.order_id) {
      this.paymentService.loadOrderPaymentSummary(this.payment.order_id).subscribe({
        next: (summary) => {
          if (summary && !this.isEditMode) {
            // Suggest the remaining outstanding amount for payment by default to make data entry easier!
            this.payment.payment_amount = summary.outstanding_balance;
          }
        }
      });
    } else {
      this.paymentService.loadOrderPaymentSummary('').subscribe();
    }
  }

  filterOrdersByCustomer(): void {
    if (this.payment.customer_id) {
      this.filteredOrders = this.orders().filter(
        o => o.customer_id === this.payment.customer_id && o.status !== 'Cancelled'
      );
    } else {
      this.filteredOrders = [];
    }
  }

  triggerCancel(): void {
    this.cancel.emit();
  }

  save(ngForm: NgForm): void {
    if (!ngForm.valid || !this.payment.customer_id || !this.payment.order_id) return;

    this.isSaving = true;

    const payload: Omit<IPayment, 'id' | 'created_date' | 'updated_date'> = {
      customer_id: this.payment.customer_id,
      order_id: this.payment.order_id,
      payment_date: this.payment.payment_date,
      payment_amount: Number(this.payment.payment_amount),
      payment_method: this.payment.payment_method,
      reference_no: this.payment.reference_no ? this.payment.reference_no : null,
      remarks: this.payment.remarks ? this.payment.remarks : null
    };

    if (this.isEditMode && this.paymentToEdit) {
      const finalPayment: IPayment = {
        ...this.paymentToEdit,
        ...payload
      };

      this.paymentService.modifyPayment(finalPayment).subscribe({
        next: () => {
          this.isSaving = false;
          this.paymentSaved.emit();
        },
        error: () => {
          this.isSaving = false;
        }
      });
    } else {
      this.paymentService.registerPayment(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.paymentSaved.emit();
        },
        error: () => {
          this.isSaving = false;
        }
      });
    }
  }
}
