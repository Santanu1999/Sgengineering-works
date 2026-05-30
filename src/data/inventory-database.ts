import { 
  IRawMaterial, 
  ISupplier, 
  ISupplierLedgerEntry, 
  IInventoryTransaction, 
  IBom, 
  IWipJob, 
  IFinishedGood,
  WipStage,
  IWipStageMilestone
} from '../types/inventory.interface';

// LocalStorage Keys
const RAW_MATERIAL_KEY = 'sg_db_raw_materials';
const SUPPLIER_KEY = 'sg_db_suppliers';
const SUPP_LEDGER_KEY = 'sg_db_supplier_ledgers';
const INV_TXN_KEY = 'sg_db_inv_transactions';
const BOM_KEY = 'sg_db_boms';
const WIP_JOB_KEY = 'sg_db_wip_jobs';
const FINISHED_GOOD_KEY = 'sg_db_finished_goods';

export function initInventoryDatabase() {
  // 1. SEED SUPPLIERS
  if (!localStorage.getItem(SUPPLIER_KEY)) {
    const defaultSuppliers: ISupplier[] = [
      {
        id: 'supp-1',
        name: 'Jindal Steel Distributors',
        contact_person: 'Ramesh Jindal',
        mobile: '9836011223',
        alternate_mobile: '9830022334',
        email: 'sales@jindalsteeldist.com',
        address: '40, Strand Road, Clive Row, Kolkata, West Bengal, 700001',
        gst_number: '19AAACJ4455R1Z3',
        notes: 'Primary supplier for SS 304 and 316 structural materials.',
        status: 'Active',
        outstanding_balance: 180000.0
      },
      {
        id: 'supp-2',
        name: 'Kolkata Steel Mart',
        contact_person: 'Sanjay Shah',
        mobile: '9433182910',
        alternate_mobile: null,
        email: 'kolkatasteel@gmail.com',
        address: '88, Netaji Subhas Road, Liluah, Howrah, 711204',
        gst_number: '19AABCS8899K1Z5',
        notes: 'Provides mild steel sections, angle irons, and hollow boxes.',
        status: 'Active',
        outstanding_balance: 65000.0
      },
      {
        id: 'supp-3',
        name: 'Esab Welding Hub',
        contact_person: 'Gurnam Singh',
        mobile: '8017054312',
        alternate_mobile: null,
        email: 'info@gurnamwelding.in',
        address: '12, Ganesh Chandra Avenue, Kolkata, West Bengal, 700013',
        gst_number: null,
        notes: 'Supplies standard welding boxes, flux powders, and safety gears.',
        status: 'Active',
        outstanding_balance: 0.0
      },
      {
        id: 'supp-4',
        name: 'Thermocraft Heaters Ltd',
        contact_person: 'Pradip Roy',
        mobile: '7003511982',
        alternate_mobile: '9007123456',
        email: 'p.roy@thermocraft.co.in',
        address: 'Sector V, Salt Lake, Kolkata, 700091',
        gst_number: '19AAGCT1212B1ZX',
        notes: 'High-temperature industrial heaters, relays, and thermocouple wires.',
        status: 'Active',
        outstanding_balance: 42000.0
      },
      {
        id: 'supp-5',
        name: 'Festo Automation Agency',
        contact_person: 'A. Mukhopadhyay',
        mobile: '9123045678',
        alternate_mobile: null,
        email: 'festosales.cal@festo.com',
        address: 'Kasba Industrial Estate, Kolkata, 700099',
        gst_number: '19AAACF3030M1ZS',
        notes: 'Heavy duty pneumatic valves, pressure filters, and hydraulic cylinders.',
        status: 'Active',
        outstanding_balance: 115000.0
      }
    ];
    localStorage.setItem(SUPPLIER_KEY, JSON.stringify(defaultSuppliers));

    // Seeds default Supplier Ledgers corresponding to outstanding balance
    const ledgers: ISupplierLedgerEntry[] = [];
    defaultSuppliers.forEach(supp => {
      if (supp.outstanding_balance > 0) {
        ledgers.push({
          id: `sl-init-${supp.id}`,
          supplier_id: supp.id,
          date: '2026-01-01',
          type: 'Purchase Invoice',
          reference_no: 'OP-BAL-026',
          description: 'Migrated opening active balance dues',
          debit: 0,
          credit: supp.outstanding_balance,
          running_balance: supp.outstanding_balance
        });
      }
    });
    localStorage.setItem(SUPP_LEDGER_KEY, JSON.stringify(ledgers));
  }

  // 2. SEED RAW MATERIALS
  if (!localStorage.getItem(RAW_MATERIAL_KEY)) {
    const defaultRawMaterials: IRawMaterial[] = [
      {
        id: 'rm-1',
        name: 'Stainless Steel Sheets (SS-304, 3mm)',
        code: 'RM-SS304-3MM',
        category: 'Steel Sheets',
        uom: 'Sheet',
        current_stock: 8,
        minimum_stock: 20,
        maximum_stock: 50,
        purchase_cost: 4500,
        selling_cost: 5500,
        supplier_id: 'supp-1',
        supplier_name: 'Jindal Steel Distributors',
        description: '3mm thick high tension corrosion-resistant structural steel sheets.',
        created_date: '2026-01-10T11:00:00Z'
      },
      {
        id: 'rm-2',
        name: 'Mild Steel Angle Irons (50x50x5mm)',
        code: 'RM-MSAG-50x5',
        category: 'Profiles & Angels',
        uom: 'Length',
        current_stock: 15,
        minimum_stock: 40,
        maximum_stock: 100,
        purchase_cost: 1100,
        selling_cost: 1400,
        supplier_id: 'supp-2',
        supplier_name: 'Kolkata Steel Mart',
        description: 'Standard 6-meter length structural core angle bars for framing.',
        created_date: '2026-01-15T09:00:00Z'
      },
      {
        id: 'rm-3',
        name: 'Welding Electrodes Box (E6013, 3.15mm)',
        code: 'RM-WEL-E6013',
        category: 'Consumables',
        uom: 'Box',
        current_stock: 2,
        minimum_stock: 12,
        maximum_stock: 30,
        purchase_cost: 650,
        selling_cost: 800,
        supplier_id: 'supp-3',
        supplier_name: 'Esab Welding Hub',
        description: 'All-position general performance carbon steel manual core arcs.',
        created_date: '2026-01-20T14:00:00Z'
      },
      {
        id: 'rm-4',
        name: 'Heating Element Coils (3KW U-Shape)',
        code: 'RM-HEC-3KW',
        category: 'Electrical',
        uom: 'Unit',
        current_stock: 3, // Set to 3 to simulate some stocks or keep low
        minimum_stock: 5,
        maximum_stock: 15,
        purchase_cost: 1250,
        selling_cost: 1700,
        supplier_id: 'supp-4',
        supplier_name: 'Thermocraft Heaters Ltd',
        description: 'Heavy duty U-shaped copper heating coils with insulated terminal posts.',
        created_date: '2026-02-01T10:00:00Z'
      },
      {
        id: 'rm-5',
        name: 'Heavy Duty Pneumatic Cylinders (80mm bore)',
        code: 'RM-PNC-80B',
        category: 'Machinery',
        uom: 'Unit',
        current_stock: 1,
        minimum_stock: 4,
        maximum_stock: 10,
        purchase_cost: 7200,
        selling_cost: 9500,
        supplier_id: 'supp-5',
        supplier_name: 'Festo Automation Agency',
        description: 'Double acting pneumatic cylinders with adjustable air cushion dampening.',
        created_date: '2026-02-15T15:00:00Z'
      }
    ];
    localStorage.setItem(RAW_MATERIAL_KEY, JSON.stringify(defaultRawMaterials));
  }

  // 3. SEED FINISHED GOODS
  if (!localStorage.getItem(FINISHED_GOOD_KEY)) {
    const defaultFinishedGoods: IFinishedGood[] = [
      {
        id: 'fg-1',
        name: 'Industrial Stainless Steel Pulverizer 50HP',
        code: 'FG-SS-P50',
        quantity_available: 3,
        manufacturing_cost: 110000,
        selling_price: 250000,
        status: 'Available'
      },
      {
        id: 'fg-2',
        name: 'High-Temp Rotary Deck Oven',
        code: 'FG-HT-RO40',
        quantity_available: 1,
        manufacturing_cost: 45000,
        selling_price: 85000,
        status: 'Available'
      },
      {
        id: 'fg-3',
        name: 'Steam Jacketed Cooking Vat (300L)',
        code: 'FG-SCV-300L',
        quantity_available: 2,
        manufacturing_cost: 65000,
        selling_price: 110000,
        status: 'Available'
      },
      {
        id: 'fg-4',
        name: 'Automatic Flow-Wrap Packaging Frame',
        code: 'FG-AF-W500',
        quantity_available: 0,
        manufacturing_cost: 85000,
        selling_price: 195000,
        status: 'Out of Stock'
      }
    ];
    localStorage.setItem(FINISHED_GOOD_KEY, JSON.stringify(defaultFinishedGoods));
  }

  // 4. SEED BILL OF MATERIALS (BOM)
  if (!localStorage.getItem(BOM_KEY)) {
    const defaultBoms: IBom[] = [
      {
        id: 'bom-1',
        product_id: 'fg-1',
        product_name: 'Industrial Stainless Steel Pulverizer 50HP',
        materials: [
          { material_id: 'rm-1', material_name: 'Stainless Steel Sheets (SS-304, 3mm)', quantity_required: 8, uom: 'Sheet' },
          { material_id: 'rm-2', material_name: 'Mild Steel Angle Irons (50x50x5mm)', quantity_required: 12, uom: 'Length' },
          { material_id: 'rm-3', material_name: 'Welding Electrodes Box (E6013, 3.15mm)', quantity_required: 3, uom: 'Box' },
          { material_id: 'rm-5', material_name: 'Heavy Duty Pneumatic Cylinders (80mm bore)', quantity_required: 2, uom: 'Unit' }
        ],
        notes: 'Standard fabrication blueprint layout for heavy commercial food processors.',
        created_date: '2026-03-10T12:00:00Z'
      },
      {
        id: 'bom-2',
        product_id: 'fg-3',
        product_name: 'Steam Jacketed Cooking Vat (300L)',
        materials: [
          { material_id: 'rm-1', material_name: 'Stainless Steel Sheets (SS-304, 3mm)', quantity_required: 5, uom: 'Sheet' },
          { material_id: 'rm-2', material_name: 'Mild Steel Angle Irons (50x50x5mm)', quantity_required: 6, uom: 'Length' },
          { material_id: 'rm-3', material_name: 'Welding Electrodes Box (E6013, 3.15mm)', quantity_required: 2, uom: 'Box' },
          { material_id: 'rm-4', material_name: 'Heating Element Coils (3KW U-Shape)', quantity_required: 3, uom: 'Unit' }
        ],
        notes: 'Boiler vat configurations with high output thermal tubes.',
        created_date: '2026-03-20T14:30:00Z'
      }
    ];
    localStorage.setItem(BOM_KEY, JSON.stringify(defaultBoms));
  }

  // 5. SEED INVENTORY TRANSACTIONS
  if (!localStorage.getItem(INV_TXN_KEY)) {
    const defaultTxns: IInventoryTransaction[] = [
      {
        id: 'txn-1',
        date: '2026-04-10',
        type: 'Stock In',
        quantity: 15,
        item_id: 'rm-1',
        item_name: 'Stainless Steel Sheets (SS-304, 3mm)',
        is_finished_good: false,
        reference_type: 'Purchase',
        reference_no: 'PO-2026-081',
        notes: 'Restocked raw stainless plates from Jindal Warehousing.'
      },
      {
        id: 'txn-2',
        date: '2026-04-15',
        type: 'Consumption',
        quantity: 8,
        item_id: 'rm-1',
        item_name: 'Stainless Steel Sheets (SS-304, 3mm)',
        is_finished_good: false,
        reference_type: 'Production',
        reference_no: 'WIP-JOB-202',
        notes: 'Released structural plates for Pulverizer frame assembly.'
      },
      {
        id: 'txn-3',
        date: '2026-05-18',
        type: 'Production',
        quantity: 1,
        item_id: 'fg-2',
        item_name: 'High-Temp Rotary Deck Oven',
        is_finished_good: true,
        reference_type: 'Production',
        reference_no: 'WIP-JOB-101',
        notes: 'Billed oven unit complete testing signed-off.'
      },
      {
        id: 'txn-4',
        date: '2026-05-18',
        type: 'Stock Out',
        quantity: 1,
        item_id: 'fg-2',
        item_name: 'High-Temp Rotary Deck Oven',
        is_finished_good: true,
        reference_type: 'Order Sale',
        reference_no: 'ORD-2026-002',
        notes: 'Dispatched rotary deck oven machine out for delivery.'
      }
    ];
    localStorage.setItem(INV_TXN_KEY, JSON.stringify(defaultTxns));
  }

  // 6. SEED WIP JOBS
  if (!localStorage.getItem(WIP_JOB_KEY)) {
    const defaultWip: IWipJob[] = [
      {
        id: 'wip-1',
        order_id: 'ord-1',
        order_number: 'ORD-2026-001',
        product_id: 'fg-1',
        product_name: 'Industrial Stainless Steel Pulverizer 50HP',
        quantity: 1,
        current_stage: 'Assembly',
        start_date: '2026-04-12',
        estimated_completion_date: '2026-06-10',
        actual_completion_date: null,
        notes: 'Pulverizer build for Anupam Food. Structural frames completed, mounting motor core.',
        milestones: [
          { stage: 'Material Procurement', timestamp: '2026-04-12T10:00:00Z', notes: 'All plates and angle irons allocated from storage.' },
          { stage: 'Cutting', timestamp: '2026-04-18T14:30:00Z', notes: 'CNC waterjet precision sheets pre-cut absolute measurements.' },
          { stage: 'Welding', timestamp: '2026-04-26T16:00:00Z', notes: 'TIG double pass argon heavy structural welding finished.' },
          { stage: 'Assembly', timestamp: '2026-05-10T11:00:00Z', notes: 'Active assembly phase initiated. Gear housing attached.' }
        ]
      },
      {
        id: 'wip-2',
        order_id: 'ord-4',
        order_number: 'ORD-2026-004',
        product_id: 'fg-4',
        product_name: 'Automatic Flow-Wrap Packaging Frame',
        quantity: 1,
        current_stage: 'Welding',
        start_date: '2026-05-15',
        estimated_completion_date: '2026-06-15',
        actual_completion_date: null,
        notes: 'Regular order job. Mild steel chassis and framework fabrication.',
        milestones: [
          { stage: 'Material Procurement', timestamp: '2026-05-15T09:30:00Z', notes: 'Angle irons, brackets, and sheet panels checked out.' },
          { stage: 'Cutting', timestamp: '2026-05-22T13:15:00Z', notes: 'Lengths saw cut and debugged.' },
          { stage: 'Welding', timestamp: '2026-05-28T10:00:00Z', notes: 'Initiated main joints layout welding.' }
        ]
      }
    ];
    localStorage.setItem(WIP_JOB_KEY, JSON.stringify(defaultWip));
  }
}

// SIMULATED DATABASE API FOR INVENTORY
export const inventoryAPI = {
  // --- Raw Materials ---
  getRawMaterials: (): IRawMaterial[] => {
    initInventoryDatabase();
    return JSON.parse(localStorage.getItem(RAW_MATERIAL_KEY) || '[]');
  },

  saveRawMaterial: (material: IRawMaterial) => {
    const list = inventoryAPI.getRawMaterials();
    const idx = list.findIndex(rm => rm.id === material.id);
    if (idx >= 0) {
      list[idx] = material;
    } else {
      list.unshift(material);
    }
    localStorage.setItem(RAW_MATERIAL_KEY, JSON.stringify(list));
  },

  deleteRawMaterial: (id: string): boolean => {
    const list = inventoryAPI.getRawMaterials();
    const filtered = list.filter(rm => rm.id !== id);
    localStorage.setItem(RAW_MATERIAL_KEY, JSON.stringify(filtered));
    return true;
  },

  // --- Suppliers ---
  getSuppliers: (): ISupplier[] => {
    initInventoryDatabase();
    return JSON.parse(localStorage.getItem(SUPPLIER_KEY) || '[]');
  },

  saveSupplier: (supplier: ISupplier) => {
    const list = inventoryAPI.getSuppliers();
    const idx = list.findIndex(s => s.id === supplier.id);
    if (idx >= 0) {
      list[idx] = supplier;
    } else {
      list.unshift(supplier);
    }
    localStorage.setItem(SUPPLIER_KEY, JSON.stringify(list));
  },

  deleteSupplier: (id: string): boolean => {
    const list = inventoryAPI.getSuppliers();
    const filtered = list.filter(s => s.id !== id);
    localStorage.setItem(SUPPLIER_KEY, JSON.stringify(filtered));
    return true;
  },

  // --- Supplier Ledger Entries ---
  getSupplierLedgers: (supplierId?: string): ISupplierLedgerEntry[] => {
    initInventoryDatabase();
    const all: ISupplierLedgerEntry[] = JSON.parse(localStorage.getItem(SUPP_LEDGER_KEY) || '[]');
    if (supplierId) {
      return all.filter(sl => sl.supplier_id === supplierId).sort((a, b) => b.date.localeCompare(a.date));
    }
    return all.sort((a,b) => b.date.localeCompare(a.date));
  },

  addSupplierLedgerEntry: (entry: ISupplierLedgerEntry) => {
    const all = JSON.parse(localStorage.getItem(SUPP_LEDGER_KEY) || '[]');
    all.unshift(entry);
    localStorage.setItem(SUPP_LEDGER_KEY, JSON.stringify(all));

    // Recompute total outstanding balance for this supplier
    inventoryAPI.recomputeSupplierBalance(entry.supplier_id);
  },

  recomputeSupplierBalance: (supplierId: string) => {
    const ledgers: ISupplierLedgerEntry[] = JSON.parse(localStorage.getItem(SUPP_LEDGER_KEY) || '[]');
    const supplierLedger = ledgers.filter(l => l.supplier_id === supplierId).sort((a, b) => a.date.localeCompare(b.date));
    
    // Debit decreases our balance, Credit increases what we owe to the supplier
    let currentBal = 0;
    const recomputedLedgers = ledgers.map(l => {
      if (l.supplier_id === supplierId) {
        currentBal = parseFloat((currentBal - l.debit + l.credit).toFixed(2));
        l.running_balance = currentBal;
      }
      return l;
    });

    localStorage.setItem(SUPP_LEDGER_KEY, JSON.stringify(recomputedLedgers));

    const suppliers = inventoryAPI.getSuppliers();
    const sIdx = suppliers.findIndex(s => s.id === supplierId);
    if (sIdx >= 0) {
      suppliers[sIdx].outstanding_balance = parseFloat(currentBal.toFixed(2));
      localStorage.setItem(SUPPLIER_KEY, JSON.stringify(suppliers));
    }
  },

  // --- Physical Inventory Transactions ---
  getTransactions: (): IInventoryTransaction[] => {
    initInventoryDatabase();
    return JSON.parse(localStorage.getItem(INV_TXN_KEY) || '[]').sort((a: any, b: any) => b.date.localeCompare(a.date));
  },

  addTransaction: (txn: IInventoryTransaction) => {
    const list = inventoryAPI.getTransactions();
    list.unshift(txn);
    localStorage.setItem(INV_TXN_KEY, JSON.stringify(list));

    // Trigger Side-effects on Stock levels
    if (txn.is_finished_good) {
      const fGoods = inventoryAPI.getFinishedGoods();
      const idx = fGoods.findIndex(fg => fg.id === txn.item_id);
      if (idx >= 0) {
        let current = fGoods[idx].quantity_available;
        if (txn.type === 'Stock In' || txn.type === 'Production' || txn.type === 'Return') {
          current += txn.quantity;
        } else if (txn.type === 'Stock Out' || txn.type === 'Consumption' || txn.type === 'Adjustment') {
          current = Math.max(0, current - txn.quantity);
        }
        fGoods[idx].quantity_available = current;
        fGoods[idx].status = current === 0 
          ? 'Out of Stock' 
          : current <= 1 
            ? 'Low Stock' 
            : 'Available';
        localStorage.setItem(FINISHED_GOOD_KEY, JSON.stringify(fGoods));
      }
    } else {
      const raw = inventoryAPI.getRawMaterials();
      const idx = raw.findIndex(rm => rm.id === txn.item_id);
      if (idx >= 0) {
        let current = raw[idx].current_stock;
        if (txn.type === 'Stock In' || txn.type === 'Return') {
          current += txn.quantity;
        } else if (txn.type === 'Stock Out' || txn.type === 'Consumption' || txn.type === 'Adjustment') {
          current = Math.max(0, current - txn.quantity);
        }
        raw[idx].current_stock = current;
        localStorage.setItem(RAW_MATERIAL_KEY, JSON.stringify(raw));
      }
    }
  },

  // --- Bill Of Materials (BOM) ---
  getBoms: (): IBom[] => {
    initInventoryDatabase();
    return JSON.parse(localStorage.getItem(BOM_KEY) || '[]');
  },

  saveBom: (bom: IBom) => {
    const list = inventoryAPI.getBoms();
    const idx = list.findIndex(b => b.id === bom.id);
    if (idx >= 0) {
      list[idx] = bom;
    } else {
      list.unshift(bom);
    }
    localStorage.setItem(BOM_KEY, JSON.stringify(list));
  },

  deleteBom: (id: string): boolean => {
    const list = inventoryAPI.getBoms();
    const filtered = list.filter(b => b.id !== id);
    localStorage.setItem(BOM_KEY, JSON.stringify(filtered));
    return true;
  },

  // --- Finished Goods ---
  getFinishedGoods: (): IFinishedGood[] => {
    initInventoryDatabase();
    return JSON.parse(localStorage.getItem(FINISHED_GOOD_KEY) || '[]');
  },

  saveFinishedGood: (good: IFinishedGood) => {
    const list = inventoryAPI.getFinishedGoods();
    const idx = list.findIndex(fg => fg.id === good.id);
    if (idx >= 0) {
      list[idx] = good;
    } else {
      list.unshift(good);
    }
    localStorage.setItem(FINISHED_GOOD_KEY, JSON.stringify(list));
  },

  deleteFinishedGood: (id: string): boolean => {
    const list = inventoryAPI.getFinishedGoods();
    const filtered = list.filter(fg => fg.id !== id);
    localStorage.setItem(FINISHED_GOOD_KEY, JSON.stringify(filtered));
    return true;
  },

  // --- WIP Manufacturing Jobs ---
  getWipJobs: (): IWipJob[] => {
    initInventoryDatabase();
    return JSON.parse(localStorage.getItem(WIP_JOB_KEY) || '[]');
  },

  saveWipJob: (wip: IWipJob) => {
    const list = inventoryAPI.getWipJobs();
    const idx = list.findIndex(w => w.id === wip.id);
    if (idx >= 0) {
      list[idx] = wip;
    } else {
      list.unshift(wip);
    }
    localStorage.setItem(WIP_JOB_KEY, JSON.stringify(list));
  },

  deleteWipJob: (id: string): boolean => {
    const list = inventoryAPI.getWipJobs();
    const filtered = list.filter(w => w.id !== id);
    localStorage.setItem(WIP_JOB_KEY, JSON.stringify(filtered));
    return true;
  },

  // ==========================================
  // INVENTORY AUTOMATED WORKFLOW TRIGGERS
  // ==========================================

  // 1. RAW MATERIAL PURCHASE WORKFLOW
  triggerPurchaseWorkflow: (params: {
    materialId: string;
    supplierId: string;
    quantity: number;
    billingCost: number; // total cost
    referenceNo: string;
    notes: string;
  }) => {
    const materials = inventoryAPI.getRawMaterials();
    const material = materials.find(m => m.id === params.materialId);
    if (!material) throw new Error('Material not found');

    const suppliers = inventoryAPI.getSuppliers();
    const supplier = suppliers.find(s => s.id === params.supplierId);
    if (!supplier) throw new Error('Supplier not found');

    const todayStr = new Date().toISOString().split('T')[0];

    // Block A: stock-in transaction
    const txn: IInventoryTransaction = {
      id: `txn-${Math.random().toString(36).substr(2, 9)}`,
      date: todayStr,
      type: 'Stock In',
      quantity: params.quantity,
      item_id: material.id,
      item_name: material.name,
      is_finished_good: false,
      reference_type: 'Purchase',
      reference_no: params.referenceNo,
      notes: params.notes || `Stock In purchase of ${params.quantity} ${material.uom}s from ${supplier.name}`
    };
    inventoryAPI.addTransaction(txn);

    // Block B: update Supplier Ledger (credit because we owe them)
    const ledgerEntry: ISupplierLedgerEntry = {
      id: `sl-${Math.random().toString(36).substr(2, 9)}`,
      supplier_id: supplier.id,
      date: todayStr,
      type: 'Purchase Invoice',
      reference_no: params.referenceNo,
      description: `Purchase: ${params.quantity} x ${material.name} @ ₹${(params.billingCost / params.quantity).toFixed(2)}`,
      debit: 0,
      credit: params.billingCost,
      running_balance: 0 // Will auto recompute
    };
    inventoryAPI.addSupplierLedgerEntry(ledgerEntry);
  },

  // 2. PRODUCTION START WORKFLOW (WIP start)
  triggerProductionStart: (params: {
    productId: string;
    quantity: number;
    estimatedCompletion: string;
    orderId?: string | null;
    orderNo?: string | null;
    notes: string;
  }): IWipJob => {
    const finishedGoods = inventoryAPI.getFinishedGoods();
    const product = finishedGoods.find(fg => fg.id === params.productId);
    if (!product) throw new Error('Finished Product not found');

    const boms = inventoryAPI.getBoms();
    const bom = boms.find(b => b.product_id === product.id);
    const todayStr = new Date().toISOString().split('T')[0];

    // Create active WIP Job and initial stage 'Material Procurement'
    const newWip: IWipJob = {
      id: `wip-${Math.random().toString(36).substr(2, 9)}`,
      order_id: params.orderId || null,
      order_number: params.orderNo || null,
      product_id: product.id,
      product_name: product.name,
      quantity: params.quantity,
      current_stage: 'Material Procurement',
      start_date: todayStr,
      estimated_completion_date: params.estimatedCompletion,
      actual_completion_date: null,
      notes: params.notes,
      milestones: [
        {
          stage: 'Material Procurement',
          timestamp: new Date().toISOString(),
          notes: 'Production job started. Material checklist verification initiated.'
        }
      ]
    };

    // If BOM exists, auto-consume the raw materials!
    if (bom) {
      bom.materials.forEach(bomMat => {
        const totalNeeded = bomMat.quantity_required * params.quantity;
        
        // Post consumption transaction
        const useTxn: IInventoryTransaction = {
          id: `txn-${Math.random().toString(36).substr(2, 9)}`,
          date: todayStr,
          type: 'Consumption',
          quantity: totalNeeded,
          item_id: bomMat.material_id,
          item_name: bomMat.material_name,
          is_finished_good: false,
          reference_type: 'Production',
          reference_no: newWip.id,
          notes: `BOM deployment: consumed ${totalNeeded} units for ${params.quantity}x ${product.name}`
        };
        inventoryAPI.addTransaction(useTxn);
      });
    }

    // Save Job
    inventoryAPI.saveWipJob(newWip);
    return newWip;
  },

  // 3. WIP STAGE CHANGE
  triggerWipStageChange: (wipId: string, nextStage: WipStage, milestoneNotes: string) => {
    const list = inventoryAPI.getWipJobs();
    const idx = list.findIndex(w => w.id === wipId);
    if (idx < 0) throw new Error('Wip Job not found');

    const job = list[idx];
    job.current_stage = nextStage;
    job.milestones.push({
      stage: nextStage,
      timestamp: new Date().toISOString(),
      notes: milestoneNotes || `Advanced to stage: ${nextStage}`
    });

    // 4. PRODUCTION COMPLETION WORKFLOW (When changed to 'Ready' or completed)
    if (nextStage === 'Ready') {
      job.actual_completion_date = new Date().toISOString().split('T')[0];

      // Add finished good to storage
      const finishedTxn: IInventoryTransaction = {
        id: `txn-${Math.random().toString(36).substr(2, 9)}`,
        date: job.actual_completion_date,
        type: 'Production',
        quantity: job.quantity,
        item_id: job.product_id,
        item_name: job.product_name,
        is_finished_good: true,
        reference_type: 'Production',
        reference_no: job.id,
        notes: `WIP completion record: Produced ${job.quantity} units of ${job.product_name}`
      };
      inventoryAPI.addTransaction(finishedTxn);
    }

    inventoryAPI.saveWipJob(job);
  },

  // 5. PRODUCT DELIVERY WORKFLOW (Finished Goods direct delivery or sale)
  triggerProductDelivery: (params: {
    productId: string;
    quantity: number;
    referenceNo: string;
    notes: string;
  }) => {
    const finishedGoods = inventoryAPI.getFinishedGoods();
    const p = finishedGoods.find(fg => fg.id === params.productId);
    if (!p) throw new Error('Finished Product not found');
    if (p.quantity_available < params.quantity) {
      throw new Error(`Insufficient Finished Product Stock! Available: ${p.quantity_available}, Requested: ${params.quantity}`);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const sellTxn: IInventoryTransaction = {
      id: `txn-${Math.random().toString(36).substr(2, 9)}`,
      date: todayStr,
      type: 'Stock Out',
      quantity: params.quantity,
      item_id: p.id,
      item_name: p.name,
      is_finished_good: true,
      reference_type: 'Order Sale',
      reference_no: params.referenceNo,
      notes: params.notes || `Dispatched ${params.quantity} units for reference: ${params.referenceNo}`
    };

    inventoryAPI.addTransaction(sellTxn);
  },

  // Supplier cash ledger payment out
  triggerSupplierPayment: (params: {
    supplierId: string;
    amount: number;
    referenceNo: string;
    date: string;
    notes: string;
  }) => {
    const ledgerEntry: ISupplierLedgerEntry = {
      id: `sl-${Math.random().toString(36).substr(2, 9)}`,
      supplier_id: params.supplierId,
      date: params.date,
      type: 'Payment Out',
      reference_no: params.referenceNo,
      description: `PaymentOut: Released cash/online transfer. ${params.notes}`,
      debit: params.amount, // debit reduces what we owe
      credit: 0,
      running_balance: 0
    };
    inventoryAPI.addSupplierLedgerEntry(ledgerEntry);
  }
};
