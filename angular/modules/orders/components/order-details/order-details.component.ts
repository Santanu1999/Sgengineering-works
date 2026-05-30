import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { IOrder, IOrderItem, IOrderWIP, WIPStage, OrderStatus } from '../../../../data/models/order.interface';
import { ProductionTimelineComponent } from '../production-timeline/production-timeline.component';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductionTimelineComponent],
  template: `
    <div class="order-details-container p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-6xl mx-auto space-y-6" *ngIf="order()">
      <!-- Header Control Hub bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div class="flex items-center space-x-3.5">
          <div class="w-12 h-12 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-center text-blue-400 text-lg font-bold font-mono">
            #
          </div>
          <div>
            <div class="flex items-center space-x-3">
              <h2 class="text-lg font-bold font-sans text-slate-100 uppercase tracking-wide">{{ order()!.order_number }}</h2>
              <span [ngClass]="getStatusBadgeClasses(order()!.status)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {{ order()!.status }}
              </span>
            </div>
            <p class="text-xs text-slate-400 font-sans mt-0.5">
              Fabrication client profile: <strong class="text-slate-200">{{ order()!.customer_name }}</strong> &middot; {{ order()!.customer_mobile }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="triggerBack()"
            class="px-4 py-2 border border-slate-800 bg-slate-950/20 hover:bg-slate-850 text-slate-400 hover:text-slate-100 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer"
          >
            ← Back to Pipeline
          </button>

          <button
            *ngIf="order()!.status !== 'Cancelled' && order()!.status !== 'Delivered'"
            (click)="triggerEdit()"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer"
          >
            ✏️ Edit Order
          </button>
        </div>
      </div>

      <!-- Core Content Workspace -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left Side: Order properties matrices and items grid (Span 2) -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Key details metadata -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
            <div class="space-y-1">
              <span class="text-[9px] uppercase tracking-wider font-mono text-slate-500">Booking Date</span>
              <div class="text-xs font-semibold text-slate-200 font-sans">{{ order()!.order_date | date:'dd MMMM yyyy' }}</div>
            </div>

            <div class="space-y-1">
              <span class="text-[9px] uppercase tracking-wider font-mono text-slate-500">Estimated Delivery</span>
              <div class="text-xs font-semibold text-amber-500 font-sans">{{ order()!.estimated_delivery_date | date:'dd MMMM yyyy' }}</div>
            </div>

            <div class="space-y-1">
              <span class="text-[9px] uppercase tracking-wider font-mono text-slate-500">SQLite Logged On</span>
              <div class="text-xs font-semibold text-slate-400 font-mono">{{ order()!.created_date | date:'yyyy-dd-MM HH:mm' }} UTC</div>
            </div>
          </div>

          <!-- Items tables list -->
          <div class="space-y-3">
            <h3 class="text-xs font-mono uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5">
              <span>Fabrication Components Blueprint Ledger</span>
            </h3>

            <div class="overflow-x-auto border border-slate-850 rounded-xl bg-slate-950/10">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-slate-850 bg-slate-900/40 font-mono text-[9px] text-slate-400 uppercase tracking-wider">
                    <th class="px-4 py-3">Technical Item Specification</th>
                    <th class="px-4 py-3 text-right">Qty</th>
                    <th class="px-4 py-3 text-right">Unit Price</th>
                    <th class="px-4 py-3 text-right">Manufacturing Buffers</th>
                    <th class="px-4 py-3 text-right">Ledger Sales Value</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-850/60 text-xs text-slate-300">
                  <tr *ngFor="let item of items(); let idx = index" class="hover:bg-slate-850/10 transition">
                    <td class="px-4 py-3">
                      <div class="font-semibold text-slate-200">{{ item.item_name }}</div>
                      <div class="text-[10px] text-slate-500 font-mono mt-0.5">{{ item.description || 'No dimensional specs entered.' }}</div>
                      <div class="text-[10px] text-slate-500 font-mono mt-0.5" *ngIf="item.remarks">
                        <strong class="text-slate-400">Workshop Instructions:</strong> {{ item.remarks }}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right font-mono text-slate-400">{{ item.quantity }}</td>
                    <td class="px-4 py-3 text-right font-mono text-slate-400">₹{{ item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</td>
                    <td class="px-4 py-3 text-right font-mono text-slate-400">₹{{ (item.estimated_cost || 0.0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</td>
                    <td class="px-4 py-3 text-right font-bold font-mono text-slate-100">
                      ₹{{ (item.quantity * item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="border-t border-slate-800 bg-slate-900/10 font-mono text-xs">
                    <td colspan="4" class="px-4 py-4 text-right text-slate-500">AGGREGATE SALES LEDGER VALUE:</td>
                    <td class="px-4 py-4 text-right font-bold text-slate-200">
                      ₹{{ calculateBillTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Notes Card -->
          <div class="p-4 bg-slate-950/20 border border-slate-850 rounded-xl space-y-2">
            <h4 class="text-[10px] uppercase font-mono text-slate-500 font-bold">Fabrication Notes & Terms</h4>
            <p class="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              {{ order()!.notes || 'No custom terms or transport notes registered for this order.' }}
            </p>
          </div>

        </div>

        <!-- Right Side: Production Stages transitions & Interactive vertical history -->
        <div class="space-y-6">
          <!-- WIP Progress Control Center -->
          <div class="p-5 bg-slate-950/40 border border-slate-850 rounded-xl space-y-4" *ngIf="order()!.status !== 'Cancelled' && order()!.status !== 'Delivered'">
            <h4 class="text-xs uppercase font-mono text-slate-400 font-bold flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>WIP Milestone Transiter</span>
            </h4>

            <div class="space-y-3.5">
              <div class="text-xs text-slate-300 font-sans leading-relaxed">
                Currently locked at <strong class="text-blue-400">{{ order()!.status }}</strong> stage. Track and log progression to the next milestone:
              </div>

              <!-- State transition picker -->
              <div class="space-y-1.5">
                <label class="text-[9px] font-mono uppercase text-slate-500">Prospect Milestone Stage</label>
                <select
                  [(ngModel)]="nextStage"
                  class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500 transition cursor-pointer"
                >
                  <option value="" disabled>-- Choose next target stage --</option>
                  <option *ngFor="let stg of getAvailableNextStages()" [value]="stg">{{ stg }}</option>
                </select>
              </div>

              <!-- Stage comments remarks -->
              <div class="space-y-1.5">
                <label class="text-[9px] font-mono uppercase text-slate-500">Production remarks / comment log</label>
                <input
                  type="text"
                  [(ngModel)]="stageRemarks"
                  placeholder="e.g., Weld complete under workshop foreman, passing to paint booth..."
                  class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500 transition"
                />
              </div>

              <button
                type="button"
                [disabled]="!nextStage || isTransitioning"
                (click)="executeStageTransition()"
                class="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold tracking-wide transition shadow-lg shadow-amber-600/10 active:scale-95 disabled:hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {{ isTransitioning ? 'Updating SQLite state records...' : 'Confirm Milestone Progression' }}
              </button>
            </div>
          </div>

          <!-- Delivered / Cancelled status placeholders -->
          <div class="p-5 bg-slate-950/20 border border-slate-850 rounded-xl text-center space-y-2.5" *ngIf="order()!.status === 'Delivered' || order()!.status === 'Cancelled'">
            <div class="text-2xl">
              {{ order()!.status === 'Delivered' ? '✅' : '🛑' }}
            </div>
            <h4 class="text-xs font-mono uppercase font-bold text-slate-300">
              Pipeline Flow Concluded ({{\`SYS_TERM_\` + order()!.status.toUpperCase()}})
            </h4>
            <p class="text-[11px] text-slate-500 max-w-xs mx-auto">
              This order has been completed or cancelled from active workflows. Further physical progression logs are locked. View history timeline below.
            </p>
          </div>

          <!-- Quick Cancel Order CTA -->
          <button
            *ngIf="order()!.status !== 'Cancelled' && order()!.status !== 'Delivered'"
            (click)="triggerCancelOrder()"
            class="w-full py-2.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-900/65 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Cancel Order Execution
          </button>

          <!-- Component Timeline tracker section -->
          <app-production-timeline [timeline]="timeline()"></app-production-timeline>

        </div>

      </div>
    </div>
  `
})
export class OrderDetailsComponent implements OnInit {
  @Input() orderId!: string;
  @Output() back = new EventEmitter<void>();
  @Output() edit = new EventEmitter<IOrder>();
  @Output() cancelOrder = new EventEmitter<{ orderId: string; orderNumber: string }>();

  // Interactive properties state
  nextStage: string = '';
  stageRemarks: string = '';
  isTransitioning: boolean = false;

  // Signal properties linked directly to the service layer state machine
  order = this.orderService.selectedOrder;
  items = this.orderService.orderItems;
  timeline = this.orderService.orderTimeline;

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.orderService.loadOrderDetails(this.orderId).subscribe();
  }

  calculateBillTotal(): number {
    return this.items().reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  }

  getAvailableNextStages(): WIPStage[] {
    const curStatus = this.order()?.status;
    if (!curStatus || curStatus === 'Cancelled' || curStatus === 'Delivered') {
      return [];
    }

    const stages: WIPStage[] = [
      'Received',
      'Material Procurement',
      'Cutting',
      'Welding',
      'Assembly',
      'Painting',
      'Testing',
      'Ready',
      'Delivered'
    ];

    const idx = stages.indexOf(curStatus as WIPStage);
    if (idx === -1) {
      return [];
    }

    // Return remaining stages that the fabrication order can go forward to
    return stages.slice(idx + 1);
  }

  executeStageTransition(): void {
    if (!this.nextStage || !this.order()) return;

    this.isTransitioning = true;
    const currentStatus = this.order()!.status as WIPStage;
    const targetStatus = this.nextStage as WIPStage;

    this.orderService.advanceProductionStage(
      this.order()!.id,
      currentStatus,
      targetStatus,
      this.stageRemarks ? this.stageRemarks : undefined
    ).subscribe({
      next: () => {
        this.nextStage = '';
        this.stageRemarks = '';
        this.isTransitioning = false;
      },
      error: () => {
        this.isTransitioning = false;
      }
    });
  }

  getStatusBadgeClasses(status: OrderStatus): string {
    switch (status) {
      case 'Received':
        return 'bg-sky-500/10 border border-sky-500/20 text-sky-400';
      case 'Material Procurement':
        return 'bg-purple-500/10 border border-purple-500/20 text-purple-400';
      case 'Cutting':
      case 'Welding':
      case 'Assembly':
        return 'bg-amber-500/10 border border-amber-500/20 text-amber-400';
      case 'Painting':
      case 'Testing':
        return 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400';
      case 'Ready':
        return 'bg-teal-500/10 border border-teal-500/20 text-teal-400';
      case 'Delivered':
        return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
      case 'Cancelled':
        return 'bg-rose-500/10 border border-rose-500/20 text-rose-400';
      default:
        return 'bg-slate-500/10 border border-slate-500/20 text-slate-400';
    }
  }

  triggerBack(): void {
    this.back.emit();
  }

  triggerEdit(): void {
    if (this.order()) {
      this.edit.emit(this.order()!);
    }
  }

  triggerCancelOrder(): void {
    if (this.order()) {
      this.cancelOrder.emit({
        orderId: this.order()!.id,
        orderNumber: this.order()!.order_number
      });
    }
  }
}
