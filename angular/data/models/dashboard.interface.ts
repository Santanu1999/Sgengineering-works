/**
 * Dashboard & Business Analytics Interfaces - SG Engineering Works Manager
 * Type safety configuration for KPIs, analytical charts, logistics warnings, and delivery schedules.
 */

export interface IKPIStats {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  outstandingAmount: number;
  lowStockCount: number;
}

export interface IMonthlyFinancialSeries {
  month: string;         // 'YYYY-MM' format for database grouping, or 'MMM YYYY' for presentation
  revenue: number;       // Gross taxable billing total
  salesCount: number;    // Count of invoices raised
  expenses: number;      // Total operations overhead expenses
  profit: number;        // Monthly calculated margin
}

export interface IDashboardLowStockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minimum_stock_level: number;
  supplier_name?: string;
  mobile?: string;
}

export interface IDashboardUpcomingDelivery {
  id: string;
  order_number: string;
  customer_name: string;
  company_name?: string;
  order_date: string;
  estimated_delivery_date: string;
  status: string;
  total_amount: number;
}

export interface IDashboardAggregatedData {
  stats: IKPIStats;
  monthlyTrends: IMonthlyFinancialSeries[];
  lowStockItems: IDashboardLowStockItem[];
  upcomingDeliveries: IDashboardUpcomingDelivery[];
}
