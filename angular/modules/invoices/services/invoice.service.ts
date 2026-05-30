import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { Observable, tap, of, forkJoin, map, switchMap, from } from 'rxjs';
import { InvoiceRepository } from '../../../data/repositories/invoice.repository';
import { IInvoice, ICompanySettings, IInvoiceWithDetails } from '../../../data/models/invoice.interface';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  // Signals for state synchronization
  private invoicesListSignal: WritableSignal<IInvoice[]> = signal<IInvoice[]>([]);
  private selectedInvoiceSignal: WritableSignal<IInvoice | null> = signal<IInvoice | null>(null);
  private companySettingsSignal: WritableSignal<ICompanySettings | null> = signal<ICompanySettings | null>(null);
  private invoicingOrdersSignal = signal<any[]>([]);
  private isProcessingSignal: WritableSignal<boolean> = signal<boolean>(false);

  // Read-only pipelines for UI
  public invoices = computed(() => this.invoicesListSignal());
  public selectedInvoice = computed(() => this.selectedInvoiceSignal());
  public companySettings = computed(() => this.companySettingsSignal());
  public invoicingOrders = computed(() => this.invoicingOrdersSignal());
  public isProcessing = computed(() => this.isProcessingSignal());

  // Aggregate signals
  public invoiceCount = computed(() => this.invoicesListSignal().length);
  public totalBilledRevenue = computed(() => {
    return this.invoicesListSignal().reduce((sum, inv) => sum + inv.total_amount, 0);
  });
  public totalDueBalance = computed(() => {
    return this.invoicesListSignal().reduce((sum, inv) => sum + inv.due_amount, 0);
  });

  constructor(private invoiceRepo: InvoiceRepository) {}

  /**
   * Load and hydrate list of invoices
   */
  public loadInvoices(
    queryBy: string = '',
    fromDate?: string,
    toDate?: string
  ): Observable<IInvoice[]> {
    this.isProcessingSignal.set(true);
    return this.invoiceRepo.searchInvoices(queryBy, fromDate, toDate).pipe(
      tap({
        next: (items) => {
          this.invoicesListSignal.set(items);
          this.isProcessingSignal.set(false);
        },
        error: () => this.isProcessingSignal.set(false)
      })
    );
  }

  /**
   * Load and hydrate list of orders available for invoicing
   */
  public loadInvoicingOrders(queryBy: string = ''): Observable<any[]> {
    this.isProcessingSignal.set(true);
    return this.invoiceRepo.getInvoicingOrdersList(queryBy).pipe(
      tap({
        next: (orders) => {
          this.invoicingOrdersSignal.set(orders);
          this.isProcessingSignal.set(false);
        },
        error: () => this.isProcessingSignal.set(false)
      })
    );
  }

  /**
   * Loads specific invoice compound details
   */
  public fetchInvoiceDetails(id: string): Observable<IInvoiceWithDetails | null> {
    this.isProcessingSignal.set(true);
    return this.invoiceRepo.getInvoiceWithDetails(id).pipe(
      tap({
        next: () => this.isProcessingSignal.set(false),
        error: () => this.isProcessingSignal.set(false)
      })
    );
  }

  /**
   * Hydrates active company settings
   */
  public loadCompanySettings(): Observable<ICompanySettings> {
    return this.invoiceRepo.getCompanySettings().pipe(
      tap(settings => this.companySettingsSignal.set(settings))
    );
  }

  /**
   * Updates/Saves company settings
   */
  public saveCompanySettings(settings: ICompanySettings): Observable<void> {
    this.isProcessingSignal.set(true);
    return this.invoiceRepo.saveCompanySettings(settings).pipe(
      switchMap(() => this.loadCompanySettings()),
      tap(() => this.isProcessingSignal.set(false)),
      map(() => void 0)
    );
  }

  /**
   * Programmatic GST split back-calculations (Aligned with guidelines)
   * Gross Total = Taxable Amount + GST
   */
  public calculateGST(
    totalRevenue: number,
    gstRate: number = 18.0,
    isInterstate: boolean = false
  ) {
    const rateFactor = 1 + (gstRate / 100);
    const taxable_amount = Number((totalRevenue / rateFactor).toFixed(2));
    const total_gst = Number((totalRevenue - taxable_amount).toFixed(2));

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterstate) {
      igst = total_gst;
    } else {
      cgst = Number((total_gst / 2).toFixed(2));
      sgst = Number((total_gst - cgst).toFixed(2)); // handle split rounding error
    }

    return {
      taxable_amount,
      gst_rate: gstRate,
      cgst,
      sgst,
      igst,
      total_amount: Number(totalRevenue.toFixed(2))
    };
  }

  /**
   * Automatically projects next sequence invoice number (e.g. SG/2026-27/005)
   */
  public getNextInvoiceNumber(): Observable<string> {
    return this.invoiceRepo.searchInvoices().pipe(
      map(list => {
        if (list.length === 0) {
          const year = new Date().getFullYear();
          const nextYearShort = (year + 1).toString().slice(-2);
          return `SG/${year}-${nextYearShort}/001`;
        }

        // Parse previous record
        const lastNo = list[0].invoice_number; // e.g. SG/2026-27/003
        const parts = lastNo.split('/');
        if (parts.length === 3) {
          const seqNum = parseInt(parts[2], 10);
          if (!isNaN(seqNum)) {
            const nextSeqStr = (seqNum + 1).toString().padStart(3, '0');
            return `${parts[0]}/${parts[1]}/${nextSeqStr}`;
          }
        }

        // Defending fallback sequence
        const fallbackYear = new Date().getFullYear();
        const fallbackNextYearShort = (fallbackYear + 1).toString().slice(-2);
        return `SG/${fallbackYear}-${fallbackNextYearShort}/${(list.length + 1).toString().padStart(3, '0')}`;
      })
    );
  }

  /**
   * Save a newly created tax invoice record
   */
  public registerInvoice(invoiceData: Omit<IInvoice, 'id' | 'created_date'>): Observable<void> {
    this.isProcessingSignal.set(true);
    
    const newInvoice: IInvoice = {
      ...invoiceData,
      id: crypto.randomUUID(),
      created_date: new Date().toISOString()
    };

    return this.invoiceRepo.createInvoice(newInvoice).pipe(
      switchMap(() => this.loadInvoices()),
      tap(() => this.isProcessingSignal.set(false)),
      map(() => void 0)
    );
  }
}
