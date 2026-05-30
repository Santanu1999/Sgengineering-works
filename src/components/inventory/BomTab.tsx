import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Info, 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { inventoryAPI } from '../../data/inventory-database';
import { IBom, IFinishedGood, IRawMaterial, IBomItem } from '../../types/inventory.interface';

interface BomTabProps {
  finishedGoods: IFinishedGood[];
  materials: IRawMaterial[];
  onRefresh: () => void;
}

export default function BomTab({ finishedGoods, materials, onRefresh }: BomTabProps) {
  const [boms, setBoms] = useState<IBom[]>(() => inventoryAPI.getBoms());
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);

  // Requirement Planning States
  const [planQty, setPlanQty] = useState(1);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formProductId, setFormProductId] = useState('');
  const [formMaterials, setFormMaterials] = useState<IBomItem[]>([
    { material_id: materials[0]?.id || '', material_name: materials[0]?.name || '', quantity_required: 1, uom: materials[0]?.uom || 'Unit' }
  ]);
  const [formNotes, setFormNotes] = useState('');

  const refreshList = () => {
    setBoms(inventoryAPI.getBoms());
    onRefresh();
  };

  const activeBom = useMemo(() => {
    return boms.find(b => b.id === selectedBomId) || null;
  }, [boms, selectedBomId]);

  // Materials Shortage dynamic calculator
  const shortageAnalysisOutput = useMemo(() => {
    if (!activeBom) return [];
    
    return activeBom.materials.map(bomMat => {
      const needed = bomMat.quantity_required * planQty;
      const actualMatRecord = materials.find(m => m.id === bomMat.material_id);
      const onHand = actualMatRecord ? actualMatRecord.current_stock : 0;
      const deficit = Math.max(0, needed - onHand);
      
      return {
        materialId: bomMat.material_id,
        materialName: bomMat.material_name,
        needed,
        onHand,
        deficit,
        uom: bomMat.uom,
        supplierName: actualMatRecord ? actualMatRecord.supplier_name : 'N/A',
        purchaseCost: actualMatRecord ? actualMatRecord.purchase_cost : 0
      };
    });
  }, [activeBom, planQty, materials]);

  const hasShortages = useMemo(() => {
    return shortageAnalysisOutput.some(item => item.deficit > 0);
  }, [shortageAnalysisOutput]);

  // Form handling functions
  const addFormMaterialRow = () => {
    const defaultM = materials[0];
    if (!defaultM) return;
    setFormMaterials([...formMaterials, { 
      material_id: defaultM.id, 
      material_name: defaultM.name, 
      quantity_required: 1, 
      uom: defaultM.uom 
    }]);
  };

  const removeFormMaterialRow = (idx: number) => {
    setFormMaterials(formMaterials.filter((_, i) => i !== idx));
  };

  const updateFormMaterialRow = (idx: number, field: keyof IBomItem, val: any) => {
    const updated = [...formMaterials];
    if (field === 'material_id') {
      const matchM = materials.find(m => m.id === val);
      if (matchM) {
        updated[idx].material_id = matchM.id;
        updated[idx].material_name = matchM.name;
        updated[idx].uom = matchM.uom;
      }
    } else {
      updated[idx].quantity_required = Number(val);
    }
    setFormMaterials(updated);
  };

  const handleSubmitBom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId || formMaterials.length === 0) return;

    const productRecord = finishedGoods.find(fg => fg.id === formProductId);
    if (!productRecord) return;

    const newBom: IBom = {
      id: `bom-${Math.random().toString(36).substr(2, 9)}`,
      product_id: productRecord.id,
      product_name: productRecord.name,
      materials: formMaterials,
      notes: formNotes,
      created_date: new Date().toISOString()
    };

    inventoryAPI.saveBom(newBom);
    setIsFormOpen(false);
    refreshList();
    setSelectedBomId(newBom.id);
  };

  const handleOpenCreateBom = () => {
    setFormProductId(finishedGoods[0]?.id || '');
    const firstM = materials[0];
    setFormMaterials(firstM ? [{ material_id: firstM.id, material_name: firstM.name, quantity_required: 1, uom: firstM.uom }] : []);
    setFormNotes('');
    setIsFormOpen(true);
  };

  const handleDeleteBom = (id: string) => {
    if (confirm('Deletes Bill of Materials recipe? Production simulation triggers will fall back to manual allocation.')) {
      inventoryAPI.deleteBom(id);
      setSelectedBomId(null);
      refreshList();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[calc(100vh-175px)] lg:h-[620px]">
      
      {/* 4 COLS: LISTING OF AVAILABLE BOMS RECIPES */}
      <div className="lg:col-span-4 bg-[#111625] border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden max-lg:h-[300px]">
        <div className="p-4 border-b border-slate-850 flex items-center justify-between bg-slate-950/20">
          <h4 className="text-xs font-serif font-black text-white flex items-center gap-1.5 uppercase tracking-tight">
            <Layers className="text-blue-400 w-4.5 h-4.5" />
            <span>Product Recipes (BOM)</span>
          </h4>
          <button
            onClick={handleOpenCreateBom}
            className="p-1 px-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-mono font-black text-[9px] cursor-pointer"
          >
            + ADD RECIPE
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-850 custom-scrollbar">
          {boms.map((b) => {
            const isSelected = b.id === selectedBomId;
            return (
              <div
                key={b.id}
                onClick={() => setSelectedBomId(b.id)}
                className={`p-4 text-xs transition cursor-pointer space-y-1 select-none ${
                  isSelected ? 'bg-blue-600/10 border-r-2 border-blue-500' : 'hover:bg-slate-900/30'
                }`}
              >
                <h5 className="font-bold text-slate-100">{b.product_name}</h5>
                <p className="text-[10px] text-slate-400 font-mono">
                  Ingredients: <span className="text-blue-400 font-semibold">{b.materials.length} components</span>
                </p>
              </div>
            );
          })}

          {boms.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-8">Defines some recipe bills to get started</p>
          )}
        </div>
      </div>

      {/* 8 COLS: BOM BLUEPRINT SPECS AND PLANNING WORKBOOK */}
      <div className="lg:col-span-8 bg-[#111625] border border-slate-800 rounded-2xl h-full flex flex-col overflow-hidden">
        {activeBom ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Header recipe specification */}
            <div className="p-5 border-b border-slate-850 bg-slate-950/20 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500">Fabrications Recipe blueprints</span>
                <h3 className="text-base font-serif font-bold text-white">{activeBom.product_name}</h3>
              </div>
              <button
                onClick={() => handleDeleteBom(activeBom.id)}
                className="text-xs text-slate-400 hover:text-red-400 p-2 bg-slate-900 border border-slate-850 rounded-xl transition cursor-pointer"
                title="Remove BOM configuration"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Split Panel: Recipe Ingredients (left) vs Shortage Analyzer (right) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-y-auto">
              
              {/* Box A: Recipe components */}
              <div className="p-5 border-r border-slate-850/60 flex flex-col h-full space-y-4">
                <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                  BOM Unit Compositions:
                </h4>

                <div className="space-y-2.5">
                  {activeBom.materials.map((m, idx) => (
                    <div key={idx} className="bg-slate-900/40 p-3 rounded-xl border border-slate-850/60 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <strong className="text-slate-200">{m.material_name}</strong>
                        <p className="text-3xs text-slate-500 font-mono uppercase">Stores Index: {m.material_id}</p>
                      </div>
                      <span className="font-mono bg-blue-500/10 text-blue-400 text-xs font-bold px-2 py-1 rounded">
                        {m.quantity_required} {m.uom}s
                      </span>
                    </div>
                  ))}
                </div>

                {activeBom.notes && (
                  <p className="text-xs bg-slate-950/20 p-3 rounded-lg border border-slate-850 leading-relaxed text-slate-400 italic">
                    “{activeBom.notes}”
                  </p>
                )}
              </div>

              {/* Box B: Analytical Stock Shortage Workbook */}
              <div className="p-5 bg-slate-950/20 text-xs flex flex-col space-y-4 h-full">
                <div className="space-y-1 border-b border-slate-850 pb-3">
                  <h4 className="text-[10.5px] font-mono text-orange-400 uppercase tracking-widest font-bold flex items-center gap-1">
                    <Calculator className="w-4 h-4 text-orange-400" />
                    <span>Materials Requirement Planner (MRP)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Trigger simulated projections to scan deficits on store shelves.</p>
                </div>

                {/* target volume setting field */}
                <div className="grid grid-cols-2 gap-4 items-center bg-slate-900/50 p-3 rounded-xl border border-slate-850">
                  <span className="font-mono text-slate-300 font-semibold text-[11px]">Manufacture Volume:</span>
                  <input
                    type="number"
                    min="1"
                    value={planQty}
                    onChange={(e) => setPlanQty(Math.max(1, Number(e.target.value)))}
                    className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-right text-xs font-mono font-bold focus:outline-none"
                  />
                </div>

                {/* shortage results items */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[250px] pr-1">
                  {shortageAnalysisOutput.map((item, idx) => {
                    const hasShortage = item.deficit > 0;
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-xl border flex flex-col gap-2 ${
                          hasShortage ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/30 border-slate-850'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-200 line-clamp-1 pr-2">{item.materialName}</strong>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm uppercase ${
                            hasShortage ? 'bg-red-400/10 text-red-400' : 'bg-emerald-400/10 text-emerald-400'
                          }`}>
                            {hasShortage ? 'DEFICIT ⚠️' : 'ADEQUATE ✅'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-slate-400 text-center">
                          <div className="bg-slate-950/40 p-1.5 rounded">
                            <p className="text-[8px] text-slate-500 uppercase">Need</p>
                            <p className="font-bold text-slate-300">{item.needed}</p>
                          </div>
                          <div className="bg-slate-950/40 p-1.5 rounded">
                            <p className="text-[8px] text-slate-500 uppercase">On Hand</p>
                            <p className="font-bold text-slate-300">{item.onHand}</p>
                          </div>
                          <div className={`p-1.5 rounded ${hasShortage ? 'bg-red-500/10 text-red-400' : 'bg-slate-950/40 text-emerald-400'}`}>
                            <p className="text-[8px] text-slate-500 uppercase">Shortage</p>
                            <p className="font-bold">{item.deficit}</p>
                          </div>
                        </div>

                        {hasShortage && (
                          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-850 pt-2 bg-slate-950/10 px-1 rounded">
                            <span>Order Dues from:</span>
                            <span className="text-orange-400 font-semibold italic">{item.supplierName}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* status summary footer action */}
                <div className="border-t border-slate-850 pt-3 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2 text-slate-400">
                    {hasShortages ? (
                      <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                    )}
                    <span>Shortage Analysis:</span>
                  </div>
                  <strong className={`font-mono font-bold uppercase text-[11px] ${hasShortages ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                    {hasShortages ? 'Shortage Detected' : 'Clear - Safe to Begin WIP'}
                  </strong>
                </div>

              </div>

            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 p-12 text-center h-full">
            <Layers className="w-12 h-12 text-slate-700" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-300">Blueprint Recipe Docked</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-normal">
                Choose an item recipe from the list sidebar on the left to inspect ingredient allocations, run simulated material planning, and calculate deficits.
              </p>
            </div>
            <button
              onClick={handleOpenCreateBom}
              className="text-xs font-mono text-blue-400 border border-slate-850 hover:border-blue-500/20 px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Draft Recipe Config
            </button>
          </div>
        )}
      </div>

      {/* --- CREATE NEW RECEIPE BLUEPRINT FORM MODAL --- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 my-8">
            <h3 className="text-base font-serif font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span>Configure Bill of Materials Blueprint</span>
            </h3>

            <form onSubmit={handleSubmitBom} className="space-y-4.5 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Finished Good Output Product *</label>
                <select
                  required
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none"
                >
                  <option value="" disabled>Choose target machinery output</option>
                  {finishedGoods.map(fg => (
                    <option key={fg.id} value={fg.id}>{fg.name} (Code: {fg.code})</option>
                  ))}
                </select>
              </div>

              {/* Composition Matrix lists */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-850 pb-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Recipe Components Configuration</label>
                  <button
                    type="button"
                    onClick={addFormMaterialRow}
                    className="text-[10px] font-mono text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                  >
                    + ADD COMPONENT
                  </button>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[160px] pr-1">
                  {formMaterials.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-950/45 p-2 rounded-lg border border-slate-850/60 font-sans">
                      <select
                        value={row.material_id}
                        onChange={(e) => updateFormMaterialRow(idx, 'material_id', e.target.value)}
                        className="flex-1 text-[11px] p-1.5 bg-slate-900 border border-slate-800 rounded text-slate-300 focus:outline-none"
                      >
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.uom})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={row.quantity_required}
                        onChange={(e) => updateFormMaterialRow(idx, 'quantity_required', e.target.value)}
                        className="w-16 text-center text-[11px] p-1.5 bg-slate-900 border border-slate-800 rounded text-slate-300 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeFormMaterialRow(idx)}
                        className="text-slate-500 hover:text-red-400 font-bold px-1"
                        title="Delete rows component"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {formMaterials.length === 0 && (
                    <p className="text-[11px] text-slate-500 italic text-center py-4">Add at least one material component row</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Technical Workshop directions</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none h-16 resize-none"
                  placeholder="Structural tolerances, welding directives and heat stress ratings..."
                />
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
                  disabled={formMaterials.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Publish Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
