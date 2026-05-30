import { Component, OnInit, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceService } from '../../services/invoice.service';
import { IInvoice } from '../../../../data/models/invoice.interface';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="invoice-form-slate p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-7xl mx-auto space-y-6">
      
      <!-- Back Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <button
            (click)="triggerCancel()"
            class="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none"
          >
            <span>← Return to billing lists</span>
          </button>
          <h2 class="text-xl font-bold font-serif tracking-tight text-slate-100 mt-2">
            {{ selectedOrder() ? 'Complete GST Allocation & Stamp Invoice' : 'Select Client Order for Invoicing' }}
          </h2>
          <p class="text-[11px] text-slate-400 mt-0.5">
            {{ selectedOrder() 
              ? 'Review specifications, configure standard tax slabs, and programmatically ledger CGST/SGST/IGST splits.' 
              : 'Choose an active engineering fabrication order to generate a certified tax invoice receipt.' }}
          </p>
        </div>

        <span class="text-xs font-mono px-3 py-1 bg-slate-950 text-slate-500 rounded-lg">UoW Status: Active</span>
      </div>

      <!-- STEP 1: Select Order if none selected yet -->
      <div *ngIf="!selectedOrder()" class="space-y-4 font-sans">
        
        <!-- Order search filters -->
        <div class="relative max-w-md">
          <span class="absolute left-3 top-2.5 text-slate-600 text-sm">🔍</span>
          <input
            type="text"
            [(ngModel)]="orderSearchQuery"
            (ngModelChange)="onOrderSearchChanged()"
            placeholder="Filter orders by ID or customer name..."
            class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 rounded-xl pl-9 pr-4 py-2 text-xs transition outline-none"
          />
        </div>

        <!-- Orders Selection Grid Table -->
        <div class="relative overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/10">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-950/60 border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                <th class="py-3 px-4">Order Book No</th>
                <th class="py-3 px-4">Booking Date</th>
                <th class="py-3 px-4">Customer Name</th>
                <th class="py-3 px-4 text-right">Contract Price</th>
                <th class="py-3 px-4 text-right">Payments Received</th>
                <th class="py-3 px-4 text-right">Remaining Due</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="text-xs text-slate-300 divide-y divide-slate-800/60">
              <tr *ngFor="let ord of pendingOrders()" class="hover:bg-slate-800/20 transition-colors">
                <td class="py-3 px-4 font-mono text-cyan-400 font-semibold">{{ ord.order_number }}</td>
                <td class="py-3 px-4 text-slate-400">{{ formatDate(ord.order_date) }}</td>
                <td class="py-3 px-4 font-medium text-slate-200">{{ ord.customer_name }}</td>
                <td class="py-3 px-4 text-right font-mono text-slate-100">₹{{ ord.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</td>
                <td class="py-3 px-4 text-right font-mono text-emerald-400">₹{{ ord.paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</td>
                <td class="py-3 px-4 text-right font-mono font-bold text-rose-400">
                  ₹{{ (ord.total_amount - ord.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                </td>
                <td class="py-3 px-4 text-center">
                  <span
                    class="text-[9px] font-mono leading-none px-2 py-0.5 rounded border"
                    [ngClass]="ord.invoice_count > 0 
                      ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400' 
                      : 'bg-yellow-950/30 border-yellow-800 text-yellow-400'"
                  >
                    {{ ord.invoice_count > 0 ? 'Billed Already' : 'Un-Billed' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-center">
                  <button
                    (click)="selectOrder(ord)"
                    class="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-semibold tracking-wide transition active:scale-95 cursor-pointer"
                  >
                    {{ ord.invoice_count > 0 ? 'Billing adjustment' : 'Generate Bill' }}
                  </button>
                </td>
              </tr>
              <tr *ngIf="pendingOrders().length === 0">
                <td colspan="8" class="py-12 text-center text-slate-500 font-mono">
                  No active/completed orders found matching search criteria.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- STEP 2: Selected Order Billing Parameters & Invoice Formulation -->
      <div *ngIf="selectedOrder()" class="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
        
        <!-- Left 7 columns: Billing overview, particulars & review -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- Client Card & Particulars Header -->
          <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span class="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Customer Bill-To (Party)</span>
              <h3 class="text-md font-bold text-slate-100 mt-1">{{ selectedOrder().customer_name }}</h3>
              <p class="text-xs text-slate-400 mt-1">{{ selectedOrder().customer_address || 'Address: N/A' }}</p>
              <p class="text-xs text-slate-500 font-mono mt-0.5">Contact: +91 {{ selectedOrder().customer_mobile }}</p>
              <p class="text-xs font-mono text-cyan-400 mt-1" *ngIf="selectedOrder().customer_gst">
                GSTIN: {{ selectedOrder().customer_gst }}
              </p>
            </div>

            <div>
              <span class="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Order Verification</span>
              <div class="mt-2 text-xs space-y-1 text-slate-400">
                <div><span class="text-slate-500 font-mono">Order Number:</span> <span class="font-mono text-slate-300">{{ selectedOrder().order_number }}</span></div>
                <div><span class="text-slate-500 font-mono">Booked Date:</span> <span>{{ formatDate(selectedOrder().order_date) }}</span></div>
                <div><span class="text-slate-500 font-mono">Fabrication Stage:</span> <span class="text-cyan-400 bg-slate-800 px-1 rounded">{{ selectedOrder().status }}</span></div>
              </div>
            </div>
          </div>

          <!-- Invoice Details Card Forms -->
          <div class="p-5 bg-slate-950/20 border border-slate-800 rounded-xl space-y-4">
            <h3 class="text-xs font-mono uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">Invoice Details</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">Invoice Number (Tax Sequence)</label>
                <input
                  type="text"
                  [(ngModel)]="invoiceNumber"
                  class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-cyan-500 text-center font-bold"
                />
                <p class="text-[9px] text-slate-550 font-mono mt-1">Succeeded based on year series projection.</p>
              </div>

              <div>
                <label class="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">Invoice Booking Date</label>
                <input
                  type="date"
                  [(ngModel)]="invoiceDate"
                  class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs font-sans outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          <!-- Selected Order Line items review -->
          <div class="p-5 bg-slate-950/20 border border-slate-800 rounded-xl space-y-3">
            <h3 class="text-xs font-mono uppercase tracking-wider text-slate-400">Items Specification List</h3>
            <div class="text-[10px] text-slate-500">Values represent agreed unit prices and total margins parsed from order ledger files.</div>
            
            <div class="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2">
              <div class="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-slate-850 pb-2">
                <span>Fabricated item specification</span>
                <span>Final Contract Valuation</span>
              </div>
              <div class="text-[11px] text-slate-400 space-y-1 pt-1">
                <div class="flex items-center justify-between">
                  <span>Gross Jobwork Value (Contract Total)</span>
                  <span class="font-mono text-slate-100 font-bold">₹{{ selectedOrder().total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Cleared Pre-payments Received</span>
                  <span class="font-mono text-emerald-400">₹{{ selectedOrder().paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Right 5 columns: GST Calculation Slabs & Stamp execution -->
        <div class="lg:col-span-5 space-y-6">
          
          <div class="p-5 bg-gradient-to-b from-slate-950 to-slate-950/60 border border-slate-800 rounded-xl space-y-5 shadow-2xl">
            <h3 class="text-xs font-mono uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">GST TAX COMPUTATIONS SIZING</h3>

            <!-- GST selection slab -->
            <div class="space-y-4">
              <div>
                <label class="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">Tax rate (GST Slab)</label>
                <select
                  [(ngModel)]="gstRate"
                  (change)="recalcTax()"
                  class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 font-semibold"
                >
                  <option [ngValue]="0">GST EXEMPT (0%)</option>
                  <option [ngValue]="5">STRUCTURAL GENERAL (5%)</option>
                  <option [ngValue]="12">MACHINERY COMMODITY (12%)</option>
                  <option [ngValue]="18">ENGINEERING FABRICATION JOBWORK (18%)</option>
                  <option [ngValue]="28">LUXURY CAPITAL HEAVY (28%)</option>
                </select>
              </div>

              <!-- Interstate Toggles -->
              <div class="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-850">
                <div>
                  <div class="text-xs font-semibold text-slate-300">Interstate Transaction?</div>
                  <div class="text-[9px] text-slate-500">Apply IGST instead of splitting into CGST + SGST.</div>
                </div>
                <input
                  type="checkbox"
                  [(ngModel)]="isInterstate"
                  (change)="recalcTax()"
                  class="w-4 h-4 rounded text-cyan-600 bg-slate-950 border-slate-800 focus:ring-cyan-500 outline-none cursor-pointer"
                />
              </div>
            </div>

            <!-- Double-entry dynamic display summary ledger -->
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 font-mono text-[11px]">
              <div class="flex justify-between border-b border-slate-850/60 pb-1.5 text-slate-400">
                <span>Contract Gross Total:</span>
                <span class="text-slate-100">₹{{ selectedOrder().total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              </div>

              <div class="flex justify-between text-slate-400">
                <span>Base Taxable Value (Subtotal):</span>
                <span class="text-slate-100">₹{{ taxSummary.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              </div>

              <div class="flex justify-between text-slate-400" *ngIf="!isInterstate">
                <span>Central GST (CGST {{ gstRate/2 }}%):</span>
                <span>₹{{ taxSummary.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              </div>

              <div class="flex justify-between text-slate-400" *ngIf="!isInterstate">
                <span>State GST (SGST {{ gstRate/2 }}%):</span>
                <span>₹{{ taxSummary.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              </div>

              <div class="flex justify-between text-slate-400" *ngIf="isInterstate">
                <span>Integrated GST (IGST {{ gstRate }}%):</span>
                <span>₹{{ taxSummary.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              </div>

              <div class="flex justify-between font-bold border-t border-slate-850 pt-2 text-slate-300">
                <span>Grand Invoiced Revenue:</span>
                <span class="text-cyan-400">₹{{ taxSummary.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              </div>

              <div class="flex justify-between pt-1 border-t border-slate-850/40 text-emerald-400">
                <span>Credited Payments Received:</span>
                <span>₹{{ selectedOrder().paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              </div>

              <div class="flex justify-between font-bold text-rose-400 border-t border-slate-850 pt-1 text-xs">
                <span>Net Outstanding balance:</span>
                <span>₹{{ remainingOutstanding().toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              </div>
            </div>

            <!-- Submit trigger buttons -->
            <div class="space-y-2 pt-2">
              <button
                (click)="registerTaxInvoice()"
                class="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold tracking-wider transition hover:shadow-cyan-500/15 uppercase active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🛡️ Stamp & Register Tax Invoice</span>
              </button>

              <button
                (click)="triggerCancel()"
                class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-xl text-[11px] font-semibold transition cursor-pointer"
              >
                Cancel & Return
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  `
})
export class InvoiceFormComponent implements OnInit {
  // Callback emitters
  @Output() cancel = new EventEmitter<void>();
  @Output() invoiceSaved = new EventEmitter<void>();

  // Search parameters
  orderSearchQuery = '';

  // Local component states
  pendingOrders = signal<any[]>([]);
  selectedOrder = signal<any | null>(null);

  // Form Fields
  invoiceNumber = '';
  invoiceDate = new Date().toISOString().split('T')[0];
  gstRate = 18.0; // Default jobwork slab
  isInterstate = false;

  // Calculational states
  taxSummary = {
    taxable_amount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    total_amount: 0
  };

  constructor(private invoiceService: InvoiceService) {}

  ngOnInit(): void {
    this.invoiceService.loadCompanySettings().subscribe();
    this.hydratePendingOrders();
  }

  hydratePendingOrders(): void {
    this.invoiceService.loadInvoicingOrders(this.orderSearchQuery).subscribe({
      next: (orders) => {
        this.pendingOrders.set(orders);
      }
    });
  }

  onOrderSearchChanged(): void {
    this.hydratePendingOrders();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  selectOrder(order: any): void {
    this.selectedOrder.set(order);
    
    // Automatically project next sequential billing serial
    this.invoiceService.getNextInvoiceNumber().subscribe({
      next: (num) => {
        this.invoiceNumber = num;
        this.recalcTax();
      }
    });
  }

  recalcTax(): void {
    if (!this.selectedOrder()) return;
    
    const grossTotal = this.selectedOrder().total_amount;
    const calc = this.invoiceService.calculateGST(grossTotal, this.gstRate, this.isInterstate);
    
    this.taxSummary = {
      taxable_amount: calc.taxable_amount,
      cgst: calc.cgst,
      sgst: calc.sgst,
      igst: calc.igst,
      total_amount: calc.total_amount
    };
  }

  remainingOutstanding(): number {
    if (!this.selectedOrder()) return 0;
    return this.taxSummary.total_amount - this.selectedOrder().paid_amount;
  }

  registerTaxInvoice(): void {
    if (!this.selectedOrder()) return;

    if (!this.invoiceNumber || this.invoiceNumber.trim() === '') {
      alert('Kindly declare a valid Invoice serial number to execute.');
      return;
    }

    const outstanding = this.remainingOutstanding();
    
    const billingPayload = {
      invoice_number: this.invoiceNumber,
      order_id: this.selectedOrder().id,
      invoice_date: this.invoiceDate,
      taxable_amount: this.taxSummary.taxable_amount,
      gst_rate: this.gstRate,
      cgst: this.taxSummary.cgst,
      sgst: this.taxSummary.sgst,
      igst: this.taxSummary.igst,
      total_amount: this.taxSummary.total_amount,
      paid_amount: this.selectedOrder().paid_amount,
      due_amount: outstanding
    };

    this.invoiceService.registerInvoice(billingPayload).subscribe({
      next: () => {
        alert(`✅ SUCCESS: Tax Invoice Stamp '${this.invoiceNumber}' registered. Transferred to Ledger journals.`);
        this.invoiceSaved.emit();
      },
      error: (err) => {
        console.error(err);
        alert('❌ FAILED: Database constraint violation. Possibly this invoice number is already occupied.');
      }
    });
  }

  triggerCancel(): void {
    if (this.selectedOrder()) {
      this.selectedOrder.set(null);
    } else {
      this.cancel.emit();
    }
  }
}
