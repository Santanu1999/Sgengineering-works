import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { Observable, tap, of, forkJoin, map, switchMap, from } from 'rxjs';
import { OrderRepository } from '../../../data/repositories/order.repository';
import { IOrder, IOrderItem, IOrderWIP, IOrderWithDetails, OrderStatus, WIPStage } from '../../../data/models/order.interface';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  // Angular Signals for modern responsive state engine
  private ordersListSignal: WritableSignal<IOrder[]> = signal<IOrder[]>([]);
  private selectedOrderSignal: WritableSignal<IOrder | null> = signal<IOrder | null>(null);
  private selectedOrderItemsSignal: WritableSignal<IOrderItem[]> = signal<IOrderItem[]>([]);
  private selectedOrderTimelineSignal: WritableSignal<IOrderWIP[]> = signal<IOrderWIP[]>([]);
  private isProcessingSignal: WritableSignal<boolean> = signal<boolean>(false);

  // Read-only public pipelines for UI binding
  public orders = computed(() => this.ordersListSignal());
  public selectedOrder = computed(() => this.selectedOrderSignal());
  public orderItems = computed(() => this.selectedOrderItemsSignal());
  public orderTimeline = computed(() => this.selectedOrderTimelineSignal());
  public isProcessing = computed(() => this.isProcessingSignal());

  // Derived dashboard analytics pipelines (Zero cost computations)
  public receivedOrdersCount = computed(() => {
    return this.ordersListSignal().filter(o => o.status === 'Received').length;
  });

  public activePipelinesCount = computed(() => {
    return this.ordersListSignal().filter(o => 
      o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Received' && o.status !== 'Ready'
    ).length;
  });

  public readyOrdersCount = computed(() => {
    return this.ordersListSignal().filter(o => o.status === 'Ready').length;
  });

  public totalActiveValveRevenue = computed(() => {
    return this.ordersListSignal()
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (o.total_amount || 0.0), 0);
  });

  constructor(private orderRepo: OrderRepository) {}

  /**
   * Refresh standard order directory based on index filters.
   */
  public loadOrders(
    queryBy: string = '',
    statusFilter?: OrderStatus,
    fromDate?: string,
    toDate?: string
  ): Observable<IOrder[]> {
    this.isProcessingSignal.set(true);
    return this.orderRepo.searchOrders(queryBy, statusFilter, fromDate, toDate).pipe(
      tap({
        next: (items) => {
          this.ordersListSignal.set(items);
          this.isProcessingSignal.set(false);
        },
        error: () => this.isProcessingSignal.set(false)
      })
    );
  }

  /**
   * Hydrates detailed views (Timeline, Line items, Cost structures).
   */
  public loadOrderDetails(orderId: string): Observable<IOrderWithDetails | null> {
    this.isProcessingSignal.set(true);
    return this.orderRepo.getOrderById(orderId).pipe(
      switchMap(order => {
        if (!order) {
          this.selectedOrderSignal.set(null);
          this.selectedOrderItemsSignal.set([]);
          this.selectedOrderTimelineSignal.set([]);
          this.isProcessingSignal.set(false);
          return of(null);
        }

        return forkJoin({
          items: this.orderRepo.getOrderItems(orderId),
          timeline: this.orderRepo.getWIPTimeline(orderId)
        }).pipe(
          map(({ items, timeline }) => {
            const composite: IOrderWithDetails = { order, items, timeline };
            
            // Set individual signal values for components
            this.selectedOrderSignal.set(order);
            this.selectedOrderItemsSignal.set(items);
            this.selectedOrderTimelineSignal.set(timeline);
            this.isProcessingSignal.set(false);
            
            return composite;
          })
        );
      })
    );
  }

  /**
   * Generates next serialized chronological number based on calendar year counters.
   */
  public generateNextOrderNumber(): Observable<string> {
    const activeYear = new Date().getFullYear().toString();
    return this.orderRepo.getLatestOrderNumber(activeYear).pipe(
      map(latestNum => {
        if (!latestNum) {
          return `ORD-${activeYear}-001`;
        }
        const segments = latestNum.split('-');
        const serialStr = segments[segments.length - 1];
        const serialNum = parseInt(serialStr, 10);
        const nextSerial = (serialNum + 1).toString().padStart(3, '0');
        return `ORD-${activeYear}-${nextSerial}`;
      })
    );
  }

  /**
   * Orchestrates high-fidelity order creations.
   */
  public registerOrder(
    headerData: Omit<IOrder, 'id' | 'order_number' | 'created_date' | 'updated_date' | 'status'>,
    itemsData: Omit<IOrderItem, 'id' | 'order_id'>[]
  ): Observable<void> {
    this.isProcessingSignal.set(true);
    const timestamp = new Date().toISOString();
    const orderId = crypto.randomUUID();

    return this.generateNextOrderNumber().pipe(
      switchMap(orderNum => {
        const newOrder: IOrder = {
          ...headerData,
          id: orderId,
          order_number: orderNum,
          status: 'Received',
          created_date: timestamp,
          updated_date: timestamp
        };

        const finalItems: IOrderItem[] = itemsData.map(item => ({
          ...item,
          id: crypto.randomUUID(),
          order_id: orderId
        }));

        const initialWIP: IOrderWIP = {
          id: crypto.randomUUID(),
          order_id: orderId,
          stage: 'Received',
          start_date: timestamp.split('T')[0],
          completion_date: timestamp.split('T')[0],
          remarks: 'Order successfully logged in database.'
        };

        // Standard sequential execute blocks
        return this.orderRepo.createOrder(newOrder).pipe(
          switchMap(() => {
            const itemObservables = finalItems.map(item => this.orderRepo.createOrderItem(item));
            return forkJoin(itemObservables);
          }),
          switchMap(() => this.orderRepo.addWIPStage(initialWIP)),
          tap(() => {
            // Recalculate computed listing signals
            this.loadOrders().subscribe();
            this.isProcessingSignal.set(false);
          })
        );
      })
    );
  }

  /**
   * Update entire order boundaries (Updates header, clears and resets line items).
   */
  public modifyOrder(
    order: IOrder,
    updatedItems: Omit<IOrderItem, 'id' | 'order_id'>[]
  ): Observable<void> {
    this.isProcessingSignal.set(true);
    order.updated_date = new Date().toISOString();

    const preparedItems: IOrderItem[] = updatedItems.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      order_id: order.id
    }));

    return this.orderRepo.updateOrder(order).pipe(
      switchMap(() => this.orderRepo.deleteOrderItems(order.id)),
      switchMap(() => {
        if (preparedItems.length === 0) return of([]);
        const inserts = preparedItems.map(item => this.orderRepo.createOrderItem(item));
        return forkJoin(inserts);
      }),
      switchMap(() => this.loadOrderDetails(order.id)),
      tap(() => {
        this.loadOrders().subscribe();
        this.isProcessingSignal.set(false);
      }),
      map(() => void 0)
    );
  }

  /**
   * Delete order completely.
   */
  public purgeOrder(orderId: string): Observable<void> {
    this.isProcessingSignal.set(true);
    return this.orderRepo.deleteOrder(orderId).pipe(
      tap(() => {
        this.ordersListSignal.update(list => list.filter(o => o.id !== orderId));
        if (this.selectedOrderSignal()?.id === orderId) {
          this.selectedOrderSignal.set(null);
          this.selectedOrderItemsSignal.set([]);
          this.selectedOrderTimelineSignal.set([]);
        }
        this.isProcessingSignal.set(false);
      })
    );
  }

  /**
   * Manages progression of fabrication milestones.
   */
  public advanceProductionStage(
    orderId: string,
    currentStage: WIPStage,
    nextStage: WIPStage,
    remarks?: string
  ): Observable<void> {
    this.isProcessingSignal.set(true);
    const currentDateStr = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    // 1. Mark current stage as complete
    return this.orderRepo.updateWIPStageCompletion(orderId, currentStage, currentDateStr, 'Completed milestone stage.').pipe(
      switchMap(() => {
        // 2. Add entry for the new milestone
        const newWIP: IOrderWIP = {
          id: crypto.randomUUID(),
          order_id: orderId,
          stage: nextStage,
          start_date: currentDateStr,
          remarks: remarks || `Started production under ${nextStage}.`
        };
        return this.orderRepo.addWIPStage(newWIP);
      }),
      switchMap(() => {
        // 3. Update parent order status code corresponding to the next stage
        return this.orderRepo.getOrderById(orderId).pipe(
          switchMap(order => {
            if (!order) return of(void 0);
            
            // Map WIPStage to OrderStatus
            order.status = nextStage as OrderStatus;
            
            if (nextStage === 'Delivered') {
              order.actual_delivery_date = currentDateStr;
            }
            
            order.updated_date = timestamp;
            return this.orderRepo.updateOrder(order);
          })
        );
      }),
      switchMap(() => this.loadOrderDetails(orderId)),
      tap(() => {
        this.loadOrders().subscribe();
        this.isProcessingSignal.set(false);
      }),
      map(() => void 0)
    );
  }

  /**
   * Abrupt termination or cancellation of the order execution.
   */
  public cancelOrder(orderId: string, reasonDetails?: string): Observable<void> {
    this.isProcessingSignal.set(true);
    return this.orderRepo.getOrderById(orderId).pipe(
      switchMap(order => {
        if (!order) return of(void 0);
        order.status = 'Cancelled';
        order.notes = (order.notes || '') + `\n[Cancellation details: ${reasonDetails || 'Standard administrative cancel'}]`;
        order.updated_date = new Date().toISOString();
        return this.orderRepo.updateOrder(order);
      }),
      switchMap(() => this.loadOrderDetails(orderId)),
      tap(() => {
        this.loadOrders().subscribe();
        this.isProcessingSignal.set(false);
      }),
      map(() => void 0)
    );
  }
}
