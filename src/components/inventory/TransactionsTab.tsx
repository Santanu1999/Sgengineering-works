import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  Layers, 
  ArrowRight,
  TrendingUp,
  DollarSign,
  Briefcase,
  AlertTriangle
} from 'lucide-react';
import { inventoryAPI } from '../../data/inventory-database';
import { IInventoryTransaction, IRawMaterial, ISupplier } from '../../types/inventory.interface';

interface TransactionsTabProps {
  materials: IRawMaterial[];
  suppliers: ISupplier[];
}

type ReportType = 'val_stock' | 'outstanding' | 'production_wip';

export default function TransactionsTab({ materials, suppliers }: TransactionsTabProps) {
  const [txns, setTxns] = useState<IInventoryTransaction[]>(() => inventoryAPI.getTransactions());
  
  // Search state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All'); // 'All' | 'Stock In' | 'Stock Out' | 'Consumption' | 'Production' | 'Adjustment' | 'Return'
  const [selectedItemType, setSelectedItemType] = useState('All'); // 'All' | 'Raw' | 'Finished'

  // Reports Active Tab Selector
  const [activeReport, setActiveReport] = useState<ReportType>('val_stock');

  // Filter Transactions list
  const filteredTxns = useMemo(() => {
    return txns.filter(t => {
      const matchSearch = t.item_name.toLowerCase().includes(search.toLowerCase()) ||
                          t.reference_no.toLowerCase().includes(search.toLowerCase()) ||
                          t.notes.toLowerCase().includes(search.toLowerCase());

      const matchType = selectedType === 'All' || t.type === selectedType;

      const matchItemType = selectedItemType === 'All' || 
                           (selectedItemType === 'Finished' && t.is_finished_good) ||
                           (selectedItemType === 'Raw' && !t.is_finished_good);

      return matchSearch && matchType && matchItemType;
    });
  }, [txns, search, selectedType, selectedItemType]);

  // Export report workbook simulation
  const handleExportSimulated = (title: string) => {
    alert(`🎉 Report Export initiated successfully!\nDownloading document: "${title}_${new Date().toISOString().split('T')[0]}.csv"\nAll processed registers compiled safely into offline workbook formatting.`);
  };

  // --- Dynamic calculations to render in analytical reports ----
  const calculatedValuationData = useMemo(() => {
    return materials.map(m => {
      const value = m.current_stock * m.purchase_cost;
      return {
        code: m.code,
        name: m.name,
        category: m.category,
        stock: m.current_stock,
        uom: m.uom,
        unitCost: m.purchase_cost,
        valuation: value,
        status: m.current_stock <= m.minimum_stock ? '⚠️ Low Stock' : '✅ Safe Stock'
      };
    });
  }, [materials]);

  const totalCalculatedStockValue = useMemo(() => {
    return calculatedValuationData.reduce((sum, item) => sum + item.valuation, 0);
  }, [calculatedValuationData]);

  // WIP active schedule simulation from db
  const wipJobs = useMemo(() => {
    return inventoryAPI.getWipJobs();
  }, []);

  return (
    <div className="space-y-8 font-sans">
      
      {/* SECTION 1: MASTER TRANSACTIONS AUDIT TRAIL */}
      <div className="bg-[#111625] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        
        {/* Title specs */}
        <div className="p-4 bg-slate-950/20 border-b border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <History className="w-4.5 h-4.5 text-blue-400" />
            <h4 className="text-xs font-serif font-bold text-white tracking-widest uppercase">Chronological Stock Audit Trails</h4>
          </div>
          <span className="text-3xs font-mono text-slate-500 font-bold whitespace-nowrap">Immutable factory transaction records tracker</span>
        </div>

        {/* Filter input controls */}
        <div className="p-4 border-b border-slate-850 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/10 text-xs">
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search transaction catalog material, bill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[11px] pl-8 pr-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-xl text-[11.5px]">
            <span className="text-slate-500 font-mono">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer w-full font-bold"
            >
              <option value="All">All Types</option>
              <option value="Stock In">➕ Stock In</option>
              <option value="Stock Out">➖ Stock Out / Dispatches</option>
              <option value="Consumption">⚡ Production Consumption</option>
              <option value="Production">⚙️ Workshop yield Stock In</option>
              <option value="Adjustment">🔧 Audit Manual override</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-xl text-[11.5px]">
            <span className="text-slate-500 font-mono">Stores:</span>
            <select
              value={selectedItemType}
              onChange={(e) => setSelectedItemType(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer w-full font-bold"
            >
              <option value="All">Entire Stores (RM + FG)</option>
              <option value="Raw">Raw material stock sheets</option>
              <option value="Finished">Finished custom machinery catalog</option>
            </select>
          </div>

        </div>

        {/* Audit table logs */}
        <div className="overflow-x-auto">
          {/* DESKTOP VIEW */}
          <table className="hidden md:table w-full text-left text-xs text-slate-300 border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-mono text-3xs uppercase tracking-wider sticky top-0 border-b border-slate-850">
                <th className="p-3">Sequence Date</th>
                <th className="p-3">Operational Type</th>
                <th className="p-3">Material Billed</th>
                <th className="p-3">Register Scope</th>
                <th className="p-3 text-right">Quantity Changed</th>
                <th className="p-3">Reference Ref</th>
                <th className="p-3">Log Annotations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredTxns.map((t) => (
                <tr key={t.id} className="hover:bg-slate-900/50 text-[11px] font-sans">
                  <td className="p-3 text-slate-500 whitespace-nowrap font-mono">{t.date}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono leading-none ${
                      t.type === 'Stock In' || t.type === 'Production' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-200">{t.item_name}</td>
                  <td className="p-3 font-mono text-slate-400 text-3xs uppercase">
                    {t.is_finished_good ? 'Finished Good (FG)' : 'Raw Material (RM)'}
                  </td>
                  <td className={`p-3 text-right font-mono font-bold ${
                    t.type === 'Stock In' || t.type === 'Production' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {t.type === 'Stock In' || t.type === 'Production' ? '+' : '-'}{t.quantity}
                  </td>
                  <td className="p-3 font-semibold text-blue-400 font-mono">{t.reference_no}</td>
                  <td className="p-3 text-slate-400 line-clamp-1 max-w-[200px]" title={t.notes}>
                    {t.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* MOBILE ADAPTIVE CARD VIEW */}
          <div className="md:hidden space-y-3 p-1">
            {filteredTxns.map((t) => {
              const isAdded = t.type === 'Stock In' || t.type === 'Production';
              return (
                <div key={t.id} className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2.5 shadow-md">
                  <div className="flex justify-between items-center text-3xs font-mono">
                    <span className="text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">{t.date}</span>
                    <span className={`px-1.5 py-0.5 rounded leading-none ${
                      isAdded ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>{t.type}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5">
                      <h5 className="text-xs font-bold text-slate-200">{t.item_name}</h5>
                      <span className="text-[9px] uppercase font-mono text-slate-500 tracking-wider">
                        {t.is_finished_good ? 'Finished Good (FG)' : 'Raw Material (RM)'}
                      </span>
                    </div>
                    <span className={`font-mono text-sm font-bold shrink-0 ${isAdded ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isAdded ? '+' : '-'}{t.quantity}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-900/60 flex justify-between items-center text-3xs font-mono">
                    <span className="text-blue-400 font-semibold">Ref: {t.reference_no}</span>
                    <span className="text-slate-500 truncate max-w-[150px]" title={t.notes}>{t.notes}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTxns.length === 0 && (
            <div className="text-center py-10 text-slate-500 italic font-mono text-xs">
              No chronological audits matched filters
            </div>
          )}
        </div>

      </div>

      {/* SECTION 2: ANALYTICAL REPORT WORKBOOKS (3-TABS ACCORDION) */}
      <div className="bg-[#111625] border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
        
        {/* Title & PDF Export */}
        <div className="p-4 bg-slate-950/20 border-b border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-400" />
            <h4 className="text-xs font-serif font-black text-white tracking-wider uppercase">FACTORY DISPATCH REPORTS HARNESS</h4>
          </div>
          <button
            onClick={() => handleExportSimulated(activeReport === 'val_stock' ? 'Material_Valuations_Audit' : activeReport === 'outstanding' ? 'Suppliers_Dues_Statement' : 'WIP_Daily_Runs_Docket')}
            className="p-1.5 px-3 self-end bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-300 font-mono font-black text-2xs cursor-pointer rounded-lg flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>EXPORT WORKBOOK</span>
          </button>
        </div>

        {/* Tab Selection Segments */}
        <div className="flex border-b border-slate-850 bg-slate-900/30 text-xs font-mono">
          <button 
            onClick={() => setActiveReport('val_stock')}
            className={`flex-1 py-3 text-center transition border-b-2 font-semibold cursor-pointer ${
              activeReport === 'val_stock' ? 'border-blue-500 text-blue-400 font-black' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 RM Stock Valuations
          </button>
          <button 
            onClick={() => setActiveReport('outstanding')}
            className={`flex-1 py-3 text-center transition border-b-2 font-semibold cursor-pointer ${
              activeReport === 'outstanding' ? 'border-orange-500 text-orange-400 font-black' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🤝 Suppliers Credit Balance
          </button>
          <button 
            onClick={() => setActiveReport('production_wip')}
            className={`flex-1 py-3 text-center transition border-b-2 font-semibold cursor-pointer ${
              activeReport === 'production_wip' ? 'border-violet-500 text-violet-400 font-black' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚙️ Workshop WIP yield schedules
          </button>
        </div>

        {/* Display sheets contents */}
        <div className="p-4 bg-slate-900/10">
          
          {/* Valuations sheets */}
          {activeReport === 'val_stock' && (
            <div className="space-y-4">
              <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-850 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Inventory assets investment profile (Materials total summation):</span>
                <strong className="text-emerald-400 font-black text-sm">₹{totalCalculatedStockValue.toLocaleString('en-IN')}</strong>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-mono text-[9px] uppercase tracking-wider border-b border-slate-850">
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5">Material Component</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">In-Stock On Hand</th>
                      <th className="p-2.5 text-right">UOM purchase cost</th>
                      <th className="p-2.5 text-right">Aggregate value (₹)</th>
                      <th className="p-2.5">Buffer warning indices</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {calculatedValuationData.map((le) => (
                      <tr key={le.code} className="hover:bg-slate-950/30 text-[11px]">
                        <td className="p-2.5 font-mono text-slate-400">{le.code}</td>
                        <td className="p-2.5 font-bold text-slate-200">{le.name}</td>
                        <td className="p-2.5 text-slate-400 font-mono text-3xs uppercase">{le.category}</td>
                        <td className="p-2.5 text-right font-semibold text-slate-300 font-mono">{le.stock} {le.uom}s</td>
                        <td className="p-2.5 text-right text-slate-400 font-mono">₹{le.unitCost.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-200">₹{le.valuation.toLocaleString('en-IN')}</td>
                        <td className="p-2.5">
                          <span className={`${le.status.includes('⚠️') ? 'text-red-400 font-semibold' : 'text-emerald-500'} font-mono text-[10px]`}>
                            {le.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Supplier dues sheet */}
          {activeReport === 'outstanding' && (
            <div className="space-y-4">
              <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-850 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Total verified Purchasing Dues Owed to Merchants:</span>
                <strong className="text-red-400 font-bold text-sm">
                  ₹{suppliers.reduce((sum, s) => sum + s.outstanding_balance, 0).toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-mono text-[9px] uppercase tracking-wider border-b border-slate-850">
                      <th className="p-2.5">Supplier Name</th>
                      <th className="p-2.5">Accounts Officer</th>
                      <th className="p-2.5 font-mono">Contact Executives Number</th>
                      <th className="p-2.5">GST Number Ref</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Outstanding balance We Owe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {suppliers.map((supp) => (
                      <tr key={supp.id} className="hover:bg-slate-950/30 text-[11px]">
                        <td className="p-2.5 font-bold text-slate-200">{supp.name}</td>
                        <td className="p-2.5 text-slate-300">{supp.contact_person}</td>
                        <td className="p-2.5 text-slate-400 font-mono">{supp.mobile}</td>
                        <td className="p-2.5 text-slate-400 font-mono uppercase">{supp.gst_number || 'Cash Only'}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono leading-none uppercase ${
                            supp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {supp.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-400">
                          ₹{supp.outstanding_balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WIP Foundry schedule sheet */}
          {activeReport === 'production_wip' && (
            <div className="space-y-4">
              <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-850 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Total Fabrication orders active on floor:</span>
                <strong className="text-violet-400 font-black text-sm">{wipJobs.filter(w => w.current_stage !== 'Ready').length} runs</strong>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[550px]">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-mono text-[9px] uppercase tracking-wider border-b border-slate-850">
                      <th className="p-2.5">Product under fabrication</th>
                      <th className="p-2.5">Overage Token Reference</th>
                      <th className="p-2.5 text-right">Output target batch</th>
                      <th className="p-2.5">Launch on floor</th>
                      <th className="p-2.5">Est Delivery schedule</th>
                      <th className="p-2.5">Current floor stage status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {wipJobs.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-950/30 text-[11px]">
                        <td className="p-2.5 font-bold text-slate-200">{w.product_name}</td>
                        <td className="p-2.5 font-mono text-blue-400">{w.order_number || 'MANUAL RUN'}</td>
                        <td className="p-2.5 text-right font-mono text-slate-300 font-bold">{w.quantity} units</td>
                        <td className="p-2.5 font-mono text-slate-500">{w.start_date}</td>
                        <td className="p-2.5 font-mono text-slate-400">{w.estimated_completion_date}</td>
                        <td className="p-2.5">
                          <span className="text-[11px] font-mono text-violet-400 font-semibold uppercase">{w.current_stage}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
