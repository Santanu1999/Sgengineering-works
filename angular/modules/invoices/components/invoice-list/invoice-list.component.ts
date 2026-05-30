import { Component, OnInit, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceService } from '../../services/invoice.service';
import { PdfService } from '../../services/pdf.service';
import { IInvoice } from '../../../../data/models/invoice.interface';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="invoice-list-container p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-7xl mx-auto space-y-6">
      
      <!-- List Title & Action Headers -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold font-serif tracking-tight text-slate-100 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
            <span>Billing, Invoicing & GST History</span>
          </h2>
          <p class="text-xs text-slate-400 font-sans mt-1">
            Generate tax invoices, reprint certified PDF records, review GST allocations, and trace outstanding client liabilities.
          </p>
        </div>

        <div class="flex gap-2 shrink-0">
          <button
            (click)="triggerConfigureCompany()"
            class="px-4 py-2 border border-slate-800 bg-slate-950/20 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold tracking-wide transition flex items-center gap-2 cursor-pointer"
          >
            <span>⚙️ Gst & Company Profile</span>
          </button>
          
          <button
            (click)="triggerCreateInvoice()"
            id="btn-generate-invoice-trigger"
            class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold tracking-wide transition shadow-lg shadow-cyan-500/10 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>+ Generate Tax Invoice</span>
          </button>
        </div>
      </div>

      <!-- Live Analytical Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <!-- Total Invoices Raised -->
        <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Certified Invoices Raised</div>
          <div class="text-2xl font-bold text-cyan-400 tracking-tight">{{ totalInvoiceCount() }} Records</div>
          <div class="text-[10px] text-slate-400 font-sans">Sequence sequence active and validated</div>
        </div>

        <!-- Total Revenue Billing -->
        <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Gross Invoiced Revenue</div>
          <div class="text-2xl font-bold text-emerald-400 tracking-tight">₹{{ totalBilledRevenue().toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</div>
          <div class="text-[10px] text-slate-400 font-sans">Inclusive of CGST, SGST & IGST tax values</div>
        </div>

        <!-- Receivables Dues -->
        <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Active Receivables Dues</div>
          <div class="text-2xl font-bold text-rose-400 tracking-tight">₹{{ totalOutstandingBalance().toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</div>
          <div class="text-[10px] text-slate-400 font-sans">Outstanding debt on billings ledger</div>
        </div>
      </div>

      <!-- Advanced Filters: Query & Dates -->
      <div class="bg-slate-950/20 p-4 border border-slate-800/80 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Search Customer or Invoice No</label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-slate-600 text-sm">🔍</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChanged()"
              placeholder="Search e.g. SG/2026 or Tata..."
              class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 rounded-xl pl-9 pr-4 py-2 text-xs font-sans transition outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Invoice Booking From Date</label>
          <input
            type="date"
            [(ngModel)]="fromDate"
            (ngModelChange)="onFilterChanged()"
            class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 rounded-xl px-4 py-2 text-xs font-sans transition outline-none"
          />
        </div>

        <div>
          <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Invoice Booking To Date</label>
          <input
            type="date"
            [(ngModel)]="toDate"
            (ngModelChange)="onFilterChanged()"
            class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 rounded-xl px-4 py-2 text-xs font-sans transition outline-none"
          />
        </div>
      </div>

      <!-- Invoices Listing Grid -->
      <div class="relative overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/10">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-950/60 border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <th class="py-3.5 px-4">Invoice No</th>
              <th class="py-3.5 px-4">Date</th>
              <th class="py-3.5 px-4">Customer Name</th>
              <th class="py-3.5 px-4 text-right">Taxable Val</th>
              <th class="py-3.5 px-4 text-right">GST %</th>
              <th class="py-3.5 px-4 text-right">Grand Total</th>
              <th class="py-3.5 px-4 text-right">Balance Due</th>
              <th class="py-3.5 px-4 text-center">Receipt Status</th>
              <th class="py-3.5 px-4 text-center">Reprint actions</th>
            </tr>
          </thead>
          <tbody class="text-xs text-slate-300 divide-y divide-slate-800/60 font-sans">
            <tr *ngFor="let inv of invoices()" class="hover:bg-slate-800/30 transition-all duration-150">
              <td class="py-3 px-4 font-mono text-cyan-400 font-semibold select-all">{{ inv.invoice_number }}</td>
              <td class="py-3 px-4 text-slate-400">{{ formatDate(inv.invoice_date) }}</td>
              <td class="py-3 px-4 font-medium text-slate-200">{{ inv.customer_name || 'Generic Client' }}</td>
              <td class="py-3 px-4 text-right font-mono text-slate-400">₹{{ inv.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</td>
              <td class="py-3 px-4 text-right font-mono text-slate-400">
                <span class="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-300">{{ inv.gst_rate }}%</span>
              </td>
              <td class="py-3 px-4 text-right font-mono font-semibold text-slate-100">₹{{ inv.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</td>
              <td class="py-3 px-4 text-right font-mono font-semibold" [class.text-rose-400]="inv.due_amount > 0" [class.text-emerald-400]="inv.due_amount === 0">
                ₹{{ inv.due_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
              </td>
              <td class="py-3 px-4 text-center">
                <span
                  class="text-[9px] font-mono leading-none px-2 py-1 rounded-full uppercase border font-semibold inline-block"
                  [ngClass]="inv.due_amount <= 0 
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' 
                    : inv.paid_amount > 0 
                      ? 'bg-amber-950/40 border-amber-805 text-amber-400'
                      : 'bg-rose-950/40 border-rose-800 text-rose-400'"
                >
                  {{ inv.due_amount <= 0 ? 'Full Paid' : inv.paid_amount > 0 ? 'Part Paid' : 'Unpaid' }}
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    (click)="printPDF(inv.id)"
                    title="Print Invoice"
                    class="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg transition active:scale-90 cursor-pointer"
                  >
                    🖨️
                  </button>
                  <button
                    (click)="downloadPDF(inv.id)"
                    title="Save PDF File"
                    class="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-cyan-400 rounded-lg transition active:scale-90 cursor-pointer"
                  >
                    💾
                  </button>
                  <button
                    (click)="shareInvoiceText(inv)"
                    title="Share Bill Receipt"
                    class="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-emerald-400 rounded-lg transition active:scale-90 cursor-pointer"
                  >
                    🔗
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="invoices().length === 0">
              <td colspan="9" class="py-12 text-center text-slate-500 font-mono text-xs">
                No tax invoices matching filter criteria logged. Generate your first invoice!
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Sharing Toast Notification -->
      <div
        *ngIf="showToast()"
        class="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-sans text-xs font-semibold px-4 py-3 rounded-xl shadow-xl border border-emerald-500/20 max-w-sm flex items-center gap-2 animate-bounce"
      >
        <span>✅ Bill link & receipt copied to clipboard! Ready to share on WhatsApp.</span>
      </div>

    </div>
  `
})
export class InvoiceListComponent implements OnInit {
  // Event triggers
  @Output() createInvoice = new EventEmitter<void>();
  @Output() configureCompany = new EventEmitter<void>();

  // Search parameters
  searchQuery = '';
  fromDate = '';
  toDate = '';

  // Local state signals
  showToast = signal<boolean>(false);

  // Compute public metrics signals
  totalInvoiceCount = computed(() => this.invoiceService.invoiceCount());
  totalBilledRevenue = computed(() => this.invoiceService.totalBilledRevenue());
  totalOutstandingBalance = computed(() => this.invoiceService.totalDueBalance());

  constructor(
    public invoiceService: InvoiceService,
    private pdfService: PdfService
  ) {}

  ngOnInit(): void {
    this.invoiceService.loadInvoices().subscribe({
      next: () => console.log('Invoices cache loaded index.')
    });
    this.invoiceService.loadCompanySettings().subscribe();
  }

  onFilterChanged(): void {
    this.invoiceService.loadInvoices(this.searchQuery, this.fromDate, this.toDate).subscribe();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  triggerCreateInvoice(): void {
    this.createInvoice.emit();
  }

  triggerConfigureCompany(): void {
    this.configureCompany.emit();
  }

  printPDF(invoiceId: string): void {
    this.invoiceService.fetchInvoiceDetails(invoiceId).subscribe(details => {
      if (details) {
        this.pdfService.generateAndPrintInvoice(details);
      } else {
        alert('Could not isolate database details for of this invoice.');
      }
    });
  }

  downloadPDF(invoiceId: string): void {
    this.invoiceService.fetchInvoiceDetails(invoiceId).subscribe(details => {
      if (details) {
        this.pdfService.generateAndDownloadInvoice(details);
      } else {
        alert('Could not isolate database details for of this invoice.');
      }
    });
  }

  shareInvoiceText(inv: IInvoice): void {
    const formattedDate = new Date(inv.invoice_date).toLocaleDateString('en-IN');
    const formattedAmount = inv.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const formattedDue = inv.due_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const sharedText = `⚡ SG Engineering Works Tax Invoice ⚡\n` +
      `-----------------------------------------\n` +
      `Invoice No: ${inv.invoice_number}\n` +
      `Date: ${formattedDate}\n` +
      `Customer: ${inv.customer_name || 'Generic Client'}\n` +
      `Gross Invoice Value: ₹${formattedAmount}\n` +
      `Outstanding Balance: ₹${formattedDue}\n` +
      `Status: ${inv.due_amount <= 0 ? 'PAID RECEIPT' : 'DUE / PART PAID'}\n` +
      `-----------------------------------------\n` +
      `Offline ledger synced in WAL secure mode. Thank you for your business!`;

    navigator.clipboard.writeText(sharedText).then(() => {
      this.showToast.set(true);
      setTimeout(() => this.showToast.set(false), 4000);
    }).catch(err => {
      console.warn('Clipboard write error', err);
      alert(`Invoice Receipt Text:\n\n${sharedText}`);
    });
  }
}
