import { Injectable } from '@angular/core';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { IInvoice, ICompanySettings, IInvoiceWithDetails } from '../models/invoice.interface';
import { ISQLiteConnection } from './customer.repository';
import { ICustomer } from '../models/customer.interface';
import { IOrder, IOrderItem } from '../models/order.interface';

@Injectable({
  providedIn: 'root'
})
export class InvoiceRepository {
  private dbConnection!: ISQLiteConnection;

  constructor() {}

  /**
   * Sets/Initializes active connection
   */
  public setConnection(conn: ISQLiteConnection): void {
    this.dbConnection = conn;
  }

  /**
   * Create a new formal invoice in the database.
   */
  public createInvoice(invoice: IInvoice): Observable<void> {
    const sql = `
      INSERT INTO invoices (
        id, invoice_number, order_id, invoice_date, taxable_amount, gst_rate, cgst, sgst, igst, total_amount, paid_amount, due_amount, created_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      invoice.id,
      invoice.invoice_number,
      invoice.order_id,
      invoice.invoice_date,
      invoice.taxable_amount,
      invoice.gst_rate,
      invoice.cgst,
      invoice.sgst,
      invoice.igst,
      invoice.total_amount,
      invoice.paid_amount,
      invoice.due_amount,
      invoice.created_date
    ];

    // Trigger update status on related order or update log
    return from(this.dbConnection.run(sql, params)).pipe(
      switchMap(() => {
        // Automatically transition order to delivered or set payment audits
        const updateOrderSql = `UPDATE orders SET status = 'Delivered', updated_date = ? WHERE id = ? AND status != 'Delivered'`;
        return from(this.dbConnection.run(updateOrderSql, [new Date().toISOString(), invoice.order_id]));
      }),
      map(() => void 0)
    );
  }

  /**
   * Fetch an invoice by its unique ID.
   */
  public getInvoiceById(id: string): Observable<IInvoice | null> {
    const sql = `
      SELECT i.*, c.name as customer_name, o.order_number
      FROM invoices i
      JOIN orders o ON i.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE i.id = ?;
    `;
    return from(this.dbConnection.query(sql, [id])).pipe(
      map(res => {
        if (res.values && res.values.length > 0) {
          return res.values[0] as IInvoice;
        }
        return null;
      })
    );
  }

  /**
   * Fetch invoice records matching target Order ID
   */
  public getInvoicesByOrderId(orderId: string): Observable<IInvoice[]> {
    const sql = `
      SELECT i.*, c.name as customer_name, o.order_number
      FROM invoices i
      JOIN orders o ON i.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE i.order_id = ?
      ORDER BY i.invoice_date DESC, i.created_date DESC;
    `;
    return from(this.dbConnection.query(sql, [orderId])).pipe(
      map(res => (res.values ? (res.values as IInvoice[]) : []))
    );
  }

  /**
   * Powerful search and history filter utility over all logged invoices.
   */
  public searchInvoices(
    queryString?: string,
    fromDate?: string,
    toDate?: string
  ): Observable<IInvoice[]> {
    let sql = `
      SELECT i.*, c.name as customer_name, o.order_number
      FROM invoices i
      JOIN orders o ON i.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (queryString && queryString.trim() !== '') {
      conditions.push(`(i.invoice_number LIKE ? OR c.name LIKE ? OR o.order_number LIKE ?)`);
      const term = `%${queryString}%`;
      params.push(term, term, term);
    }

    if (fromDate) {
      conditions.push(`i.invoice_date >= ?`);
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push(`i.invoice_date <= ?`);
      params.push(toDate);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY i.invoice_date DESC, i.created_date DESC;`;

    return from(this.dbConnection.query(sql, params)).pipe(
      map(res => (res.values ? (res.values as IInvoice[]) : []))
    );
  }

  /**
   * High-fidelity structural composite query to prepare dynamic PDF print details
   */
  public getInvoiceWithDetails(invoiceId: string): Observable<IInvoiceWithDetails | null> {
    return this.getInvoiceById(invoiceId).pipe(
      switchMap(invoice => {
        if (!invoice) return of(null);

        // Subquery 1: Customer Details
        const customerSql = `
          SELECT c.* 
          FROM customers c
          JOIN orders o ON o.customer_id = c.id
          WHERE o.id = ?;
        `;

        // Subquery 2: Order Detail
        const orderSql = `SELECT * FROM orders WHERE id = ?;`;

        // Subquery 3: Order Items
        const itemsSql = `SELECT * FROM order_items WHERE order_id = ?;`;

        // Subquery 4: Company Settings
        return forkJoin({
          customer: from(this.dbConnection.query(customerSql, [invoice.order_id])).pipe(
            map(res => (res.values && res.values.length > 0 ? (res.values[0] as ICustomer) : null))
          ),
          order: from(this.dbConnection.query(orderSql, [invoice.order_id])).pipe(
            map(res => (res.values && res.values.length > 0 ? (res.values[0] as IOrder) : null))
          ),
          items: from(this.dbConnection.query(itemsSql, [invoice.order_id])).pipe(
            map(res => (res.values ? (res.values as IOrderItem[]) : []))
          ),
          company: this.getCompanySettings()
        }).pipe(
          map(details => {
            if (!details.customer || !details.order) return null;
            return {
              invoice,
              customer: details.customer,
              order: details.order,
              items: details.items,
              company: details.company
            } as IInvoiceWithDetails;
          })
        );
      })
    );
  }

  /**
   * Retrieve active GST/Billing company settings profile.
   * If empty, automatically returns a pre-populated fallback for uninterrupted operations.
   */
  public getCompanySettings(): Observable<ICompanySettings> {
    const sql = `SELECT * FROM company_settings LIMIT 1;`;
    return from(this.dbConnection.query(sql)).pipe(
      switchMap(res => {
        if (res.values && res.values.length > 0) {
          return of(res.values[0] as ICompanySettings);
        }

        // Fallback: Default Seed Company Settings
        const defaultSettings: ICompanySettings = {
          id: 'sg-company-main',
          company_name: 'SG Engineering Works',
          address: 'Plot No. 42, Industrial Area, Sector 5, Gandhinagar, Gujarat - 382016',
          mobile: '9876543210',
          alternate_mobile: '9123456789',
          email: 'info@sgengineeringworks.com',
          gstin: '24AAAAA0000A1Z5',
          logo_image_path: null,
          logo_image_name: null,
          logo_image_size: 0,
          signature_image_path: null,
          signature_image_name: null,
          signature_image_size: 0,
          updated_at: new Date().toISOString()
        };

        // Auto-seed into local persistent DB
        const insertSql = `
          INSERT INTO company_settings (
            id, company_name, address, mobile, alternate_mobile, email, gstin, logo_image_path, logo_image_name, logo_image_size, signature_image_path, signature_image_name, signature_image_size, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
        const params = [
          defaultSettings.id,
          defaultSettings.company_name,
          defaultSettings.address,
          defaultSettings.mobile,
          defaultSettings.alternate_mobile,
          defaultSettings.email,
          defaultSettings.gstin,
          defaultSettings.logo_image_path,
          defaultSettings.logo_image_name,
          defaultSettings.logo_image_size,
          defaultSettings.signature_image_path,
          defaultSettings.signature_image_name,
          defaultSettings.signature_image_size,
          defaultSettings.updated_at
        ];

        return from(this.dbConnection.run(insertSql, params)).pipe(
          map(() => defaultSettings)
        );
      })
    );
  }

  /**
   * Save or override active configurations
   */
  public saveCompanySettings(settings: ICompanySettings): Observable<void> {
    const updateSql = `
      UPDATE company_settings
      SET company_name = ?, address = ?, mobile = ?, alternate_mobile = ?, email = ?, gstin = ?, updated_at = ?
      WHERE id = ?;
    `;
    const params = [
      settings.company_name,
      settings.address,
      settings.mobile,
      settings.alternate_mobile || null,
      settings.email || null,
      settings.gstin || null,
      new Date().toISOString(),
      settings.id
    ];

    return from(this.dbConnection.run(updateSql, params)).pipe(map(() => void 0));
  }

  /**
   * List all orders in the system with their items status and current invoice counters
   */
  public getInvoicingOrdersList(queryString?: string): Observable<any[]> {
    let sql = `
      SELECT o.id, o.order_number, o.order_date, o.status, c.name as customer_name, c.id as customer_id, c.mobile as customer_mobile, c.address as customer_address, c.gst_number as customer_gst,
        (SELECT COALESCE(SUM(oi.quantity * oi.final_cost), 0.0) FROM order_items oi WHERE oi.order_id = o.id) as total_amount,
        (SELECT COALESCE(SUM(p.payment_amount), 0.0) FROM payments p WHERE p.order_id = o.id) as paid_amount,
        (SELECT COUNT(i.id) FROM invoices i WHERE i.order_id = o.id) as invoice_count
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
    `;
    const params: any[] = [];
    if (queryString && queryString.trim() !== '') {
      sql += ` WHERE o.order_number LIKE ? OR c.name LIKE ?`;
      const term = `%${queryString}%`;
      params.push(term, term);
    }
    sql += ` ORDER BY o.order_date DESC;`;
    return from(this.dbConnection.query(sql, params)).pipe(
      map(res => (res.values ? res.values : []))
    );
  }
}
