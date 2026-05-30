import { Component, OnInit, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { CustomerService } from '../../../customers/services/customer.service';
import { IOrder, IOrderItem, OrderStatus } from '../../../../data/models/order.interface';
import { ICustomer } from '../../../../data/models/customer.interface';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="order-form-container p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-4xl mx-auto space-y-6">
      <!-- Title Heading -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-lg font-bold font-serif text-slate-100 flex items-center gap-2">
            <span>{{ isEditMode ? 'Modify Fabrication Order' : 'Create New Fabrication Order' }}</span>
          </h2>
          <p class="text-xs text-slate-400 font-sans mt-0.5">
            {{ isEditMode ? 'Alter active fabrication details and materials specs' : 'Log new metal fabrication requirement under the SQLite ledger' }}
          </p>
        </div>
        
        <button
          (click)="triggerCancel()"
          class="px-3.5 py-1.5 border border-slate-800 bg-slate-950/20 hover:bg-slate-850 text-slate-400 hover:text-slate-100 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <!-- Core Form Layout -->
      <form #form="ngForm" (ngSubmit)="save(form)" class="space-y-6">
        
        <!-- Header Grid: Customer reference & Delivery timelines -->
        <h3 class="text-xs uppercase tracking-wider text-slate-500 font-mono font-bold">1. Primary Order Specifications</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/20 border border-slate-850 p-4 rounded-xl">
          <!-- Select Customer Lookup -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <span>Customer Registry Profile</span>
              <span class="text-rose-400">*</span>
            </label>
            <select
              [(ngModel)]="header.customer_id"
              name="customer_id"
              required
              class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-blue-500 transition cursor-pointer"
            >
              <option value="" disabled>-- Select Extant Customer profile --</option>
              <option *ngFor="let c of customers()" [value]="c.id">
                {{ c.name }} ({{ c.mobile }})
              </option>
            </select>
          </div>

          <!-- Order Date Picker -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase text-slate-400">Order Booking Date</label>
            <input
              type="date"
              [(ngModel)]="header.order_date"
              name="order_date"
              required
              class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-blue-500 transition"
            />
          </div>

          <!-- Estimated Delivery Date Picker -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <span>Estimated Delivery Date</span>
              <span class="text-rose-400">*</span>
            </label>
            <input
              type="date"
              [(ngModel)]="header.estimated_delivery_date"
              name="estimated_delivery_date"
              required
              class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-blue-500 transition"
            />
          </div>

          <!-- Active Order Status (Only in Edit mode) -->
          <div class="space-y-1.5" *ngIf="isEditMode">
            <label class="text-[10px] font-mono uppercase text-slate-400">Production WIP Status</label>
            <select
              [(ngModel)]="header.status"
              name="status"
              class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-blue-500 transition cursor-pointer"
            >
              <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
            </select>
          </div>
        </div>

        <!-- Order Items dynamic array panel -->
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-slate-850 pb-2">
            <h3 class="text-xs uppercase tracking-wider text-slate-500 font-mono font-bold">2. Fabrication Line Items</h3>
            <button
              type="button"
              (click)="addItemLine()"
              class="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-lg text-[10px] font-mono transition cursor-pointer"
            >
              + Add Product Item Line
            </button>
          </div>

          <!-- Loop lines -->
          <div class="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            <div *ngFor="let item of items; let i = index" class="relative group bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3">
              
              <!-- Top bar controls for item line -->
              <div class="flex items-center justify-between font-mono text-[10px] text-slate-500 border-b border-slate-900 pb-2">
                <span>LINE ITEM #0{{ i + 1 }}</span>
                <button
                  type="button"
                  *ngIf="items.length > 1"
                  (click)="removeItemLine(i)"
                  class="text-rose-500 hover:text-rose-400 hover:bg-rose-950/20 px-1.5 py-0.5 rounded cursor-pointer"
                >
                  REMOVE LINE
                </button>
              </div>

              <!-- Item Fields inputs Grid -->
              <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <!-- Product/Item Name -->
                <div class="md:col-span-2 space-y-1">
                  <label class="text-[9px] font-mono uppercase text-slate-500">Fabrication Item / Product Name</label>
                  <input
                    type="text"
                    [(ngModel)]="item.item_name"
                    name="item_name_{{i}}"
                    placeholder="e.g. Stainless Steel Container Vat, Conveyor Frame..."
                    required
                    class="w-full text-xs bg-slate-900 border border-slate-850 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-blue-500 transition"
                  />
                </div>

                <!-- Quantity -->
                <div class="space-y-1">
                  <label class="text-[9px] font-mono uppercase text-slate-500">Quantity (Units)</label>
                  <input
                    type="number"
                    [(ngModel)]="item.quantity"
                    (ngModelChange)="recalculateCosts(i)"
                    name="quantity_{{i}}"
                    required
                    min="1"
                    placeholder="Qtn"
                    class="w-full text-xs bg-slate-900 border border-slate-850 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-blue-500 transition"
                  />
                </div>

                <!-- Unit Price (Actual Sales Rate) -->
                <div class="space-y-1">
                  <label class="text-[9px] font-mono uppercase text-slate-500">Unit Price Ledger (₹)</label>
                  <input
                    type="number"
                    [(ngModel)]="item.unit_price"
                    (ngModelChange)="recalculateCosts(i)"
                    name="unit_price_{{i}}"
                    required
                    min="0"
                    placeholder="Rate"
                    class="w-full text-xs bg-slate-900 border border-slate-850 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <!-- Secondary Cost estimation info -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <!-- Estimated raw materials cost -->
                <div class="space-y-1">
                  <label class="text-[9px] font-mono uppercase text-slate-500">Est. Fabrication Cost (₹)</label>
                  <input
                    type="number"
                    [(ngModel)]="item.estimated_cost"
                    name="estimated_cost_{{i}}"
                    placeholder="Manufacturing cost buffer"
                    class="w-full text-xs bg-slate-900 border border-slate-850 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-blue-500 transition"
                  />
                </div>

                <!-- Final Cost rate (calculated and verified) -->
                <div class="space-y-1">
                  <label class="text-[9px] font-mono uppercase text-slate-500">Final Booking Cost (calculated as Unit Price)</label>
                  <input
                    type="number"
                    [(ngModel)]="item.final_cost"
                    name="final_cost_{{i}}"
                    readonly
                    class="w-full text-xs bg-slate-950/60 border border-slate-900 rounded-lg px-3 py-1.5 text-slate-500 font-mono outline-none cursor-not-allowed"
                    title="Computed rate based on final price validations"
                  />
                </div>

                <!-- Details line -->
                <div class="space-y-1">
                  <label class="text-[9px] font-mono uppercase text-slate-500">Dimension Specs Specs & Description</label>
                  <input
                    type="text"
                    [(ngModel)]="item.description"
                    name="description_{{i}}"
                    placeholder="Lengths, Materials grade (SS304/SS316)..."
                    class="w-full text-xs bg-slate-900 border border-slate-850 rounded-lg px-3 py-1.5 text-slate-300 outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <!-- Remarks line -->
              <div class="space-y-1">
                <label class="text-[9px] font-mono uppercase text-slate-500">Remarks / Welding & Cutting Instructions</label>
                <input
                  type="text"
                  [(ngModel)]="item.remarks"
                  name="remarks_{{i}}"
                  placeholder="Special instructions for cutting and welding workshop teams..."
                  class="w-full text-xs bg-slate-900 border border-slate-850 rounded-lg px-3 py-1.5 text-slate-300 outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Notes and terms area -->
        <h3 class="text-xs uppercase tracking-wider text-slate-500 font-mono font-bold pt-2">3. Fabrication Notes</h3>
        <div class="space-y-1.5 bg-slate-950/20 border border-slate-850 p-4 rounded-xl">
          <label class="text-[10px] font-mono uppercase text-slate-400">Order Remarks & Ledger Details</label>
          <textarea
            [(ngModel)]="header.notes"
            name="notes"
            rows="3"
            placeholder="Log overall transport specs, advance payment expectations, or miscellaneous fabrication terms..."
            class="w-full text-xs bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none focus:border-blue-500 transition resize-none"
          ></textarea>
        </div>

        <!-- Calculation Summary Info -->
        <div class="p-4 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between shrink-0 font-mono text-xs">
          <span class="text-slate-500">AGGREGATE SALES ORDER LEDGER VALUE:</span>
          <div>
            <span class="text-[10px] text-slate-500 mr-1.5">({{ items.length }} line items)</span>
            <span class="text-sm font-bold text-slate-100">₹{{ calculateTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
          </div>
        </div>

        <!-- Save Button / CTA -->
        <div class="flex items-center justify-end space-x-3 pt-3">
          <button
            type="button"
            (click)="triggerCancel()"
            class="px-5 py-2.5 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer"
          >
            Go Back
          </button>
          
          <button
            type="submit"
            [disabled]="!form.valid || isSaving"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold tracking-wide transition shadow-lg shadow-blue-500/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {{ isSaving ? 'Executing SQLite Transactions...' : (isEditMode ? 'Save and Override Changes' : 'Confirm & Write Job Record') }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class OrderFormComponent implements OnInit {
  @Input() orderToEdit: IOrder | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() orderSaved = new EventEmitter<void>();

  isEditMode: boolean = false;
  isSaving: boolean = false;

  // Header State
  header = {
    customer_id: '',
    order_date: new Date().toISOString().split('T')[0],
    estimated_delivery_date: '',
    status: 'Received' as OrderStatus,
    notes: ''
  };

  // Multiple Line Items State
  items: Array<{
    item_name: string;
    quantity: number;
    unit_price: number;
    estimated_cost: number;
    final_cost: number;
    description: string;
    remarks: string;
  }> = [];

  // Extant Customer List
  customers = this.customerService.customers;

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

  constructor(
    private orderService: OrderService,
    private customerService: CustomerService
  ) {}

  ngOnInit(): void {
    // 1. Load active customers list
    this.customerService.loadCustomers().subscribe();

    // 2. Setup Form Modes
    if (this.orderToEdit) {
      this.isEditMode = true;
      this.header = {
        customer_id: this.orderToEdit.customer_id,
        order_date: this.orderToEdit.order_date.split('T')[0],
        estimated_delivery_date: this.orderToEdit.estimated_delivery_date.split('T')[0],
        status: this.orderToEdit.status,
        notes: this.orderToEdit.notes || ''
      };

      // Load related order lines directly from order service details
      this.orderService.loadOrderDetails(this.orderToEdit.id).subscribe(details => {
        if (details && details.items) {
          this.items = details.items.map(i => ({
            item_name: i.item_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            estimated_cost: i.estimated_cost,
            final_cost: i.final_cost,
            description: i.description || '',
            remarks: i.remarks || ''
          }));
        } else {
          this.addItemLine();
        }
      });
    } else {
      this.isEditMode = false;
      this.addItemLine();
      
      // Default delivery date forecast is 30 days from today
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      this.header.estimated_delivery_date = defaultDate.toISOString().split('T')[0];
    }
  }

  addItemLine(): void {
    this.items.push({
      item_name: '',
      quantity: 1,
      unit_price: 0,
      estimated_cost: 0,
      final_cost: 0,
      description: '',
      remarks: ''
    });
  }

  removeItemLine(index: number): void {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    }
  }

  recalculateCosts(index: number): void {
    const item = this.items[index];
    // Final Cost is mirrored as unit price for calculation matches
    item.final_cost = item.unit_price;
  }

  calculateTotalAmount(): number {
    return this.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  }

  triggerCancel(): void {
    this.cancel.emit();
  }

  save(ngForm: NgForm): void {
    if (!ngForm.valid || this.items.length === 0) return;

    this.isSaving = true;

    // Filter dynamic descriptions and parse numbers
    const itemsPayload: Omit<IOrderItem, 'id' | 'order_id'>[] = this.items.map(i => ({
      item_name: i.item_name,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      estimated_cost: Number(i.estimated_cost || 0.0),
      // Double check finalized cost
      final_cost: Number(i.unit_price),
      description: i.description ? i.description : null,
      remarks: i.remarks ? i.remarks : null
    }));

    if (this.isEditMode && this.orderToEdit) {
      const updatedOrder: IOrder = {
        ...this.orderToEdit,
        customer_id: this.header.customer_id,
        order_date: this.header.order_date,
        estimated_delivery_date: this.header.estimated_delivery_date,
        status: this.header.status,
        notes: this.header.notes
      };

      this.orderService.modifyOrder(updatedOrder, itemsPayload).subscribe({
        next: () => {
          this.isSaving = false;
          this.orderSaved.emit();
        },
        error: () => {
          this.isSaving = false;
        }
      });
    } else {
      const orderPayload: Omit<IOrder, 'id' | 'order_number' | 'created_date' | 'updated_date' | 'status'> = {
        customer_id: this.header.customer_id,
        order_date: this.header.order_date,
        estimated_delivery_date: this.header.estimated_delivery_date,
        notes: this.header.notes
      };

      this.orderService.registerOrder(orderPayload, itemsPayload).subscribe({
        next: () => {
          this.isSaving = false;
          this.orderSaved.emit();
        },
        error: () => {
          this.isSaving = false;
        }
      });
    }
  }
}
