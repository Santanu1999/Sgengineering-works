import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  ArrowUpDown,
  Filter,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { inventoryAPI } from '../../data/inventory-database';
import { IRawMaterial, ISupplier } from '../../types/inventory.interface';

interface RawMaterialsTabProps {
  suppliers: ISupplier[];
  onRefresh: () => void;
}

export default function RawMaterialsTab({ suppliers, onRefresh }: RawMaterialsTabProps) {
  const [materials, setMaterials] = useState<IRawMaterial[]>(() => inventoryAPI.getRawMaterials());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStockFilter, setSelectedStockFilter] = useState('All'); // 'All' | 'Low' | 'Normal'
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  // Edit State
  const [editMaterial, setEditMaterial] = useState<IRawMaterial | null>(null);

  // Adjust State
  const [adjustTarget, setAdjustTarget] = useState<IRawMaterial | null>(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustType, setAdjustType] = useState<'Stock In' | 'Stock Out' | 'Adjustment'>('Stock In');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('Steel Sheets');
  const [formUom, setFormUom] = useState('Sheet');
  const [formMinStock, setFormMinStock] = useState(10);
  const [formMaxStock, setFormMaxStock] = useState(100);
  const [formCost, setFormCost] = useState(100);
  const [formSelling, setFormSelling] = useState(150);
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const refreshList = () => {
    setMaterials(inventoryAPI.getRawMaterials());
    onRefresh();
  };

  // Filter Categories list
  const categories = useMemo(() => {
    const set = new Set(materials.map(m => m.category));
    return ['All', ...Array.from(set)];
  }, [materials]);

  // Combined Searching & Filtering Calculations
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                          m.code.toLowerCase().includes(search.toLowerCase()) ||
                          m.supplier_name.toLowerCase().includes(search.toLowerCase());
      
      const matchCat = selectedCategory === 'All' || m.category === selectedCategory;
      
      let matchStock = true;
      if (selectedStockFilter === 'Low') {
        matchStock = m.current_stock <= m.minimum_stock;
      } else if (selectedStockFilter === 'Normal') {
        matchStock = m.current_stock > m.minimum_stock;
      }

      return matchSearch && matchCat && matchStock;
    });
  }, [materials, search, selectedCategory, selectedStockFilter]);

  // Aggregate stats
  const totalValuation = useMemo(() => {
    return filteredMaterials.reduce((sum, m) => sum + (m.current_stock * m.purchase_cost), 0);
  }, [filteredMaterials]);

  // Open creation Form Modal
  const openCreateForm = () => {
    setEditMaterial(null);
    setFormName('');
    setFormCode(`RM-${Math.random().toString(36).substr(2, 5).toUpperCase()}`);
    setFormCategory('');
    setFormUom('');
    setFormMinStock(10);
    setFormMaxStock(100);
    setFormCost(100);
    setFormSelling(150);
    setFormSupplierId(suppliers[0]?.id || '');
    setFormDesc('');
    setIsFormOpen(true);
  };

  // Open Edit Form Modal
  const openEditForm = (mat: IRawMaterial) => {
    setEditMaterial(mat);
    setFormName(mat.name);
    setFormCode(mat.code);
    setFormCategory(mat.category);
    setFormUom(mat.uom);
    setFormMinStock(mat.minimum_stock);
    setFormMaxStock(mat.maximum_stock);
    setFormCost(mat.purchase_cost);
    setFormSelling(mat.selling_cost);
    setFormSupplierId(mat.supplier_id);
    setFormDesc(mat.description);
    setIsFormOpen(true);
  };

  // Save new or updated material
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSupplierId) return;

    const supplier = suppliers.find(s => s.id === formSupplierId);
    if (!supplier) return;

    const savedMat: IRawMaterial = {
      id: editMaterial ? editMaterial.id : `rm-${Math.random().toString(36).substr(2, 9)}`,
      name: formName,
      code: formCode,
      category: formCategory,
      uom: formUom,
      current_stock: editMaterial ? editMaterial.current_stock : 0, // initially 0, rely on Stock-In / purchase for entry
      minimum_stock: Number(formMinStock),
      maximum_stock: Number(formMaxStock),
      purchase_cost: Number(formCost),
      selling_cost: Number(formSelling),
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      description: formDesc,
      created_date: editMaterial ? editMaterial.created_date : new Date().toISOString()
    };

    inventoryAPI.saveRawMaterial(savedMat);
    setIsFormOpen(false);
    refreshList();
  };

  // Delete material from localdb
  const handleDeleteMaterial = (id: string) => {
    if (confirm('Are you absolutely sure you want to delete this material entry? All transaction indexes will remain intact.')) {
      inventoryAPI.deleteRawMaterial(id);
      refreshList();
    }
  };

  // Set up adjustment modal
  const handleOpenAdjust = (mat: IRawMaterial) => {
    setAdjustTarget(mat);
    setAdjustQty(1);
    setAdjustType('Stock In');
    setAdjustNotes('');
    setIsAdjustOpen(true);
  };

  // Process adjustment
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    const actualQty = Number(adjustQty);
    if (actualQty <= 0) {
      alert('Required positive quantity amounts');
      return;
    }

    // Call API transaction
    inventoryAPI.addTransaction({
      id: `txn-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString().split('T')[0],
      type: adjustType as any,
      quantity: actualQty,
      item_id: adjustTarget.id,
      item_name: adjustTarget.name,
      is_finished_good: false,
      reference_type: 'Manual',
      reference_no: `ADJ-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      notes: adjustNotes || `Manual inventory adjustments: ${adjustType}`
    });

    setIsAdjustOpen(false);
    refreshList();
  };

  return (
    <div className="space-y-6">
      
      {/* FILTER SEARCH TOOL BAR */}
      <div className="bg-[#111625] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search raw material, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-850 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Category & Stock filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Categories select dropdown */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-850 px-2.5 py-1.5 rounded-xl text-xs font-mono">
            <span className="text-slate-500">Cat:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none pr-1 cursor-pointer font-bold"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Stock Levels filters */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-850 px-2.5 py-1.5 rounded-xl text-xs font-mono">
            <span className="text-slate-500">Stock:</span>
            <select
              value={selectedStockFilter}
              onChange={(e) => setSelectedStockFilter(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none pr-1 cursor-pointer font-bold"
            >
              <option value="All">All Stocks</option>
              <option value="Low">⚠️ Low Buffer</option>
              <option value="Normal">✅ Adequate</option>
            </select>
          </div>

          {/* Create Button */}
          <button
            onClick={openCreateForm}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {/* Aggregate Valuation Header Card */}
      <div className="bg-slate-950/20 border border-slate-850 rounded-xl p-3 px-4 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2 text-slate-400">
          <Briefcase className="w-4 h-4 text-blue-400" />
          <span>Active Material Catalogue valuation index:</span>
        </div>
        <strong className="text-emerald-400 font-bold font-mono">
          ₹{totalValuation.toLocaleString('en-IN')}
        </strong>
      </div>

      {/* RAW MATERIALS GRID / LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.map((mat) => {
          const isLowStock = mat.current_stock <= mat.minimum_stock;
          return (
            <div 
              key={mat.id}
              className={`bg-[#111625] border rounded-2xl p-5 hover:shadow-xl transition-all relative ${
                isLowStock ? 'border-red-500/20 shadow-red-500/5' : 'border-slate-800'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="bg-slate-800 border border-slate-700/50 text-slate-400 text-[9px] font-mono px-2 py-0.5 rounded-md uppercase">
                    {mat.category}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-100 font-sans mt-1.5 leading-snug">
                    {mat.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                    Code: {mat.code}
                  </p>
                </div>
                
                {/* Warnings bubble */}
                {isLowStock && (
                  <div className="flex items-center text-red-400 bg-red-400/10 text-[9px] font-mono px-2 py-0.5 rounded border border-red-500/20 space-x-1">
                    <AlertTriangle className="w-3 h-3 animate-pulse shrink-0" />
                    <span>LOW STOCK</span>
                  </div>
                )}
              </div>

              {/* Stock numbers tracker */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/50 rounded-xl p-3 mt-4 text-center">
                <div>
                  <p className="text-[9px] font-mono text-slate-500 uppercase">On Hand</p>
                  <p className={`text-base font-bold font-mono ${isLowStock ? 'text-red-400' : 'text-slate-100'}`}>
                    {mat.current_stock} <span className="text-[10px] text-slate-400 font-normal lowercase">{mat.uom}s</span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-slate-500 uppercase">Min Buffer</p>
                  <p className="text-xs font-semibold text-slate-300 font-mono mt-1">
                    {mat.minimum_stock}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-slate-500 uppercase">Unit Cost</p>
                  <p className="text-xs font-semibold text-slate-300 font-mono mt-1">
                    ₹{mat.purchase_cost}
                  </p>
                </div>
              </div>

              {/* Extra Meta descriptions */}
              <div className="mt-4 border-t border-slate-850 pt-3 text-[11px] leading-relaxed text-slate-400">
                <p className="line-clamp-2 italic">“{mat.description || 'No custom description elements configured'}”</p>
                <div className="mt-2.5 flex items-center space-x-1 text-slate-500 text-[10px] font-mono">
                  <span>Vendor:</span>
                  <span className="text-slate-300 font-semibold">{mat.supplier_name}</span>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="mt-5 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenAdjust(mat)}
                  className="bg-slate-900 border border-slate-800 hover:border-blue-500/20 text-blue-400 hover:text-blue-300 font-bold px-3 py-1.5 rounded-lg text-[10px] font-mono transition cursor-pointer active:scale-95"
                >
                  Adjust (In/Out)
                </button>
                <button
                  onClick={() => openEditForm(mat)}
                  className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-slate-100 text-slate-400 rounded-lg transition cursor-pointer"
                  title="Edit material details"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteMaterial(mat.id)}
                  className="p-2 bg-slate-900 border border-slate-800 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-slate-500 rounded-lg transition cursor-pointer"
                  title="Remove catalog material entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="bg-[#111625] border border-slate-850 rounded-2xl p-12 text-center text-slate-500 space-y-2">
          <Package className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-sm font-semibold">No raw material profiles matched filter keys</p>
          <p className="text-xs text-slate-600">Consider adjusting your filters or search keywords.</p>
        </div>
      )}

      {/* --- ADD/EDIT MODAL SHEET --- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 my-8">
            <h3 className="text-base font-serif font-black text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span>{editMaterial ? 'Modify Material Profile' : 'Define New Material Profile'}</span>
            </h3>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Material Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g. Copper element coil"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Material Code</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 uppercase focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Steel Sheets"
                    className="w-full text-xs px-3 py-2.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">UOM (Unit of Measure)</label>
                  <input
                    type="text"
                    value={formUom}
                    onChange={(e) => setFormUom(e.target.value)}
                    placeholder="e.g. Kg, Sheet"
                    className="w-full text-xs px-3 py-2.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Min-Stock (Alert limit)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Max-Stock Storage Cap</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formMaxStock}
                    onChange={(e) => setFormMaxStock(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Estimated Sales Cost (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formSelling}
                    onChange={(e) => setFormSelling(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Primary Assigned Supplier *</label>
                <select
                  required
                  value={formSupplierId}
                  onChange={(e) => setFormSupplierId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="" disabled>Choose active vendor</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Technical Specifications / Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition h-20 resize-none"
                  placeholder="Material alloy details, thickness certifications..."
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:text-slate-200 rounded-lg text-xs font-mono text-slate-400 transition cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs text-white font-bold rounded-lg transition cursor-pointer"
                >
                  Commit changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MANUAL ADJUSTMENT MODAL --- */}
      {isAdjustOpen && adjustTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-orange-400 animate-pulse" />
              <span>Fast Stocks Adjuster</span>
            </h3>
            <p className="text-xs text-slate-400">
              For material: <strong className="text-slate-200">{adjustTarget.name}</strong>
            </p>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Operation Type</label>
                <select
                  value={adjustType}
                  onChange={(e: any) => setAdjustType(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="Stock In">➕ Stock In / Manual Injection</option>
                  <option value="Stock Out">➖ Stock Out / Store checkout</option>
                  <option value="Adjustment">🔧 Audit Override / Adjustment</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Quantity Changed ({adjustTarget.uom}s)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Add Reason / Remarks</label>
                <input
                  type="text"
                  required
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  placeholder="e.g. Scraps during fabrication, inventory audit audit..."
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-850 text-xs">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg font-mono text-slate-400 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  Commit adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
