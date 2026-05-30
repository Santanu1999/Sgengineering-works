import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { DashboardChartsComponent } from './dashboard-charts/dashboard-charts.component';
import { IDashboardLowStockItem, IDashboardUpcomingDelivery } from '../../../../data/models/dashboard.interface';

@Component({
  selector: 'app-dashboard-main',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardChartsComponent],
  template: `
    <div class="dashboard-viewport bg-[#0b0f19] text-slate-100 min-h-screen font-sans flex flex-col justify-between">
      
      <!-- Sticky Navigation Header -->
      <header class="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur border-b border-slate-800 py-4 px-6 shadow-md shadow-slate-950/25">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          
          <div class="flex items-center gap-3">
            <span class="text-2xl animate-spin-slow">📊</span>
            <div>
              <h1 class="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>SG Works Global Cockpit</span>
                <span class="text-[9px] font-mono font-normal uppercase bg-cyan-950/40 border border-cyan-800/80 px-2 py-0.5 rounded text-cyan-400">Database Engine Sync</span>
              </h1>
              <p class="text-[10px] text-slate-400 font-mono">Module :: Live Business Health, KPIs & Manufacturing Analytics</p>
            </div>
          </div>

          <!-- Action & Chronos Info -->
          <div class="flex items-center gap-4">
            <button
              (click)="triggerRefresh()"
              [disabled]="isProcessing()"
              class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5"
            >
              <span [class.animate-spin]="isProcessing()">🔄</span>
              <span>Refresh Metrics</span>
            </button>
            <div class="hidden sm:flex flex-col text-right font-mono text-[9px] text-slate-500">
              <span class="tracking-wider text-[8px] uppercase">LEGER CLOCK</span>
              <span class="text-slate-400">May 30, 2026 - 12:56 UTC</span>
            </div>
          </div>

        </div>
      </header>

      <!-- Main Dashboard Canvas -->
      <main class="py-6 px-4 sm:px-6 flex-1 space-y-6">
        <div class="max-w-7xl mx-auto space-y-6">
          
          <!-- Processing State Banner -->
          <div *ngIf="isProcessing()" class="p-3.5 bg-cyan-950/20 border border-cyan-900/60 rounded-xl flex items-center gap-2.5 max-w-sm mx-auto shadow-lg shadow-cyan-500/5 animate-pulse">
            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span class="text-[11px] font-mono text-cyan-300">Recalculating double-entry ledger formulas...</span>
          </div>

          <!-- Section 1: Financial & Legal Gross Metrics -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <!-- Revenue KPI Card -->
            <div class="p-5 bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-xl space-y-3 relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
              <div class="absolute top-0 right-0 p-3 text-4xl text-slate-900 opacity-20 pointer-events-none select-none font-bold">₹</div>
              <div class="text-[10px] uppercase tracking-wider text-slate-550 font-mono font-bold flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>Gross Revenue Raised</span>
              </div>
              <div class="text-2xl font-black text-cyan-400 tracking-tight font-sans">
                ₹{{ (stats()?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
              </div>
              <p class="text-[9px] text-slate-400 font-mono">
                Total valuation of tax invoices in ledger.
              </p>
            </div>

            <!-- Expenses KPI Card -->
            <div class="p-5 bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-xl space-y-3 relative overflow-hidden group hover:border-rose-500/30 transition-all duration-300">
              <div class="absolute top-0 right-0 p-3 text-4xl text-slate-900 opacity-20 pointer-events-none select-none font-bold">💸</div>
              <div class="text-[10px] uppercase tracking-wider text-slate-550 font-mono font-bold flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                <span>Operating Expenses</span>
              </div>
              <div class="text-2xl font-black text-rose-400 tracking-tight font-sans">
                ₹{{ (stats()?.totalExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
              </div>
              <p class="text-[9px] text-slate-400 font-mono">
                Consolidated raw material & overhead costs.
              </p>
            </div>

            <!-- Profit KPI Card -->
            <div class="p-5 bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-xl space-y-3 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
              <div class="absolute top-0 right-0 p-3 text-4xl text-slate-900 opacity-20 pointer-events-none select-none font-bold">📈</div>
              <div class="text-[10px] uppercase tracking-wider text-slate-550 font-mono font-bold flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Consolidated Net Profit</span>
              </div>
              <div class="text-2xl font-black text-emerald-400 tracking-tight font-sans">
                ₹{{ (stats()?.totalProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
              </div>
              <p class="text-[9px] text-slate-400 font-mono">
                Net margins, representing operational surplus.
              </p>
            </div>

            <!-- Outstanding Balance KPI Card -->
            <div class="p-5 bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-xl space-y-3 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
              <div class="absolute top-0 right-0 p-3 text-4xl text-slate-900 opacity-20 pointer-events-none select-none font-bold">⏳</div>
              <div class="text-[10px] uppercase tracking-wider text-slate-550 font-mono font-bold flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Accounts Receivables (Dues)</span>
              </div>
              <div class="text-2xl font-black text-amber-400 tracking-tight font-sans">
                ₹{{ (stats()?.outstandingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
              </div>
              <p class="text-[9px] text-slate-400 font-mono">
                Active customer balance dues on ledgers.
              </p>
            </div>

          </div>

          <!-- Section 2: Core Operating Metrics Grid Row -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <!-- Metric Card: Total Customers -->
            <div class="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Enterprise Partners</div>
                <div class="text-xl font-bold text-slate-200 tracking-tight">{{ stats()?.totalCustomers || 0 }} Accounts</div>
                <div class="text-[9px] text-slate-500 font-sans">Registered fabricators, suppliers & clients</div>
              </div>
              <span class="text-2xl p-2 bg-slate-900 rounded-xl border border-slate-800">👥</span>
            </div>

            <!-- Metric Card: Total Active Orders -->
            <div class="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Billed & Active Projects</div>
                <div class="text-xl font-bold text-slate-200 tracking-tight">{{ stats()?.totalOrders || 0 }} Fabrication Orders</div>
                <div class="text-[9px] text-slate-500 font-sans">Excluding cancelled/purged records in DB</div>
              </div>
              <span class="text-2xl p-2 bg-slate-900 rounded-xl border border-slate-800">🏭</span>
            </div>

            <!-- Metric Card: Material Shortage warnings -->
            <div class="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between group" [class.border-rose-900/50]="(stats()?.lowStockCount || 0) > 0" [class.bg-rose-950/10]="(stats()?.lowStockCount || 0) > 0">
              <div class="space-y-1">
                <div class="text-[10px] uppercase tracking-wider font-mono" [class.text-rose-400]="(stats()?.lowStockCount || 0) > 0" [class.text-slate-500]="(stats()?.lowStockCount || 0) === 0">Stores Inventory warnings</div>
                <div class="text-xl font-bold tracking-tight" [class.text-rose-400]="(stats()?.lowStockCount || 0) > 0" [class.text-slate-200]="(stats()?.lowStockCount || 0) === 0">
                  {{ stats()?.lowStockCount || 0 }} Materials Low Stock
                </div>
                <div class="text-[9px] text-slate-500 font-sans">Falling below min reserve thresholds</div>
              </div>
              <span class="text-2xl p-2 bg-slate-900 rounded-xl border border-slate-800 group-hover:scale-110 transition-transform cursor-default" [class.border-rose-800]="(stats()?.lowStockCount || 0) > 0">
                ⚠️
              </span>
            </div>

          </div>

          <!-- Section 3: Dynamic Visual Charts -->
          <app-dashboard-charts [trends]="monthlyTrends()"></app-dashboard-charts>

          <!-- Section 4: Operational Schedules Bento Row (Deliveries & Stock alerts) -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <!-- Left panel (8 columns): Upcoming Dispatch Schedules -->
            <div class="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 class="text-sm font-bold text-slate-100 font-serif tracking-tight flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
                    <span>Upcoming Deliveries & Project Schedules</span>
                  </h3>
                  <p class="text-[11px] text-slate-400 mt-1">Active client fabrication projects closest to target delivery dates.</p>
                </div>
                <span class="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-950 px-2.5 py-1 rounded-lg">Top 10 Schedules</span>
              </div>

              <!-- Deliveries Listing Grid -->
              <div class="overflow-x-auto relative">
                <table class="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-800 text-[9px] font-mono uppercase tracking-wider text-slate-500 h-8">
                      <th class="py-2 px-1">Order No</th>
                      <th class="py-2">Customer Account</th>
                      <th class="py-2">Release Date</th>
                      <th class="py-2 text-right">Jobwork Price</th>
                      <th class="py-2 text-center">WIP Stage</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/40 text-slate-300 font-medium font-sans">
                    <tr *ngFor="let ord of upcomingDeliveries()" class="hover:bg-slate-950/20 transition-all duration-150">
                      <td class="py-3 px-1 font-mono text-cyan-400 font-bold select-all">{{ ord.order_number }}</td>
                      <td class="py-3 text-slate-200">
                        <div class="font-semibold">{{ ord.customer_name }}</div>
                        <div class="text-[9px] text-slate-500 font-mono" *ngIf="ord.company_name">{{ ord.company_name }}</div>
                      </td>
                      <td class="py-3 font-mono text-slate-400 text-[11px]">
                        {{ formatDate(ord.estimated_delivery_date) }}
                      </td>
                      <td class="py-3 text-right font-mono text-slate-200">
                        ₹{{ ord.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                      </td>
                      <td class="py-3 text-center">
                        <span
                          class="px-2 py-0.5 rounded text-[9px] font-mono leading-none border uppercase font-bold"
                          [ngClass]="getWIPStageStyle(ord.status)"
                        >
                          {{ ord.status }}
                        </span>
                      </td>
                    </tr>

                    <tr *ngIf="upcomingDeliveries().length === 0">
                      <td colspan="5" class="py-12 text-center text-slate-600 font-mono text-xs">
                        All engineering fabrication projects have been successfully delivered and invoiced!
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Right panel (5 columns): Critical Stock levels -->
            <div class="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 class="text-sm font-bold text-slate-100 font-serif tracking-tight flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                    <span>Materials Inventory Stockout Protection</span>
                  </h3>
                  <p class="text-[11px] text-slate-400 mt-1">Materials below buffer alerts needing reorder.</p>
                </div>
                <span class="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded-lg">Out of stock</span>
              </div>

              <!-- Stock list tracker -->
              <div class="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                <div
                  *ngFor="let item of lowStockItems()"
                  class="p-3 bg-slate-950/40 border border-slate-800/80 hover:border-slate-800 rounded-xl flex items-center justify-between gap-4 transition duration-150"
                >
                  <div class="space-y-1 min-w-0">
                    <h4 class="text-xs font-semibold text-slate-200 truncate font-sans">{{ item.name }}</h4>
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px]">
                      <span class="text-slate-500">Min Reserve:</span>
                      <span class="text-slate-400">{{ item.minimum_stock_level }} {{ item.unit }}s</span>
                      <span class="text-slate-600">|</span>
                      <span class="text-slate-500">Supply Partner:</span>
                      <span class="text-cyan-400 hover:underline select-all truncate max-w-[120px]">{{ item.supplier_name || 'Direct Store' }}</span>
                    </div>
                  </div>

                  <div class="text-right shrink-0">
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded border leading-none font-bold inline-block"
                      [ngClass]="item.quantity === 0 ? 'bg-rose-950/40 border-rose-850 text-rose-450' : 'bg-red-950/20 border-red-900/60 text-red-400'">
                      {{ item.quantity }} {{ item.unit }}s
                    </span>
                    <p class="text-[9px] font-mono text-rose-500/80 mt-1 italic font-bold">
                      -{{ mathRound(100 - (item.quantity / item.minimum_stock_level * 100)) }}% deficit
                    </p>
                  </div>
                </div>

                <div *ngIf="lowStockItems().length === 0" class="py-12 text-center text-slate-600 space-y-2">
                  <span>🟢</span>
                  <p class="text-xs font-mono">Inventory structures are operating within healthy buffer margins.</p>
                </div>
              </div>

              <div *ngIf="lowStockItems().length > 0" class="bg-amber-950/10 border border-amber-900/40 p-3 rounded-xl text-[10px] text-amber-300 font-mono leading-relaxed flex items-start gap-2">
                <span>⚠️</span>
                <span>
                  <strong>AUTOMATIC RESTOCK:</strong> Contact the custom vendor coordinates registered above to coordinate direct hardware delivery. Deficits require direct PO execution.
                </span>
              </div>
            </div>

          </div>

        </div>
      </main>

      <!-- Fixed Footer -->
      <footer class="border-t border-slate-950 bg-slate-950/20 py-4 text-center text-[10px] text-slate-600 font-mono shrink-0">
        SG Engineering Works Cockpit &copy; 2026. Live dynamic Double Entry Metrics Synced in WAL mode.
      </footer>
    </div>
  `
})
export class DashboardMainComponent implements OnInit {
  // Service-exposed computing properties
  stats = computed(() => this.dashboardService.kpiStats());
  monthlyTrends = computed(() => this.dashboardService.monthlyTrends());
  lowStockItems = computed(() => this.dashboardService.lowStockItems());
  upcomingDeliveries = computed(() => this.dashboardService.upcomingDeliveries());
  isProcessing = computed(() => this.dashboardService.isProcessing());

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.triggerRefresh();
  }

  triggerRefresh(): void {
    this.dashboardService.loadDashboardData().subscribe({
      next: () => console.log('Dashboard analytics re-compiled successfully.'),
      error: (err) => console.error('Failing to execute cockpit hydration:', err)
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  mathRound(val: number): number {
    return Math.round(val);
  }

  getWIPStageStyle(status: string): string {
    switch (status) {
      case 'Received':
        return 'bg-blue-950/40 border-blue-800 text-blue-400';
      case 'Material Procurement':
        return 'bg-violet-950/40 border-violet-800 text-violet-400';
      case 'Cutting':
      case 'Welding':
      case 'Assembly':
        return 'bg-indigo-950/40 border-indigo-800 text-indigo-400';
      case 'Painting':
      case 'Testing':
        return 'bg-amber-950/40 border-amber-800 text-amber-400';
      case 'Ready':
        return 'bg-emerald-950/40 border-emerald-800 text-emerald-400';
      case 'Delivered':
        return 'bg-slate-800 border-slate-700 text-slate-300';
      default:
        return 'bg-slate-950/40 border-slate-800 text-slate-400';
    }
  }
}
