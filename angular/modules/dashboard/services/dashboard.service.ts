import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { DashboardRepository } from '../../../data/repositories/dashboard.repository';
import { 
  IKPIStats, 
  IMonthlyFinancialSeries, 
  IDashboardLowStockItem, 
  IDashboardUpcomingDelivery 
} from '../../../data/models/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // Writable Signals for state management
  private kpiStatsSignal: WritableSignal<IKPIStats | null> = signal<IKPIStats | null>(null);
  private monthlyTrendsSignal: WritableSignal<IMonthlyFinancialSeries[]> = signal<IMonthlyFinancialSeries[]>([]);
  private lowStockItemsSignal: WritableSignal<IDashboardLowStockItem[]> = signal<IDashboardLowStockItem[]>([]);
  private upcomingDeliveriesSignal: WritableSignal<IDashboardUpcomingDelivery[]> = signal<IDashboardUpcomingDelivery[]>([]);
  private isProcessingSignal: WritableSignal<boolean> = signal<boolean>(false);

  // Read-only pipelines for UI components
  public kpiStats = computed(() => this.kpiStatsSignal());
  public monthlyTrends = computed(() => this.monthlyTrendsSignal());
  public lowStockItems = computed(() => this.lowStockItemsSignal());
  public upcomingDeliveries = computed(() => this.upcomingDeliveriesSignal());
  public isProcessing = computed(() => this.isProcessingSignal());

  // Aggregate signals for fast access
  public lastUpdated = signal<string>(new Date().toISOString());

  constructor(private dashboardRepo: DashboardRepository) {}

  /**
   * Initialize and load all dashboard data programmatically
   */
  public loadDashboardData(): Observable<any> {
    this.isProcessingSignal.set(true);

    return forkJoin({
      stats: this.dashboardRepo.getKPIStats(),
      trends: this.dashboardRepo.getMonthlyFinancialTrends(),
      lowStock: this.dashboardRepo.getLowStockItems(),
      deliveries: this.dashboardRepo.getUpcomingDeliveries()
    }).pipe(
      tap({
        next: (data) => {
          this.kpiStatsSignal.set(data.stats);
          this.monthlyTrendsSignal.set(data.trends);
          this.lowStockItemsSignal.set(data.lowStock);
          this.upcomingDeliveriesSignal.set(data.deliveries);
          this.lastUpdated.set(new Date().toISOString());
        },
        error: (err) => {
          console.error('Error loading dashboard analytics:', err);
        }
      }),
      finalize(() => {
        this.isProcessingSignal.set(false);
      }),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  /**
   * Refresh specific segments if needed
   */
  public refreshKPIs(): Observable<IKPIStats> {
    return this.dashboardRepo.getKPIStats().pipe(
      tap(stats => this.kpiStatsSignal.set(stats))
    );
  }

  public refreshLowStock(): Observable<IDashboardLowStockItem[]> {
    return this.dashboardRepo.getLowStockItems().pipe(
      tap(items => this.lowStockItemsSignal.set(items))
    );
  }

  public refreshUpcomingDeliveries(): Observable<IDashboardUpcomingDelivery[]> {
    return this.dashboardRepo.getUpcomingDeliveries().pipe(
      tap(deliveries => this.upcomingDeliveriesSignal.set(deliveries))
    );
  }
}
