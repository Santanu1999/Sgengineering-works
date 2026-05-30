import React, { useState, useMemo } from 'react';
import { 
  CheckCircle, 
  Plus, 
  Search, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  DollarSign, 
  TrendingUp,
  PackageCheck,
  ArrowUpDown
} from 'lucide-react';
import { inventoryAPI } from '../../data/inventory-database';
import { IFinishedGood } from '../../types/inventory.interface';

interface FinishedGoodsTabProps {
  onRefresh: () => void;
}

export default function FinishedGoodsTab({ onRefresh }: FinishedGoodsTabProps) {
  const [finishedGoods, setFinishedGoods] = useState<IFinishedGood[]>(() => inventoryAPI.getFinishedGoods());
  const [search, setSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All'); // 'All' | 'Available' | 'Low Stock' | 'Out of Stock'
  
  // Modals statuses
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);

  // Forms Fields
  const [editGood, setEditGood] = useState<IFinishedGood | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCost, setFormCost] = useState(0);
  const [formSelling, setFormSelling] = useState(0);

  // Sale dispatch fields
  const [sellTarget, setSellTarget] = useState<IFinishedGood | null>(null);
  const [sellQty, setSellQty] = useState(1);
  const [sellInvoiceRef, setSellInvoiceRef] = useState('');
  const [sellNotes, setSellNotes] = useState('');

  const refreshList = () => {
    setFinishedGoods(inventoryAPI.getFinishedGoods());
    onRefresh();
  };

  const filteredGoods = useMemo(() => {
    return finishedGoods.filter(fg => {
      const matchSearch = fg.name.toLowerCase().includes(search.toLowerCase()) ||
                          fg.code.toLowerCase().includes(search.toLowerCase());

      const matchStatus = selectedStatusFilter === 'All' || fg.status === selectedStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [finishedGoods, search, selectedStatusFilter]);

  const totalCatalogValuation = useMemo(() => {
    return filteredGoods.reduce((sum, fg) => sum + (fg.quantity_available * fg.manufacturing_cost), 0);
  }, [filteredGoods]);

  const handleSaveGood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) return;

    const savedGood: IFinishedGood = {
      id: editGood ? editGood.id : `fg-${Math.random().toString(36).substr(2, 9)}`,
      name: formName,
      code: formCode,
      quantity_available: editGood ? editGood.quantity_available : 0, // initially 0, updated by WIP ready completed
      manufacturing_cost: Number(formCost),
      selling_price: Number(formSelling),
      status: editGood ? editGood.status : 'Out of Stock'
    };

    inventoryAPI.saveFinishedGood(savedGood);
    setIsFormOpen(false);
    refreshList();
  };

  const handleOpenCreateGood = () => {
    setEditGood(null);
    setFormName('');
    setFormCode(`FG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`);
    setFormCost(1000);
    setFormSelling(2500);
    setIsFormOpen(true);
  };

  const handleOpenEditGood = (fg: IFinishedGood) => {
    setEditGood(fg);
    setFormName(fg.name);
    setFormCode(fg.code);
    setFormCost(fg.manufacturing_cost);
    setFormSelling(fg.selling_price);
    setIsFormOpen(true);
  };

  const handleDeleteGood = (id: string) => {
    if (confirm('Deletes finished product profile?')) {
      try {
        inventoryAPI.deleteFinishedGood(id);
        refreshList();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Dispatch sales stock out modal
  const handleOpenSell = (fg: IFinishedGood) => {
    if (fg.quantity_available <= 0) {
      alert('This dispatch is locked out! 0 available in inventory stores. Manufacture or complete active WIP jobs first.');
      return;
    }
    setSellTarget(fg);
    setSellQty(1);
    setSellInvoiceRef(`DIS-${Math.random().toString(36).substr(2, 5).toUpperCase()}`);
    setSellNotes('');
    setIsSellOpen(true);
  };

  const handleProcessSell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellTarget) return;

    if (sellQty > sellTarget.quantity_available) {
      alert(`Insufficient product quantities! Store only has ${sellTarget.quantity_available} units.`);
      return;
    }

    // Trigger API dispatch workflow
    inventoryAPI.triggerProductDelivery({
      productId: sellTarget.id,
      quantity: Number(sellQty),
      referenceNo: sellInvoiceRef,
      notes: sellNotes || 'Sales release dispatches'
    });

    setIsSellOpen(false);
    refreshList();
  };

  return (
    <div className="space-y-6">
      
      {/* DIRECTORY FILTERS & SEARCH */}
      <div className="bg-[#111625] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search finished product, machine code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-850 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Filters and creation action */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-850 px-2.5 py-1.5 rounded-xl text-xs font-mono">
            <span className="text-slate-500">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none pr-1 cursor-pointer font-bold animate-fade-in"
            >
              <option value="All">All Statuses</option>
              <option value="Available">✅ In Stock</option>
              <option value="Low Stock">⚠️ Low Stock</option>
              <option value="Out of Stock">❌ Out of Stock</option>
            </select>
          </div>

          <button
            onClick={handleOpenCreateGood}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Machinery</span>
          </button>
        </div>
      </div>

      {/* Aggregate Catalog valuation list banner */}
      <div className="bg-slate-950/20 border border-slate-850 rounded-xl p-3 px-4 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2 text-slate-400">
          <PackageCheck className="w-4 h-4 text-indigo-400" />
          <span>Active Finished Goods stored manufacturing costs valuation index:</span>
        </div>
        <strong className="text-emerald-400 font-bold font-mono">
          ₹{totalCatalogValuation.toLocaleString('en-IN')}
        </strong>
      </div>

      {/* PRODUCT LISTS SECTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGoods.map((fg) => {
          const isOut = fg.quantity_available === 0;
          const isLow = fg.status === 'Low Stock';
          
          return (
            <div 
              key={fg.id} 
              className={`bg-[#111625] border rounded-2xl p-5 hover:shadow-xl transition relative ${
                isOut ? 'border-red-500/20' : isLow ? 'border-amber-500/20' : 'border-slate-800'
              }`}
            >
              {/* Product Info Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="bg-slate-800 border border-slate-750 text-slate-400 text-[8.5px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    Code: {fg.code}
                  </span>

                  <span className={`text-[8.5px] font-mono px-2 py-0.5 font-bold rounded uppercase ${
                    isOut 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                      : isLow 
                        ? 'bg-amber-500/10 text-amber-400' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                  }`}>
                    {fg.status}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-slate-200 mt-2 font-sans line-clamp-1">
                  {fg.name}
                </h4>
              </div>

              {/* pricing indicators and available stocks */}
              <div className="my-4 grid grid-cols-3 gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-900 text-center font-mono text-[10px] leading-relaxed">
                <div>
                  <p className="text-slate-500 uppercase text-[8px]">In Stock</p>
                  <p className={`text-sm font-black font-mono ${isOut ? 'text-red-400' : 'text-slate-200'}`}>{fg.quantity_available} units</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase text-[8px]">Shop cost</p>
                  <p className="text-xs font-semibold text-slate-400 mt-1">₹{fg.manufacturing_cost.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase text-[8px]">MRP Price</p>
                  <p className="text-xs font-semibold text-emerald-400 mt-1">₹{fg.selling_price.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* actions control bottom row */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-850 pt-3">
                <span className="text-[10px] text-slate-500 font-mono">ID: {fg.id}</span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleOpenSell(fg)}
                    className="p-1 px-3 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 rounded-lg text-[10px] font-mono transition text-2xs cursor-pointer active:scale-95 font-semibold"
                  >
                    Sale Dispatch
                  </button>
                  <button
                    onClick={() => handleOpenEditGood(fg)}
                    className="p-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition shrink-0 cursor-pointer animate-fade-in"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteGood(fg.id)}
                    className="p-2 bg-slate-900 border border-slate-850 hover:bg-red-500/10 hover:text-red-400 text-slate-500 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {filteredGoods.length === 0 && (
        <div className="bg-[#111625] border border-slate-850 rounded-2xl p-12 text-center text-slate-500 space-y-2">
          <PackageCheck className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-sm font-semibold">No products profiles matched selection filters</p>
        </div>
      )}

      {/* --- ADD/EDIT PRODUCT PROFILE MODAL --- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-serif font-black text-white flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-indigo-400" />
              <span>{editGood ? 'Modify Product Specifications' : 'Define New Machine Profile'}</span>
            </h3>

            <form onSubmit={handleSaveGood} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Product / Machine Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 outline-none"
                  placeholder="e.g. Steam Cook Vat 300L"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Product Machine Code *</label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Avg Shopfloor Cost (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Selling Price MRP (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formSelling}
                    onChange={(e) => setFormSelling(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-lg font-mono text-slate-400 cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer animate-fade-in"
                >
                  Commit changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DISPATCH PRODUCTS DIRECT SALE MODAL --- */}
      {isSellOpen && sellTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-indigo-400 animate-bounce" />
              <span>Record Sale dispatch shipment</span>
            </h3>
            <p className="text-xs text-slate-400">
              Dispatching from stores: <strong className="text-slate-200">{sellTarget.name}</strong>
            </p>

            <form onSubmit={handleProcessSell} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Quantity Owed</label>
                <input
                  type="number"
                  min="1"
                  max={sellTarget.quantity_available}
                  required
                  value={sellQty}
                  onChange={(e) => setSellQty(Number(e.target.value))}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono outline-none"
                />
                <span className="text-[10px] text-slate-500">Max stores stock: {sellTarget.quantity_available} units</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Linked sales Invoice order receipt</label>
                <input
                  type="text"
                  required
                  value={sellInvoiceRef}
                  onChange={(e) => setSellInvoiceRef(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono outline-none placeholder-slate-500"
                  placeholder="e.g. INV-2026-90"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Despatching notes and freight address</label>
                <input
                  type="text"
                  required
                  value={sellNotes}
                  onChange={(e) => setSellNotes(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 outline-none placeholder-slate-500"
                  placeholder="e.g. Dispatched to Anupam warehouse via logistics carrier..."
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsSellOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-lg font-mono text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  Post Dispatch checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
