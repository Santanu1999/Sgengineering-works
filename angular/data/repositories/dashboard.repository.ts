import { Injectable } from '@angular/core';
import { Observable, from, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ISQLiteConnection } from './customer.repository';
import { 
  IKPIStats, 
  IMonthlyFinancialSeries, 
  IDashboardLowStockItem, 
  IDashboardUpcomingDelivery 
} from '../models/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardRepository {
  private dbConnection!: ISQLiteConnection;

  constructor() {}

  /**
   * Inject global database connection singleton
   */
  public setConnection(conn: ISQLiteConnection): void {
    this.dbConnection = conn;
  }

  /**
   * Helper guard checking if the SQLite database is available
   */
  private isConnectionReady(): boolean {
    return !!this.dbConnection;
  }

  /**
   * Fetch core aggregated KPI indicators
   */
  public getKPIStats(): Observable<IKPIStats> {
    if (!this.isConnectionReady()) {
      return of({
        totalCustomers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        totalProfit: 0,
        outstandingAmount: 0,
        lowStockCount: 0
      });
    }

    const qCustomers = `SELECT COUNT(*) as count FROM customers;`;
    const qOrders = `SELECT COUNT(*) as count FROM orders WHERE status != 'Cancelled';`;
    const qRevenue = `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices;`;
    const qExpenses = `SELECT COALESCE(SUM(amount), 0) as total FROM expenses;`;
    const qProfit = `SELECT COALESCE(SUM(profit), 0) as total FROM order_cost_summary;`;
    const qOutstanding = `SELECT COALESCE(SUM(outstanding_balance), 0) as total FROM customers;`;
    const qLowStock = `SELECT COUNT(*) as count FROM raw_materials WHERE quantity < minimum_stock_level;`;

    return forkJoin({
      customersRes: from(this.dbConnection.query(qCustomers)),
      ordersRes: from(this.dbConnection.query(qOrders)),
      revenueRes: from(this.dbConnection.query(qRevenue)),
      expensesRes: from(this.dbConnection.query(qExpenses)),
      profitRes: from(this.dbConnection.query(qProfit)),
      outstandingRes: from(this.dbConnection.query(qOutstanding)),
      lowStockRes: from(this.dbConnection.query(qLowStock))
    }).pipe(
      map(({ customersRes, ordersRes, revenueRes, expensesRes, profitRes, outstandingRes, lowStockRes }) => {
        const totalCustomers = customersRes.values?.[0]?.count || 0;
        const totalOrders = ordersRes.values?.[0]?.count || 0;
        const totalRevenue = revenueRes.values?.[0]?.total || 0;
        const totalExpenses = expensesRes.values?.[0]?.total || 0;
        
        // If order_cost_summary is empty/zero, we can fallback to (Revenue - Expenses) to keep it responsive
        let totalProfit = profitRes.values?.[0]?.total || 0;
        if (totalProfit === 0 && totalRevenue > 0) {
          totalProfit = Math.max(0, totalRevenue - totalExpenses);
        }

        const outstandingAmount = outstandingRes.values?.[0]?.total || 0;
        const lowStockCount = lowStockRes.values?.[0]?.count || 0;

        return {
          totalCustomers,
          totalOrders,
          totalRevenue,
          totalExpenses,
          totalProfit,
          outstandingAmount,
          lowStockCount
        };
      })
    );
  }

  /**
   * Fetch list of items falling below materials threshold, sorted by severity
   */
  public getLowStockItems(): Observable<IDashboardLowStockItem[]> {
    if (!this.isConnectionReady()) {
      return of([]);
    }

    const sql = `
      SELECT 
        r.id, 
        r.name, 
        r.quantity, 
        r.unit, 
        r.minimum_stock_level,
        s.supplier_name as supplier_name,
        s.mobile as mobile
      FROM raw_materials r
      LEFT JOIN suppliers s ON r.supplier_id = s.id
      WHERE r.quantity < r.minimum_stock_level
      ORDER BY (r.quantity / r.minimum_stock_level) ASC, r.name COLLATE NOCASE ASC
      LIMIT 10;
    `;

    return from(this.dbConnection.query(sql)).pipe(
      map(res => (res.values ? (res.values as IDashboardLowStockItem[]) : []))
    );
  }

  /**
   * Fetch active orders closest to estimated dispatch delivery date
   */
  public getUpcomingDeliveries(): Observable<IDashboardUpcomingDelivery[]> {
    if (!this.isConnectionReady()) {
      return of([]);
    }

    const sql = `
      SELECT 
        o.id, 
        o.order_number, 
        c.name as customer_name,
        o.order_date,
        o.estimated_delivery_date, 
        o.status,
        COALESCE(
          (SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = o.id),
          0.0
        ) as total_amount
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.status NOT IN ('Delivered', 'Cancelled')
      ORDER BY o.estimated_delivery_date ASC
      LIMIT 10;
    `;

    return from(this.dbConnection.query(sql)).pipe(
      map(res => (res.values ? (res.values as IDashboardUpcomingDelivery[]) : []))
    );
  }

  /**
   * Collate revenue, expense, and transaction count arrays mapped by chronological billing months
   */
  public getMonthlyFinancialTrends(): Observable<IMonthlyFinancialSeries[]> {
    if (!this.isConnectionReady()) {
      return of([]);
    }

    // Pull 12 months billing activities
    const sqlRevenue = `
      SELECT 
        strftime('%Y-%m', invoice_date) as financial_month,
        COALESCE(SUM(total_amount), 0.0) as revenue,
        COUNT(id) as sales_count
      FROM invoices
      GROUP BY financial_month
      ORDER BY financial_month ASC
      LIMIT 12;
    `;

    // Pull 12 months operating expenses
    const sqlExpenses = `
      SELECT 
        strftime('%Y-%m', expense_date) as financial_month,
        COALESCE(SUM(amount), 0.0) as expenses
      FROM expenses
      GROUP BY financial_month
      ORDER BY financial_month ASC
      LIMIT 12;
    `;

    return forkJoin({
      revRes: from(this.dbConnection.query(sqlRevenue)),
      expRes: from(this.dbConnection.query(sqlExpenses))
    }).pipe(
      map(({ revRes, expRes }) => {
        const revRows = revRes.values || [];
        const expRows = expRes.values || [];

        // Mesh matching month keys in TypeScript
        const monthMap = new Map<string, IMonthlyFinancialSeries>();

        // Populate revenue nodes
        revRows.forEach(row => {
          const m = row.financial_month;
          monthMap.set(m, {
            month: m,
            revenue: row.revenue,
            salesCount: row.sales_count,
            expenses: 0,
            profit: row.revenue
          });
        });

        // Overlay expenses
        expRows.forEach(row => {
          const m = row.financial_month;
          if (monthMap.has(m)) {
            const existing = monthMap.get(m)!;
            existing.expenses = row.expenses;
            existing.profit = Math.max(0, existing.revenue - row.expenses);
          } else {
            monthMap.set(m, {
              month: m,
              revenue: 0,
              salesCount: 0,
              expenses: row.expenses,
              profit: -row.expenses
            });
          }
        });

        // Convert Map to chronologically sorted Array
        const sortedArray = Array.from(monthMap.values()).sort((a, b) => 
          a.month.localeCompare(b.month)
        );

        // Format dates into human-readable months (e.g., '2026-05' to 'May 2026')
        return sortedArray.map(node => {
          const [year, month] = node.month.split('-');
          const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
          const formattedLabel = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          });
          return {
            ...node,
            month: formattedLabel
          };
        });
      })
    );
  }
}
