import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Handshake, 
  TrendingUp, 
  Wrench, 
  CheckCircle, 
  History, 
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { inventoryAPI, initInventoryDatabase } from '../data/inventory-database';

// Imports of Tab Panels
import InventoryDashboard from './inventory/InventoryDashboard';
import RawMaterialsTab from './inventory/RawMaterialsTab';
import SuppliersTab from './inventory/SuppliersTab';
import BomTab from './inventory/BomTab';
import WipTab from './inventory/WipTab';
import FinishedGoodsTab from './inventory/FinishedGoodsTab';
import TransactionsTab from './inventory/TransactionsTab';

// Trigger initial seed structures
initInventoryDatabase();

export default function InventoryModule() {
  const [activeSubTab, setActiveSubTab] = useState<string>('overview');
  
  // Real-time synchronizer key
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Re-fetch materials and suppliers on key change to keep lists in sync
  const materials = useMemo(() => {
    return inventoryAPI.getRawMaterials();
  }, [refreshKey]);

  const suppliers = useMemo(() => {
    return inventoryAPI.getSuppliers();
  }, [refreshKey]);

  const finishedGoods = useMemo(() => {
    return inventoryAPI.getFinishedGoods();
  }, [refreshKey]);

  // Handle Quick Actions initiated from the dashboard overview tab
  const handleDashboardQuickAction = (actionType: 'purchase' | 'wip' | 'sale') => {
    if (actionType === 'purchase') {
      setActiveSubTab('suppliers');
    } else if (actionType === 'wip') {
      setActiveSubTab('wip');
    } else if (actionType === 'sale') {
      setActiveSubTab('finished_goods');
    }
  };

  return (
    <div className="flex-1 md:overflow-hidden flex flex-col bg-slate-950 font-sans pb-10 p-4 md:p-6 space-y-6">
      
      {/* MODULE MAIN HERO BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 bg-gradient-to-r from-blue-950/20 via-[#0c101b]/50 to-indigo-950/20 border border-slate-850 p-5 rounded-2xl">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-serif font-black text-white flex items-center space-x-2 animate-fade-in">
            <Sparkles className="w-5 md:w-6 h-5 md:h-6 text-indigo-400 shrink-0" />
            <span>Industrial Inventory Hub</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Factory raw material profile buffers, merchant ledger entries, automated BOM recipe plans, and WIP timelines.
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 font-mono text-[10px] text-slate-400 text-center shrink-0">
          <span>Active Warehouse Database:</span>
          <p className="text-xs font-bold text-emerald-400 font-mono">SQLite Simul Link</p>
        </div>
      </div>

      {/* HORIZONTAL MINI TAB ROUTER TABS */}
      <div className="flex items-center space-x-1.5 overflow-x-auto bg-slate-900/60 border border-slate-850 p-1 rounded-xl shrink-0 custom-scrollbar pr-2 whitespace-nowrap">
        {[
          { key: 'overview', label: '📊 Shop Overview' },
          { key: 'raw_materials', label: '📦 Raw Materials' },
          { key: 'suppliers', label: '🤝 Suppliers Directory' },
          { key: 'bom', label: '📋 BOM Recipes' },
          { key: 'wip', label: '⚙️ WIP Foundry' },
          { key: 'finished_goods', label: '🏆 Finished Goods' },
          { key: 'audit_trail', label: '📜 Audit & Reports' }
        ].map((tab) => {
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition flex items-center space-x-1 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE SUBMODULE DESK (SCROLLS DYNAMICALLY) */}
      <div className="flex-1 md:overflow-y-auto custom-scrollbar animate-fade-in bg-[#080d16]/30 border border-slate-900 rounded-2xl p-4 md:p-5 min-h-[400px]">
        {activeSubTab === 'overview' && (
          <InventoryDashboard 
            onNavigate={(tab) => setActiveSubTab(tab)} 
            onQuickAction={handleDashboardQuickAction} 
          />
        )}
        
        {activeSubTab === 'raw_materials' && (
          <RawMaterialsTab 
            suppliers={suppliers} 
            onRefresh={handleRefresh} 
          />
        )}

        {activeSubTab === 'suppliers' && (
          <SuppliersTab 
            onRefresh={handleRefresh} 
          />
        )}

        {activeSubTab === 'bom' && (
          <BomTab 
            finishedGoods={finishedGoods} 
            materials={materials} 
            onRefresh={handleRefresh} 
          />
        )}

        {activeSubTab === 'wip' && (
          <WipTab 
            finishedGoods={finishedGoods} 
            onRefresh={handleRefresh} 
          />
        )}

        {activeSubTab === 'finished_goods' && (
          <FinishedGoodsTab 
            onRefresh={handleRefresh} 
          />
        )}

        {activeSubTab === 'audit_trail' && (
          <TransactionsTab 
            materials={materials} 
            suppliers={suppliers} 
          />
        )}
      </div>

    </div>
  );
}
