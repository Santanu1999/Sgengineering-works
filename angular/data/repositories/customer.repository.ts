import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ICustomer, ICustomerInteraction, ILedgerEntry } from '../models/customer.interface';

// Custom interface for database connection abstraction representing Capacitor SQLite interface
export interface ISQLiteConnection {
  execute(sql: string): Promise<any>;
  run(sql: string, params?: any[]): Promise<any>;
  query(sql: string, params?: any[]): Promise<{ values?: any[] }>;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerRepository {
  // Mock DB Connection reference for Angular compilation
  private dbConnection!: ISQLiteConnection;

  constructor() {}

  /**
   * Sets/Initializes active connection
   */
  public setConnection(conn: ISQLiteConnection): void {
    this.dbConnection = conn;
  }

  /**
   * Create a Customer with transaction guard.
   */
  public createCustomer(customer: ICustomer): Observable<void> {
    const sql = `
      INSERT INTO customers (
        id, name, mobile, alternate_mobile, address, email, gst_number, notes, outstanding_balance, created_date, updated_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      customer.id,
      customer.name,
      customer.mobile,
      customer.alternate_mobile || null,
      customer.address || null,
      customer.email || null,
      customer.gst_number || null,
      customer.notes || null,
      customer.outstanding_balance || 0.0,
      customer.created_date,
      customer.updated_date
    ];

    return from(this.dbConnection.run(sql, params)).pipe(map(() => void 0));
  }

  /**
   * Update Customer profile
   */
  public updateCustomer(customer: ICustomer): Observable<void> {
    const sql = `
      UPDATE customers 
      SET name = ?, mobile = ?, alternate_mobile = ?, address = ?, email = ?, gst_number = ?, notes = ?, updated_date = ?
      WHERE id = ?;
    `;
    const params = [
      customer.name,
      customer.mobile,
      customer.alternate_mobile || null,
      customer.address || null,
      customer.email || null,
      customer.gst_number || null,
      customer.notes || null,
      customer.updated_date,
      customer.id
    ];

    return from(this.dbConnection.run(sql, params)).pipe(map(() => void 0));
  }

  /**
   * Delete Customer (Fails if there are active orders due to ON DELETE RESTRICT)
   */
  public deleteCustomer(id: string): Observable<void> {
    const sql = `DELETE FROM customers WHERE id = ?;`;
    return from(this.dbConnection.run(sql, [id])).pipe(map(() => void 0));
  }

  /**
   * Fetch Customer profile by ID
   */
  public getCustomerById(id: string): Observable<ICustomer | null> {
    const sql = `SELECT * FROM customers WHERE id = ?;`;
    return from(this.dbConnection.query(sql, [id])).pipe(
      map(res => {
        if (res.values && res.values.length > 0) {
          return res.values[0] as ICustomer;
        }
        return null;
      })
    );
  }

  /**
   * List all customers with dynamic search and sorting by outstanding balance of name
   */
  public searchCustomers(query: string, filterByDues: boolean = false): Observable<ICustomer[]> {
    let sql = `SELECT * FROM customers`;
    const params: any[] = [];

    const conditions: string[] = [];

    if (query && query.trim() !== '') {
      conditions.push(`(name LIKE ? OR mobile LIKE ? OR company_name LIKE ?)`);
      const term = `%${query}%`;
      params.push(term, term, term);
    }

    if (filterByDues) {
      conditions.push(`outstanding_balance > 0.0`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY outstanding_balance DESC, name COLLATE NOCASE ASC;`;

    return from(this.dbConnection.query(sql, params)).pipe(
      map(res => (res.values ? (res.values as ICustomer[]) : []))
    );
  }

  /**
   * Add Customer Interaction Log
   */
  public addInteraction(interaction: ICustomerInteraction): Observable<void> {
    const sql = `
      INSERT INTO customer_interactions (
        id, customer_id, interaction_date, interaction_type, notes, follow_up_date, created_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      interaction.id,
      interaction.customer_id,
      interaction.interaction_date,
      interaction.interaction_type,
      interaction.notes || null,
      interaction.follow_up_date || null,
      interaction.created_date
    ];

    return from(this.dbConnection.run(sql, params)).pipe(map(() => void 0));
  }

  /**
   * Get Customer Interactions Timeline
   */
  public getInteractionsByCustomerId(customerId: string): Observable<ICustomerInteraction[]> {
    const sql = `
      SELECT * FROM customer_interactions 
      WHERE customer_id = ? 
      ORDER BY interaction_date DESC;
    `;
    return from(this.dbConnection.query(sql, [customerId])).pipe(
      map(res => (res.values ? (res.values as ICustomerInteraction[]) : []))
    );
  }

  /**
   * Retrieve Running Statement Ledger for Customer (Double Entry Audit)
   * Collates Invoices (Debits) and Payments (Credits) chronologically.
   */
  public getCustomerLedgerHistory(customerId: string): Observable<ILedgerEntry[]> {
    const sql = `
      SELECT 
        id, invoice_date as entry_date, 'Debit (Invoice)' as entry_type, invoice_number as ref_no,
        'Billing: Order Invoice' as description, total_amount as debit, 0.0 as credit
      FROM invoices
      WHERE order_id IN (SELECT id FROM orders WHERE customer_id = ?)

      UNION ALL

      SELECT 
        id, payment_date as entry_date, 'Credit (Payment)' as entry_type, id as ref_no,
        'Payment: Cash / UPI received' as description, 0.0 as debit, payment_amount as credit
      FROM payments
      WHERE customer_id = ?

      ORDER BY entry_date ASC;
    `;

    return from(this.dbConnection.query(sql, [customerId, customerId])).pipe(
      map(res => {
        const rawRows = res.values || [];
        let runningBal = 0.0;
        
        return rawRows.map(row => {
          runningBal += (row.debit - row.credit);
          return {
            id: row.id,
            date: row.entry_date,
            type: row.entry_type,
            reference_no: row.ref_no,
            description: row.description,
            debit_amount: row.debit,
            credit_amount: row.credit,
            running_balance: runningBal
          } as ILedgerEntry;
        });
      })
    );
  }
}
