import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { IPayment, IOrderPaymentSummary, ICustomerOutstandingSummary } from '../models/payment.interface';
import { ISQLiteConnection } from './customer.repository';

@Injectable({
  providedIn: 'root'
})
export class PaymentRepository {
  private dbConnection!: ISQLiteConnection;

  constructor() {}

  /**
   * Sets/Initializes active connection
   */
  public setConnection(conn: ISQLiteConnection): void {
    this.dbConnection = conn;
  }

  /**
   * Add a payment record to the local persistent SQLite db.
   */
  public createPayment(payment: IPayment): Observable<void> {
    const sql = `
      INSERT INTO payments (
        id, customer_id, order_id, payment_date, payment_amount, payment_method, reference_no, remarks, created_date, updated_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      payment.id,
      payment.customer_id,
      payment.order_id,
      payment.payment_date,
      payment.payment_amount,
      payment.payment_method,
      payment.reference_no || null,
      payment.remarks || null,
      payment.created_date,
      payment.updated_date
    ];

    return from(this.dbConnection.run(sql, params)).pipe(
      switchMap(() => this.updateCustomerOutstanding(payment.customer_id)),
      map(() => void 0)
    );
  }

  /**
   * Update a payment record.
   */
  public updatePayment(payment: IPayment): Observable<void> {
    const sql = `
      UPDATE payments
      SET customer_id = ?, order_id = ?, payment_date = ?, payment_amount = ?, payment_method = ?, reference_no = ?, remarks = ?, updated_date = ?
      WHERE id = ?;
    `;
    const params = [
      payment.customer_id,
      payment.order_id,
      payment.payment_date,
      payment.payment_amount,
      payment.payment_method,
      payment.reference_no || null,
      payment.remarks || null,
      payment.updated_date,
      payment.id
    ];

    return from(this.dbConnection.run(sql, params)).pipe(
      switchMap(() => this.updateCustomerOutstanding(payment.customer_id)),
      map(() => void 0)
    );
  }

  /**
   * Delete a payment record.
   */
  public deletePayment(id: string, customerId: string): Observable<void> {
    const sql = `DELETE FROM payments WHERE id = ?;`;
    return from(this.dbConnection.run(sql, [id])).pipe(
      switchMap(() => this.updateCustomerOutstanding(customerId)),
      map(() => void 0)
    );
  }

  /**
   * Retrieve specific payment record by ID.
   */
  public getPaymentById(id: string): Observable<IPayment | null> {
    const sql = `
      SELECT p.*, c.name as customer_name, o.order_number
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      JOIN orders o ON p.order_id = o.id
      WHERE p.id = ?;
    `;
    return from(this.dbConnection.query(sql, [id])).pipe(
      map(res => {
        if (res.values && res.values.length > 0) {
          return res.values[0] as IPayment;
        }
        return null;
      })
    );
  }

  /**
   * Fetch all payments linked to a specific Order (Multiple payments per order support)
   */
  public getPaymentsByOrderId(orderId: string): Observable<IPayment[]> {
    const sql = `
      SELECT p.*, c.name as customer_name, o.order_number
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      JOIN orders o ON p.order_id = o.id
      WHERE p.order_id = ?
      ORDER BY p.payment_date DESC, p.created_date DESC;
    `;
    return from(this.dbConnection.query(sql, [orderId])).pipe(
      map(res => (res.values ? (res.values as IPayment[]) : []))
    );
  }

  /**
   * Fetch all payments registered under a customer profile.
   */
  public getPaymentsByCustomerId(customerId: string): Observable<IPayment[]> {
    const sql = `
      SELECT p.*, o.order_number
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.customer_id = ?
      ORDER BY p.payment_date DESC, p.created_date DESC;
    `;
    return from(this.dbConnection.query(sql, [customerId])).pipe(
      map(res => (res.values ? (res.values as IPayment[]) : []))
    );
  }

  /**
   * Powerful search and filter utility over all logged payment items.
   */
  public searchPayments(
    queryString?: string,
    method?: string,
    fromDate?: string,
    toDate?: string
  ): Observable<IPayment[]> {
    let sql = `
      SELECT p.*, c.name as customer_name, o.order_number
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      JOIN orders o ON p.order_id = o.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (queryString && queryString.trim() !== '') {
      conditions.push(`(o.order_number LIKE ? OR c.name LIKE ? OR p.reference_no LIKE ? OR p.remarks LIKE ?)`);
      const term = `%${queryString}%`;
      params.push(term, term, term, term);
    }

    if (method && method !== '') {
      conditions.push(`p.payment_method = ?`);
      params.push(method);
    }

    if (fromDate) {
      conditions.push(`p.payment_date >= ?`);
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push(`p.payment_date <= ?`);
      params.push(toDate);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY p.payment_date DESC, p.created_date DESC;`;

    return from(this.dbConnection.query(sql, params)).pipe(
      map(res => (res.values ? (res.values as IPayment[]) : []))
    );
  }

  /**
   * Automatically calculates: Order Total, Summed Payments, outstanding balance for an order
   */
  public getOrderPaymentSummary(orderId: string): Observable<IOrderPaymentSummary | null> {
    const sql = `
      SELECT 
        o.id as order_id,
        o.order_number,
        o.customer_id,
        c.name as customer_name,
        COALESCE((SELECT SUM(quantity * final_cost) FROM order_items WHERE order_id = o.id), 0.0) as order_total,
        COALESCE((SELECT SUM(payment_amount) FROM payments WHERE order_id = o.id), 0.0) as payments_received
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?;
    `;

    return from(this.dbConnection.query(sql, [orderId])).pipe(
      map(res => {
        if (res.values && res.values.length > 0) {
          const row = res.values[0];
          return {
            order_id: row.order_id,
            order_number: row.order_number,
            customer_id: row.customer_id,
            customer_name: row.customer_name,
            order_total: Number(row.order_total),
            payments_received: Number(row.payments_received),
            outstanding_balance: Number(row.order_total) - Number(row.payments_received)
          } as IOrderPaymentSummary;
        }
        return null;
      })
    );
  }

  /**
   * Retrieves summary for all orders that have outstanding balances or match query
   */
  public getOrderPaymentSummaries(queryString?: string): Observable<IOrderPaymentSummary[]> {
    let sql = `
      SELECT 
        o.id as order_id,
        o.order_number,
        o.customer_id,
        c.name as customer_name,
        COALESCE((SELECT SUM(quantity * final_cost) FROM order_items WHERE order_id = o.id), 0.0) as order_total,
        COALESCE((SELECT SUM(payment_amount) FROM payments WHERE order_id = o.id), 0.0) as payments_received
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (queryString && queryString.trim() !== '') {
      conditions.push(`(o.order_number LIKE ? OR c.name LIKE ?)`);
      const term = `%${queryString}%`;
      params.push(term, term);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY o.order_number DESC;`;

    return from(this.dbConnection.query(sql, params)).pipe(
      map(res => {
        const rows = res.values || [];
        return rows.map(row => ({
          order_id: row.order_id,
          order_number: row.order_number,
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          order_total: Number(row.order_total),
          payments_received: Number(row.payments_received),
          outstanding_balance: Number(row.order_total) - Number(row.payments_received)
        }));
      })
    );
  }

  /**
   * Customer Ledger Aggregate calculations
   */
  public getCustomerOutstandingSummary(customerId: string): Observable<ICustomerOutstandingSummary | null> {
    const sql = `
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.mobile,
        COALESCE((
          SELECT SUM(oi.quantity * oi.final_cost) 
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE o.customer_id = c.id AND o.status != 'Cancelled'
        ), 0.0) as total_order_value,
        COALESCE((
          SELECT SUM(payment_amount) 
          FROM payments 
          WHERE customer_id = c.id
        ), 0.0) as total_payments
      FROM customers c
      WHERE c.id = ?;
    `;

    return from(this.dbConnection.query(sql, [customerId])).pipe(
      map(res => {
        if (res.values && res.values.length > 0) {
          const row = res.values[0];
          return {
            customer_id: row.customer_id,
            customer_name: row.customer_name,
            mobile: row.mobile,
            total_order_value: Number(row.total_order_value),
            total_payments: Number(row.total_payments),
            aggregate_outstanding: Number(row.total_order_value) - Number(row.total_payments)
          } as ICustomerOutstandingSummary;
        }
        return null;
      })
    );
  }

  /**
   * Programmatic Outstanding Balance Sync to keeping parent records safe.
   */
  private updateCustomerOutstanding(customerId: string): Observable<void> {
    // Audit customer outstanding balance: Orders sum minus payment sum
    const sqlGet = `
      SELECT 
        (
          SELECT COALESCE(SUM(oi.quantity * oi.final_cost), 0.0)
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE o.customer_id = ? AND o.status != 'Cancelled'
        ) as billing,
        (
          SELECT COALESCE(SUM(payment_amount), 0.0)
          FROM payments
          WHERE customer_id = ?
        ) as paid;
    `;

    return from(this.dbConnection.query(sqlGet, [customerId, customerId])).pipe(
      switchMap(res => {
        const billing = res.values && res.values.length > 0 ? Number(res.values[0].billing) : 0.0;
        const paid = res.values && res.values.length > 0 ? Number(res.values[0].paid) : 0.0;
        const netDues = Math.max(0.0, billing - paid);

        const sqlUpdate = `
          UPDATE customers
          SET outstanding_balance = ?, updated_date = ?
          WHERE id = ?;
        `;
        return from(this.dbConnection.run(sqlUpdate, [netDues, new Date().toISOString(), customerId]));
      }),
      map(() => void 0)
    );
  }
}
