import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { CustomerRepository } from '../../../data/repositories/customer.repository';
import { ICustomer, ICustomerInteraction, ILedgerEntry } from '../../../data/models/customer.interface';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  // Angular Signals for Modern Responsive State Management
  private customersListSignal: WritableSignal<ICustomer[]> = signal<ICustomer[]>([]);
  private selectedCustomerSignal: WritableSignal<ICustomer | null> = signal<ICustomer | null>(null);
  private ledgerEntriesSignal: WritableSignal<ILedgerEntry[]> = signal<ILedgerEntry[]>([]);
  private interactionsSignal: WritableSignal<ICustomerInteraction[]> = signal<ICustomerInteraction[]>([]);
  private isSearchingSignal: WritableSignal<boolean> = signal<boolean>(false);
  
  // Public-facing computed Signals (Read-only pipelines)
  public customers = computed(() => this.customersListSignal());
  public selectedCustomer = computed(() => this.selectedCustomerSignal());
  public ledgerEntries = computed(() => this.ledgerEntriesSignal());
  public interactions = computed(() => this.interactionsSignal());
  public isSearching = computed(() => this.isSearchingSignal());

  // Derived Signal metrics (Zero-cost calculations)
  public outstandingCustomersCount = computed(() => {
    return this.customersListSignal().filter(c => c.outstanding_balance > 0).length;
  });

  public totalOutstandingBalance = computed(() => {
    return this.customersListSignal().reduce((acc, c) => acc + c.outstanding_balance, 0);
  });

  constructor(private customerRepo: CustomerRepository) {}

  /**
   * Refreshes customer directory based on search filters.
   */
  public loadCustomers(query: string = '', filterByDues: boolean = false): Observable<ICustomer[]> {
    this.isSearchingSignal.set(true);
    return this.customerRepo.searchCustomers(query, filterByDues).pipe(
      tap({
        next: (list) => {
          this.customersListSignal.set(list);
          this.isSearchingSignal.set(false);
        },
        error: () => this.isSearchingSignal.set(false)
      })
    );
  }

  /**
   * Loads specific customer and refreshes downstream accounts and interactions timeline.
   */
  public selectCustomer(customerId: string): Observable<ICustomer | null> {
    return this.customerRepo.getCustomerById(customerId).pipe(
      tap((customer) => {
        this.selectedCustomerSignal.set(customer);
        if (customer) {
          // Trigger related sub-load sequences
          this.loadCustomerLedger(customerId).subscribe();
          this.loadCustomerInteractions(customerId).subscribe();
        } else {
          this.ledgerEntriesSignal.set([]);
          this.interactionsSignal.set([]);
        }
      })
    );
  }

  /**
   * Save a newly registered Customer profile, immediately updating signal states.
   */
  public registerCustomer(customerData: Omit<ICustomer, 'id' | 'outstanding_balance' | 'created_date' | 'updated_date'>): Observable<void> {
    const timestamp = new Date().toISOString();
    const newCustomer: ICustomer = {
      ...customerData,
      id: crypto.randomUUID(),
      outstanding_balance: 0.0,
      created_date: timestamp,
      updated_date: timestamp
    };

    return this.customerRepo.createCustomer(newCustomer).pipe(
      tap(() => {
        // Append new customer to state directly
        this.customersListSignal.update(existing => [newCustomer, ...existing]);
      })
    );
  }

  /**
   * Update existing customer properties.
   */
  public editCustomer(customer: ICustomer): Observable<void> {
    customer.updated_date = new Date().toISOString();
    return this.customerRepo.updateCustomer(customer).pipe(
      tap(() => {
        // Update item inside signals list
        this.customersListSignal.update(existing => 
          existing.map(c => c.id === customer.id ? customer : c)
        );
        if (this.selectedCustomerSignal()?.id === customer.id) {
          this.selectedCustomerSignal.set(customer);
        }
      })
    );
  }

  /**
   * Log contact timeline entry.
   */
  public logInteraction(customerId: string, type: ICustomerInteraction['interaction_type'], notes: string, followUp?: string): Observable<void> {
    const newLog: ICustomerInteraction = {
      id: crypto.randomUUID(),
      customer_id: customerId,
      interaction_date: new Date().toISOString().split('T')[0],
      interaction_type: type,
      notes,
      follow_up_date: followUp || null,
      created_date: new Date().toISOString()
    };

    return this.customerRepo.addInteraction(newLog).pipe(
      tap(() => {
        this.interactionsSignal.update(logs => [newLog, ...logs]);
      })
    );
  }

  /**
   * Resolves running ledger details for signals display.
   */
  public loadCustomerLedger(customerId: string): Observable<ILedgerEntry[]> {
    return this.customerRepo.getCustomerLedgerHistory(customerId).pipe(
      tap(entries => {
        this.ledgerEntriesSignal.set(entries);
      })
    );
  }

  /**
   * Timeline loader binder.
   */
  private loadCustomerInteractions(customerId: string): Observable<ICustomerInteraction[]> {
    return this.customerRepo.getInteractionsByCustomerId(customerId).pipe(
      tap(logs => {
        this.interactionsSignal.set(logs);
      })
    );
  }
}
