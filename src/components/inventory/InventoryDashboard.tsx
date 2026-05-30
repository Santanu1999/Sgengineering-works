import React, { useMemo } from 'react';
import { 
  Package, 
  Handshake, 
  TrendingUp, 
  AlertTriangle, 
  Wrench, 
  CheckCircle, 
  History, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Play
} from 'lucide-react';
import { inventoryAPI } from '../../data/inventory-database';

interface InventoryDashboardProps {
  onNavigate: (tab: string) => void;
  onQuickAction: (actionType: 'purchase' | 'wip' | 'sale') => void;
}

export default function InventoryDashboard({ onNavigate, onQuickAction }: InventoryDashboardProps) {
  const materials = useMemo(() => inventoryAPI.getRawMaterials(), []);
  const suppliers = useMemo(() => inventoryAPI.getSuppliers(), []);
  const finishedGoods = useMemo(() => inventoryAPI.getFinishedGoods(), []);
  const wipJobs = useMemo(() => inventoryAPI.getWipJobs(), []);
  const txns = useMemo(() => inventoryAPI.getTransactions(), []);

  // Real-time Calculators
  const totalRawMaterialsCount = materials.length;
  const totalSuppliersCount = suppliers.length;

  const totalInventoryValue = useMemo(() => {
    const rawVal = materials.reduce((sum, rm) => sum + (rm.current_stock * rm.purchase_cost), 0);
    const fgVal = finishedGoods.reduce((sum, fg) => sum + (fg.quantity_available * fg.manufacturing_cost), 0);
    return rawVal + fgVal;
  }, [materials, finishedGoods]);

  const lowStockCount = useMemo(() => {
    return materials.filter(rm => rm.current_stock <= rm.minimum_stock).length;
  }, [materials]);

  const activeWipCount = useMemo(() => {
    return wipJobs.filter(w => w.current_stage !== 'Ready').length;
  }, [wipJobs]);

  const finishedGoodsAvailableCount = useMemo(() => {
    return finishedGoods.reduce((sum, fg) => sum + fg.quantity_available, 0);
  }, [finishedGoods]);

  return (
    <div className="space-y-6">
      {/* KPI Display Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Value */}
        <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg hover:border-blue-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Total Stock Value</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-mono font-bold text-slate-100">
              ₹{totalInventoryValue.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Raw materials + finished goods
            </p>
          </div>
        </div>

        {/* KPI 2: Deficits */}
        <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg hover:border-red-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Low Stock Warnings</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-mono font-bold ${lowStockCount > 0 ? 'text-red-400' : 'text-slate-100'}`}>
              {lowStockCount} Items
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Below configured buffer index
            </p>
          </div>
        </div>

        {/* KPI 3: WIP Jobs */}
        <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg hover:border-violet-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">WIP Active Foundry</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-mono font-bold text-slate-100">
              {activeWipCount} Active
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Parts actively being machined
            </p>
          </div>
        </div>

        {/* KPI 4: FG Inventory */}
        <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Finished Goods Available</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-mono font-bold text-slate-100">
              {finishedGoodsAvailableCount} Units
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Tested machines ready for dispatch
            </p>
          </div>
        </div>
      </div>

      {/* QUICK INVENTORY ACTIONS ROW */}
      <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-3.5">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
          Factory Core Operations & Real-time Workflows
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onQuickAction('purchase')}
            className="flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/30 rounded-xl cursor-pointer text-left transition group"
          >
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-200 font-sans flex items-center space-x-1.5">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Supplier Purchase (Stock-In)</span>
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                Receive materials, update ledger, recalculate outstanding balances automatically.
              </p>
            </div>
            <Plus className="w-5 h-5 text-slate-500 group-hover:text-blue-400 shrink-0 ml-2" />
          </button>

          <button
            onClick={() => onQuickAction('wip')}
            className="flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-violet-500/30 rounded-xl cursor-pointer text-left transition group"
          >
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-200 font-sans flex items-center space-x-1.5">
                <Play className="w-4 h-4 text-violet-400 shrink-0 animate-pulse" />
                <span>Trigger Job Production (WIP)</span>
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                Load recipe blueprints, auto-consume components, spawn tracking timeline cards.
              </p>
            </div>
            <Plus className="w-5 h-5 text-slate-500 group-hover:text-violet-400 shrink-0 ml-2" />
          </button>

          <button
            onClick={() => onQuickAction('sale')}
            className="flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 rounded-xl cursor-pointer text-left transition group"
          >
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-200 font-sans flex items-center space-x-1.5">
                <ArrowUpRight className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Finished Goods Sale (Stock-Out)</span>
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                Deliver custom machinery, reduce stores stock, post chronological sales transaction record.
              </p>
            </div>
            <Plus className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 shrink-0 ml-2" />
          </button>
        </div>
      </div>

      {/* Grid: 2 columns for auxiliary statistics & transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Component A: Quick Counters */}
        <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Internal Ledger Directories Overview
          </h4>
          <div className="space-y-3">
            <div 
              onClick={() => onNavigate('raw_materials')}
              className="p-3 bg-slate-900 border border-slate-850 hover:border-slate-750 transition rounded-xl flex items-center justify-between text-xs cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <Package className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-slate-300">Raw Plate & Element Stores</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-mono text-[11px]">{totalRawMaterialsCount} profiles</span>
                <span className="text-slate-600 font-mono group-hover:text-slate-300 transition">→</span>
              </div>
            </div>

            <div 
              onClick={() => onNavigate('suppliers')}
              className="p-3 bg-slate-900 border border-slate-850 hover:border-slate-750 transition rounded-xl flex items-center justify-between text-xs cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <Handshake className="w-4 h-4 text-orange-400" />
                <span className="font-semibold text-slate-300">Supplier Ledger Accounts</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-mono text-[11px]">{totalSuppliersCount} merchants</span>
                <span className="text-slate-600 font-mono group-hover:text-slate-300 transition">→</span>
              </div>
            </div>

            <div 
              onClick={() => onNavigate('wip')}
              className="p-3 bg-slate-900 border border-slate-850 hover:border-slate-750 transition rounded-xl flex items-center justify-between text-xs cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <Wrench className="w-4 h-4 text-violet-400" />
                <span className="font-semibold text-slate-300">Active WIP Jobs Foundry</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-mono text-[11px]">{wipJobs.length} active bills</span>
                <span className="text-slate-600 font-mono group-hover:text-slate-300 transition">→</span>
              </div>
            </div>
          </div>
        </div>

        {/* Component B: Recent transactions */}
        <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Live Store Audit Transactions Log
            </h4>
            <button 
              onClick={() => onNavigate('audit_trail')}
              className="text-[10px] font-mono text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              Examine Audit
            </button>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[160px] pr-1">
            {txns.slice(0, 4).map((t, idx) => (
              <div key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 flex items-center justify-between text-[11px]">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      t.type === 'Stock In' || t.type === 'Production' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}></span>
                    <strong className="text-slate-200">{t.item_name}</strong>
                  </div>
                  <div className="text-slate-400 text-3xs font-mono">
                    Type: <span className="text-slate-300 font-semibold">{t.type}</span> | Ref: <span className="text-blue-400">{t.reference_no}</span>
                  </div>
                </div>
                <div className={`font-mono font-bold ${
                  t.type === 'Stock In' || t.type === 'Production' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {t.type === 'Stock In' || t.type === 'Production' ? '+' : '-'}{t.quantity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
