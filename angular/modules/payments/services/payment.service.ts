import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { Observable, tap, of, forkJoin, map, switchMap, from } from 'rxjs';
import { PaymentRepository } from '../../../data/repositories/payment.repository';
import { IPayment, IOrderPaymentSummary, ICustomerOutstandingSummary, PaymentMethod } from '../../../data/models/payment.interface';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  // Angular Signals for modern responsive state management
  private paymentsListSignal: WritableSignal<IPayment[]> = signal<IPayment[]>([]);
  private selectedPaymentSignal: WritableSignal<IPayment | null> = signal<IPayment | null>(null);
  private orderSummariesSignal: WritableSignal<IOrderPaymentSummary[]> = signal<IOrderPaymentSummary[]>([]);
  private selectedOrderSummarySignal: WritableSignal<IOrderPaymentSummary | null> = signal<IOrderPaymentSummary | null>(null);
  private isProcessingSignal: WritableSignal<boolean> = signal<boolean>(false);

  // Read-only public pipelines for UI binding
  public payments = computed(() => this.paymentsListSignal());
  public selectedPayment = computed(() => this.selectedPaymentSignal());
  public orderSummaries = computed(() => this.orderSummariesSignal());
  public selectedOrderSummary = computed(() => this.selectedOrderSummarySignal());
  public isProcessing = computed(() => this.isProcessingSignal());

  // Derived high-fidelity analytical counters
  public totalPaymentsCount = computed(() => this.paymentsListSignal().length);
  
  public totalCollectedAmount = computed(() => {
    return this.paymentsListSignal().reduce((sum, p) => sum + p.payment_amount, 0);
  });

  public aggregateOutstandingAmount = computed(() => {
    return this.orderSummariesSignal().reduce((sum, os) => sum + os.outstanding_balance, 0);
  });

  constructor(private paymentRepo: PaymentRepository) {}

  /**
   * Loaded filtered payments from the database.
   */
  public loadPayments(
    queryBy: string = '',
    methodFilter?: string,
    fromDate?: string,
    toDate?: string
  ): Observable<IPayment[]> {
    this.isProcessingSignal.set(true);
    return this.paymentRepo.searchPayments(queryBy, methodFilter, fromDate, toDate).pipe(
      tap({
        next: (items) => {
          this.paymentsListSignal.set(items);
          this.isProcessingSignal.set(false);
        },
        error: () => this.isProcessingSignal.set(false)
      })
    );
  }

  /**
   * Hydrates all order payment summaries (Orders, totals, received, outstandings)
   */
  public loadOrderSummaries(queryBy: string = ''): Observable<IOrderPaymentSummary[]> {
    this.isProcessingSignal.set(true);
    return this.paymentRepo.getOrderPaymentSummaries(queryBy).pipe(
      tap({
        next: (items) => {
          this.orderSummariesSignal.set(items);
          this.isProcessingSignal.set(false);
        },
        error: () => this.isProcessingSignal.set(false)
      })
    );
  }

  /**
   * Hydrates single order summary detail.
   */
  public loadOrderPaymentSummary(orderId: string): Observable<IOrderPaymentSummary | null> {
    this.isProcessingSignal.set(true);
    return this.paymentRepo.getOrderPaymentSummary(orderId).pipe(
      tap({
        next: (summary) => {
          this.selectedOrderSummarySignal.set(summary);
          this.isProcessingSignal.set(false);
        },
        error: () => this.isProcessingSignal.set(false)
      })
    );
  }

  /**
   * Register a new payment.
   */
  public registerPayment(
    paymentData: Omit<IPayment, 'id' | 'created_date' | 'updated_date'>
  ): Observable<void> {
    this.isProcessingSignal.set(true);
    const timestamp = new Date().toISOString();
    const newPayment: IPayment = {
      ...paymentData,
      id: crypto.randomUUID(),
      created_date: timestamp,
      updated_date: timestamp
    };

    return this.paymentRepo.createPayment(newPayment).pipe(
      switchMap(() => {
        // Refresh all local signals to guarantee up-to-date outstanding totals
        return forkJoin({
          payments: this.loadPayments(),
          summaries: this.loadOrderSummaries()
        });
      }),
      tap(() => {
        this.isProcessingSignal.set(false);
      }),
      map(() => void 0)
    );
  }

  /**
   * Modify existing payment logs.
   */
  public modifyPayment(payment: IPayment): Observable<void> {
    this.isProcessingSignal.set(true);
    payment.updated_date = new Date().toISOString();

    return this.paymentRepo.updatePayment(payment).pipe(
      switchMap(() => {
        return forkJoin({
          payments: this.loadPayments(),
          summaries: this.loadOrderSummaries()
        });
      }),
      tap(() => {
        if (this.selectedPaymentSignal()?.id === payment.id) {
          this.selectedPaymentSignal.set(payment);
        }
        this.isProcessingSignal.set(false);
      }),
      map(() => void 0)
    );
  }

  /**
   * Permanently delete a payment record from the database.
   */
  public purgePayment(id: string, customerId: string): Observable<void> {
    this.isProcessingSignal.set(true);
    return this.paymentRepo.deletePayment(id, customerId).pipe(
      switchMap(() => {
        return forkJoin({
          payments: this.loadPayments(),
          summaries: this.loadOrderSummaries()
        });
      }),
      tap(() => {
        if (this.selectedPaymentSignal()?.id === id) {
          this.selectedPaymentSignal.set(null);
        }
        this.isProcessingSignal.set(false);
      }),
      map(() => void 0)
    );
  }

  /**
   * Load customer-specific double-entry statement indicators
   */
  public loadCustomerLedgerSummary(customerId: string): Observable<ICustomerOutstandingSummary | null> {
    return this.paymentRepo.getCustomerOutstandingSummary(customerId);
  }
}
