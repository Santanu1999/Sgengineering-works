import { Injectable } from '@angular/core';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, switchMap, concatMap, toArray } from 'rxjs/operators';
import { IOrder, IOrderItem, IOrderWIP, IOrderCostSummary, OrderStatus, WIPStage } from '../models/order.interface';
import { ISQLiteConnection } from './customer.repository';

@Injectable({
  providedIn: 'root'
})
export class OrderRepository {
  private dbConnection!: ISQLiteConnection;

  constructor() {}

  /**
   * Sets/Initializes active connection
   */
  public setConnection(conn: ISQLiteConnection): void {
    this.dbConnection = conn;
  }

  /**
   * Create standard order header in database.
   */
  public createOrder(order: IOrder): Observable<void> {
    const sql = `
      INSERT INTO orders (
        id, customer_id, order_date, estimated_delivery_date, actual_delivery_date, status, notes, created_date, updated_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      order.id,
      order.customer_id,
      order.order_date,
      order.estimated_delivery_date,
      order.actual_delivery_date || null,
      order.status,
      order.notes || null,
      order.created_date,
      order.updated_date
    ];

    return from(this.dbConnection.run(sql, params)).pipe(map(() => void 0));
  }

  /**
   * Insert individual order line items.
   */
  public createOrderItem(item: IOrderItem): Observable<void> {
    const sql = `
      INSERT INTO order_items (
        id, order_id, item_name, quantity, unit_price, estimated_cost, final_cost, description, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      item.id,
      item.order_id,
      item.item_name,
      item.quantity,
      item.unit_price,
      item.estimated_cost,
      item.final_cost,
      item.description || null,
      item.remarks || null
    ];

    return from(this.dbConnection.run(sql, params)).pipe(map(() => void 0));
  }

  /**
   * Clear all existing line items for an order before re-inserting during updates.
   */
  public deleteOrderItems(orderId: string): Observable<void> {
    const sql = `DELETE FROM order_items WHERE order_id = ?;`;
    return from(this.dbConnection.run(sql, [orderId])).pipe(map(() => void 0));
  }

  /**
   * Update order parameters.
   */
  public updateOrder(order: IOrder): Observable<void> {
    const sql = `
      UPDATE orders 
      SET customer_id = ?, order_date = ?, estimated_delivery_date = ?, actual_delivery_date = ?, status = ?, notes = ?, updated_date = ?
      WHERE id = ?;
    `;
    const params = [
      order.customer_id,
      order.order_date,
      order.estimated_delivery_date,
      order.actual_delivery_date || null,
      order.status,
      order.notes || null,
      order.updated_date,
      order.id
    ];

    return from(this.dbConnection.run(sql, params)).pipe(map(() => void 0));
  }

  /**
   * Permanent dispatch elimination of an order (Deletes order, cascade deletes lines, cascades WIP).
   */
  public deleteOrder(id: string): Observable<void> {
    const sql = `DELETE FROM orders WHERE id = ?;`;
    return from(this.dbConnection.run(sql, [id])).pipe(map(() => void 0));
  }

  /**
   * Resolve specific order by its unique ID, joining customer name information.
   */
  public getOrderById(id: string): Observable<IOrder | null> {
    const sql = `
      SELECT o.*, c.name as customer_name, c.mobile as customer_mobile,
             (SELECT SUM(quantity * final_cost) FROM order_items WHERE order_id = o.id) as total_amount
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?;
    `;
    return from(this.dbConnection.query(sql, [id])).pipe(
      map(res => {
        if (res.values && res.values.length > 0) {
          return res.values[0] as IOrder;
        }
        return null;
      })
    );
  }

  /**
   * Collect all line items attached to an order.
   */
  public getOrderItems(orderId: string): Observable<IOrderItem[]> {
    const sql = `SELECT * FROM order_items WHERE order_id = ?;`;
    return from(this.dbConnection.query(sql, [orderId])).pipe(
      map(res => (res.values ? (res.values as IOrderItem[]) : []))
    );
  }

  /**
   * Retrieves the total count of daily orders to formulate next serialized sequential number (e.g., ORD-YYYY-005).
   */
  public getLatestOrderNumber(yearPrefix: string): Observable<string | null> {
    const sql = `
      SELECT order_number 
      FROM orders 
      WHERE order_number LIKE ? 
      ORDER BY order_number DESC 
      LIMIT 1;
    `;
    const term = `ORD-${yearPrefix}-%`;
    return from(this.dbConnection.query(sql, [term])).pipe(
      map(res => {
        if (res.values && res.values.length > 0) {
          return res.values[0].order_number as string;
        }
        return null;
      })
    );
  }

  /**
   * Highly custom search engine leveraging indexed properties.
   */
  public searchOrders(
    queryString: string,
    status?: OrderStatus,
    fromDate?: string,
    toDate?: string
  ): Observable<IOrder[]> {
    let sql = `
      SELECT o.*, c.name as customer_name, c.mobile as customer_mobile,
             (SELECT SUM(quantity * final_cost) FROM order_items WHERE order_id = o.id) as total_amount,
             (SELECT COUNT(id) FROM order_items WHERE order_id = o.id) as items_count
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (queryString && queryString.trim() !== '') {
      conditions.push(`(o.order_number LIKE ? OR c.name LIKE ? OR o.notes LIKE ?)`);
      const term = `%${queryString}%`;
      params.push(term, term, term);
    }

    if (status) {
      conditions.push(`o.status = ?`);
      params.push(status);
    }

    if (fromDate) {
      conditions.push(`o.order_date >= ?`);
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push(`o.order_date <= ?`);
      params.push(toDate);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY o.order_date DESC, o.order_number DESC;`;

    return from(this.dbConnection.query(sql, params)).pipe(
      map(res => (res.values ? (res.values as IOrder[]) : []))
    );
  }

  /**
   * Pull entire history logs of Manufacturing Work-In-Progress milestones.
   */
  public getWIPTimeline(orderId: string): Observable<IOrderWIP[]> {
    const sql = `
      SELECT * FROM order_wip 
      WHERE order_id = ? 
      ORDER BY start_date ASC, stage ASC;
    `;
    return from(this.dbConnection.query(sql, [orderId])).pipe(
      map(res => (res.values ? (res.values as IOrderWIP[]) : []))
    );
  }

  /**
   * Log an active manufacturing milestone to tracker.
   */
  public addWIPStage(wip: IOrderWIP): Observable<void> {
    const sql = `
      INSERT INTO order_wip (id, order_id, stage, start_date, completion_date, remarks)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const params = [
      wip.id,
      wip.order_id,
      wip.stage,
      wip.start_date,
      wip.completion_date || null,
      wip.remarks || null
    ];
    return from(this.dbConnection.run(sql, params)).pipe(map(() => void 0));
  }

  /**
   * Complete standard manufacturing stage pipeline log.
   */
  public updateWIPStageCompletion(
    orderId: string,
    stage: WIPStage,
    completionDate: string,
    remarks?: string
  ): Observable<void> {
    const sql = `
      UPDATE order_wip 
      SET completion_date = ?, remarks = ?
      WHERE order_id = ? AND stage = ?;
    `;
    const params = [completionDate, remarks || null, orderId, stage];
    return from(this.dbConnection.run(sql, params)).pipe(map(() => void 0));
  }
}
