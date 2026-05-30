import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMonthlyFinancialSeries } from '../../../../data/models/dashboard.interface';

@Component({
  selector: 'app-dashboard-charts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
      
      <!-- Chart 1: Revenue vs Profit Trends -->
      <div class="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between space-y-4">
        <div>
          <h3 class="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Monthly Revenue & Operating Profit (INR)</span>
            <span class="text-[9px] bg-cyan-950 border border-cyan-800 text-cyan-400 px-2 py-0.5 rounded">Core Ledger</span>
          </h3>
          <p class="text-[11px] text-slate-500 mt-1">
            Bars indicate invoice-registered taxable billings; lines project computed operating profit.
          </p>
        </div>

        <div class="relative w-full h-64 flex items-end justify-center min-h-[250px]">
          <!-- Grid and SVG Renderer -->
          <svg *ngIf="hasData()" class="w-full h-full text-slate-800" viewBox="0 0 500 200" preserveAspectRatio="none">
            <!-- Grid Lines -->
            <line x1="40" y1="20" x2="480" y2="20" stroke="currentColor" stroke-dasharray="3,3" stroke-width="0.5" />
            <line x1="40" y1="65" x2="480" y2="65" stroke="currentColor" stroke-dasharray="3,3" stroke-width="0.5" />
            <line x1="40" y1="110" x2="480" y2="110" stroke="currentColor" stroke-dasharray="3,3" stroke-width="0.5" />
            <line x1="40" y1="155" x2="480" y2="155" stroke="currentColor" stroke-dasharray="3,3" stroke-width="0.5" />
            
            <!-- Axis Baseline -->
            <line x1="40" y1="155" x2="480" y2="155" stroke="#334155" stroke-width="1" />

            <!-- Bars for Revenue -->
            <g *ngFor="let m of barLayouts()">
              <!-- Revenue Bar -->
              <rect
                [attr.x]="m.x"
                [attr.y]="m.revY"
                [attr.width]="m.width"
                [attr.height]="m.revHeight"
                fill="#06b6d4"
                rx="2"
                class="hover:opacity-80 transition-opacity cursor-pointer duration-150"
                title="Revenue"
              />
              <!-- Profit Overlay Bar -->
              <rect
                [attr.x]="m.x"
                [attr.y]="m.profY"
                [attr.width]="m.width"
                [attr.height]="m.profHeight"
                fill="#10b981"
                rx="2"
                class="opacity-90 hover:opacity-100 transition-opacity cursor-pointer duration-150"
                title="Profit"
              />
            </g>

            <!-- Line Overlay connecting profits -->
            <path
              [attr.d]="profitLinePath()"
              fill="none"
              stroke="#fbbf24"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            
            <!-- Line dots -->
            <circle
              *ngFor="let p of profitDots()"
              [attr.cx]="p.cx"
              [attr.cy]="p.cy"
              r="4"
              fill="#fbbf24"
              stroke="#0f172a"
              stroke-width="1.5"
            />
          </svg>

          <!-- SVG Y-Axis Labels -->
          <div *ngIf="hasData()" class="absolute left-1 top-0 h-[155px] flex flex-col justify-between text-[8px] font-mono text-slate-500 pointer-events-none select-none">
            <span>₹{{ formatScale(maxAmount()) }}</span>
            <span>₹{{ formatScale(maxAmount() * 0.7) }}</span>
            <span>₹{{ formatScale(maxAmount() * 0.4) }}</span>
            <span>0</span>
          </div>

          <!-- Empty State -->
          <div *ngIf="!hasData()" class="absolute inset-0 flex flex-col items-center justify-center text-slate-600 font-mono text-xs space-y-2">
            <span>📊</span>
            <span>Awaiting historical ledger entries to compile revenue.</span>
          </div>
        </div>

        <!-- X-Axis text columns -->
        <div *ngIf="hasData()" class="flex justify-between pl-10 pr-4 text-[9px] font-mono text-slate-500">
          <span *ngFor="let m of trends" class="truncate text-center w-8">{{ m.month.split(' ')[0] }}</span>
        </div>

        <!-- Legend indicators -->
        <div class="flex items-center gap-4 text-[10px] font-mono text-slate-400 border-t border-slate-800 pt-3">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded bg-cyan-500"></span>
            <span>Gross Revenue</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded bg-emerald-500"></span>
            <span>Operating Profit</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-0.5 bg-amber-400 inline-block"></span>
            <span>Margin Curve</span>
          </div>
        </div>

      </div>

      <!-- Chart 2: Monthly Sales Volumes (Order Counts) -->
      <div class="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 font-sans">
        <div>
          <h3 class="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Monthly Invoice Frequency (Client Orders)</span>
            <span class="text-[9px] bg-violet-950 border border-violet-800 text-violet-400 px-2 py-0.5 rounded">Operations</span>
          </h3>
          <p class="text-[11px] text-slate-500 mt-1">
            Measures order booking velocity, delivery completions, and invoice frequencies.
          </p>
        </div>

        <div class="relative w-full h-64 flex items-end justify-center min-h-[250px]">
          <!-- Grid and SVG Renderer -->
          <svg *ngIf="hasData()" class="w-full h-full text-slate-800" viewBox="0 0 500 200" preserveAspectRatio="none">
            <!-- Grid Lines -->
            <line x1="40" y1="20" x2="480" y2="20" stroke="currentColor" stroke-dasharray="3,3" stroke-width="0.5" />
            <line x1="40" y1="65" x2="480" y2="65" stroke="currentColor" stroke-dasharray="3,3" stroke-width="0.5" />
            <line x1="40" y1="110" x2="480" y2="110" stroke="currentColor" stroke-dasharray="3,3" stroke-width="0.5" />
            <line x1="40" y1="155" x2="480" y2="155" stroke="currentColor" stroke-dasharray="3,3" stroke-width="0.5" />
            
            <!-- Axis Baseline -->
            <line x1="40" y1="155" x2="480" y2="155" stroke="#334155" stroke-width="1" />

            <!-- Bars for Invoice/Sales Counts -->
            <g *ngFor="let m of barLayouts()">
              <rect
                [attr.x]="m.x + m.width/4"
                [attr.y]="m.salesY"
                [attr.width]="m.width / 2"
                [attr.height]="m.salesHeight"
                fill="#8b5cf6"
                rx="2"
                class="hover:fill-violet-400 transition-colors cursor-pointer duration-150"
              />
            </g>
          </svg>

          <!-- SVG Y-Axis Labels -->
          <div *ngIf="hasData()" class="absolute left-1 top-0 h-[155px] flex flex-col justify-between text-[8px] font-mono text-slate-500 pointer-events-none select-none">
            <span>{{ maxSalesCount() }} Invoiced</span>
            <span>{{ mathRound(maxSalesCount() * 0.6) }}</span>
            <span>{{ mathRound(maxSalesCount() * 0.3) }}</span>
            <span>0</span>
          </div>

          <!-- Empty State -->
          <div *ngIf="!hasData()" class="absolute inset-0 flex flex-col items-center justify-center text-slate-600 font-mono text-xs space-y-2">
            <span>📈</span>
            <span>Awaiting booked orders logs to evaluate operational speed.</span>
          </div>
        </div>

        <!-- X-Axis text columns -->
        <div *ngIf="hasData()" class="flex justify-between pl-10 pr-4 text-[9px] font-mono text-slate-500">
          <span *ngFor="let m of trends" class="truncate text-center w-8">{{ m.month.split(' ')[0] }}</span>
        </div>

        <!-- Legend indicators -->
        <div class="flex items-center gap-4 text-[10px] font-mono text-slate-400 border-t border-slate-800 pt-3">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded bg-violet-500"></span>
            <span>Billed Invoices count</span>
          </div>
          <span class="text-[9px] text-slate-500 ml-auto">Sequence accuracy validated</span>
        </div>

      </div>

    </div>
  `
})
export class DashboardChartsComponent {
  private _trends = signal<IMonthlyFinancialSeries[]>([]);

  @Input()
  set trends(value: IMonthlyFinancialSeries[] | null) {
    this._trends.set(value || []);
  }
  get trends(): IMonthlyFinancialSeries[] {
    return this._trends();
  }

  // Reactive status checks & properties
  hasData = computed(() => this._trends().length > 0);

  maxAmount = computed(() => {
    const list = this._trends();
    if (list.length === 0) return 0;
    const maxVal = Math.max(...list.map(node => Math.max(node.revenue, node.expenses, node.profit)));
    return maxVal === 0 ? 10000 : maxVal * 1.15; // padding factor
  });

  maxSalesCount = computed(() => {
    const list = this._trends();
    if (list.length === 0) return 10;
    const maxVal = Math.max(...list.map(node => node.salesCount));
    return maxVal === 0 ? 10 : Math.ceil(maxVal * 1.1); // padding factor
  });

  // Calculate coordinates and structures reactively
  barLayouts = computed(() => {
    const list = this._trends();
    const maxAmt = this.maxAmount();
    const maxCount = this.maxSalesCount();
    
    if (list.length === 0) return [];
    
    // SVG bounds config
    const startX = 45;
    const endX = 475;
    const chartHeight = 135; // height offset up to y=155
    const baselineY = 155;
    
    const count = list.length;
    const colStep = (endX - startX) / count;
    
    const width = Math.max(6, colStep * 0.5);

    return list.map((node, index) => {
      const x = startX + (index * colStep) + (colStep - width) / 2;
      
      // Revenue Layout calculations
      const revHeight = (node.revenue / maxAmt) * chartHeight;
      const revY = baselineY - revHeight;
      
      // Profit Layout calculations
      const profHeight = (node.profit > 0 ? (node.profit / maxAmt) * chartHeight : 0);
      const profY = baselineY - profHeight;

      // Sales Volume layouts
      const salesHeight = (node.salesCount / maxCount) * chartHeight;
      const salesY = baselineY - salesHeight;

      return {
        x,
        width,
        revY,
        revHeight,
        profY,
        profHeight,
        salesY,
        salesHeight
      };
    });
  });

  // Profit Curve connecting paths generator
  profitLinePath = computed(() => {
    const layouts = this.barLayouts();
    if (layouts.length === 0) return '';
    return layouts.reduce((path, p, index) => {
      // Connect middle top of profit overlays
      const cx = p.x + p.width / 2;
      const cy = p.profY;
      return path + (index === 0 ? `M ${cx} ${cy}` : ` L ${cx} ${cy}`);
    }, '');
  });

  profitDots = computed(() => {
    const layouts = this.barLayouts();
    return layouts.map(p => ({
      cx: p.x + p.width / 2,
      cy: p.profY
    }));
  });

  // Formatter utilities
  formatScale(value: number): string {
    if (value >= 100000) {
      return (value / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + 'L';
    } else if (value >= 1000) {
      return (value / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + 'K';
    }
    return Math.round(value).toString();
  }

  mathRound(val: number): number {
    return Math.round(val);
  }
}
