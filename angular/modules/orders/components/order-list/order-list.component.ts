import { Component, OnInit, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { IOrder, OrderStatus } from '../../../../data/models/order.interface';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="order-list-container p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-7xl mx-auto space-y-6">
      <!-- Title & Header section -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold font-serif tracking-tight text-slate-100 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Fabrication Orders Pipeline</span>
          </h2>
          <p class="text-xs text-slate-400 font-sans mt-1">
            Tracks multi-stage workflows from initial Received status to final Deliveries.
          </p>
        </div>
        
        <button
          (click)="triggerCreateOrder()"
          id="btn-create-order-trigger"
          class="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold tracking-wide transition shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <span>+ Create Fabrication Order</span>
        </button>
      </div>

      <!-- Live Signal KPI Dashboard Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Received Metric Card -->
        <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Job Bookings (Received)</div>
          <div class="text-2xl font-bold text-sky-400 tracking-tight">{{ receivedCount() }}</div>
          <div class="text-[10px] text-slate-500 font-sans">Awaiting core materials</div>
        </div>

        <!-- WIP Pipelines Card -->
        <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Active Workstations</div>
          <div class="text-2xl font-bold text-amber-500 tracking-tight">{{ activeWorkstationsCount() }}</div>
          <div class="text-[10px] text-slate-500 font-sans">Weld, Assemble, and Paint phases</div>
        </div>

        <!-- Ready to Dispatched Card -->
        <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Ready for Dispatches</div>
          <div class="text-2xl font-bold text-emerald-400 tracking-tight">{{ readyDispatchesCount() }}</div>
          <div class="text-[10px] text-slate-500 font-sans">Completed tests, ready to roll</div>
        </div>

        <!-- Total Turnover Value -->
        <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Total Active Pipeline</div>
          <div class="text-2xl font-bold text-indigo-400 tracking-tight">₹{{ totalPipelineValue().toLocaleString('en-IN') }}</div>
          <div class="text-[10px] text-slate-500 font-sans flex items-center gap-1">
            <span>Synced in SQLite db</span>
          </div>
        </div>
      </div>

      <!-- Filters & Indexed Search panel -->
      <div class="p-4 bg-slate-950/30 border border-slate-850 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Query string match -->
        <div class="space-y-1.5 col-span-1 md:col-span-2">
          <label class="text-[10px] font-mono uppercase text-slate-400">Search Orders</label>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyLocalFilters()"
            placeholder="Search Order Number, Customer, or Keywords..."
            class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-blue-500 transition"
          />
        </div>

        <!-- Select Status Dropdown -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-mono uppercase text-slate-400">Status Filter</label>
          <select
            [(ngModel)]="selectedStatus"
            (ngModelChange)="applyLocalFilters()"
            class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
          </select>
        </div>

        <!-- Date Range Filter buttons trigger -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-mono uppercase text-slate-400">Chronological Range</label>
          <div class="flex gap-2">
            <input
              type="date"
              [(ngModel)]="fromDate"
              (ngModelChange)="applyLocalFilters()"
              class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-slate-400 outline-none focus:border-blue-500 transition"
              title="Start Date"
            />
            <input
              type="date"
              [(ngModel)]="toDate"
              (ngModelChange)="applyLocalFilters()"
              class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-slate-400 outline-none focus:border-blue-500 transition"
              title="End Date"
            />
          </div>
        </div>
      </div>

      <!-- Orders Listings Matrix Table -->
      <div class="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/60 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
              <th class="px-5 py-4">Order Number</th>
              <th class="px-5 py-4">Customer Details</th>
              <th class="px-5 py-4">Booking Date</th>
              <th class="px-5 py-4">Estimated Delivery</th>
              <th class="px-5 py-4">Stage Status</th>
              <th class="px-5 py-4 text-right">Items Count</th>
              <th class="px-5 py-4 text-right">Ledger Value</th>
              <th class="px-5 py-4 text-center">Control Panel</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-850/60 text-xs">
            <tr *ngFor="let o of orders()" class="hover:bg-slate-850/30 transition text-slate-300">
              <!-- Order number -->
              <td class="px-5 py-4 font-mono font-bold text-blue-400">{{ o.order_number }}</td>
              
              <!-- Customer Profile link -->
              <td class="px-5 py-4">
                <div class="font-semibold text-slate-100">{{ o.customer_name }}</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">{{ o.customer_mobile }}</div>
              </td>
              
              <!-- Booking order date -->
              <td class="px-5 py-4 font-sans">{{ o.order_date | date:'dd MMM yyyy' }}</td>
              
              <!-- Delivery forecast -->
              <td class="px-5 py-4 font-sans">
                <span [class.text-rose-400]="isOverdue(o.estimated_delivery_date, o.status)">
                  {{ o.estimated_delivery_date | date:'dd MMM yyyy' }}
                </span>
              </td>
              
              <!-- Interactive Status Badger -->
              <td class="px-5 py-4">
                <span [ngClass]="getStatusBadgeClasses(o.status)" class="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                  {{ o.status }}
                </span>
              </td>
              
              <!-- Items Count -->
              <td class="px-5 py-4 text-right font-mono">{{ o.items_count || 1 }} items</td>
              
              <!-- Outstanding Ledger amount -->
              <td class="px-5 py-4 text-right font-mono font-bold text-slate-100">
                ₹{{ (o.total_amount || 0.0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
              </td>
              
              <!-- Manage Interactive Controls -->
              <td class="px-5 py-4 text-center">
                <div class="flex items-center justify-center space-x-2">
                  <button
                    (click)="triggerSelectOrder(o.id)"
                    class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
                    title="View details & WIP Stages"
                  >
                    🔍
                  </button>
                  <button
                    (click)="triggerEditOrder(o)"
                    class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                    title="Edit Order Parameters"
                  >
                    ✏️
                  </button>
                  <button
                    (click)="triggerDeleteOrder(o.id, o.order_number)"
                    class="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    title="Purge Order Record"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
            
            <!-- Empty Registry Display -->
            <tr *ngIf="orders().length === 0">
              <td colspan="8" class="px-5 py-12 text-center text-slate-500 font-sans">
                No fabrication orders found matching requirements. Try adjusting query terms or filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: []
})
export class OrderListComponent implements OnInit {
  @Output() selectOrder = new EventEmitter<string>();
  @Output() createOrder = new EventEmitter<void>();
  @Output() editOrder = new EventEmitter<IOrder>();
  @Output() deleteOrder = new EventEmitter<{ id: string; orderNumber: string }>();

  // Filter Models
  searchQuery: string = '';
  selectedStatus: string = '';
  fromDate: string = '';
  toDate: string = '';

  // Order state pipeline signals linked to the service definitions
  orders = this.orderService.orders;
  receivedCount = this.orderService.receivedOrdersCount;
  activeWorkstationsCount = this.orderService.activePipelinesCount;
  readyDispatchesCount = this.orderService.readyOrdersCount;
  totalPipelineValue = this.orderService.totalActiveValveRevenue;

  statuses: OrderStatus[] = [
    'Received',
    'Material Procurement',
    'Cutting',
    'Welding',
    'Assembly',
    'Painting',
    'Testing',
    'Ready',
    'Delivered',
    'Cancelled'
  ];

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    // Standard initialization load
    this.orderService.loadOrders().subscribe();
  }

  applyLocalFilters(): void {
    this.orderService.loadOrders(
      this.searchQuery,
      this.selectedStatus ? (this.selectedStatus as OrderStatus) : undefined,
      this.fromDate ? this.fromDate : undefined,
      this.toDate ? this.toDate : undefined
    ).subscribe();
  }

  isOverdue(estDeliveryStr: string, status: OrderStatus): boolean {
    if (status === 'Delivered' || status === 'Cancelled') return false;
    const today = new Date().toISOString().split('T')[0];
    return estDeliveryStr < today;
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

  triggerSelectOrder(id: string): void {
    this.selectOrder.emit(id);
  }

  triggerCreateOrder(): void {
    this.createOrder.emit();
  }

  triggerEditOrder(order: IOrder): void {
    this.editOrder.emit(order);
  }

  triggerDeleteOrder(id: string, orderNumber: string): void {
    this.deleteOrder.emit({ id, orderNumber });
  }
}
