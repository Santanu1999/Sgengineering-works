import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Handshake, 
  Plus, 
  Edit3, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight,
  History,
  Info,
  DollarSign
} from 'lucide-react';
import { inventoryAPI } from '../../data/inventory-database';
import { ISupplier, ISupplierLedgerEntry, IRawMaterial } from '../../types/inventory.interface';

interface SuppliersTabProps {
  onRefresh: () => void;
}

export default function SuppliersTab({ onRefresh }: SuppliersTabProps) {
  const [suppliers, setSuppliers] = useState<ISupplier[]>(() => inventoryAPI.getSuppliers());
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals status
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Forms Fields state
  const [editSupplier, setEditSupplier] = useState<ISupplier | null>(null);
  const [formName, setFormName] = useState('');
  const [formPerson, setFormPerson] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formAltMobile, setFormAltMobile] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGst, setFormGst] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');

  // Purchase Form fields
  const [purchaseMatId, setPurchaseMatId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [purchaseCost, setPurchaseCost] = useState(0);
  const [purchaseRef, setPurchaseRef] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Payment Form fields
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const refreshList = () => {
    setSuppliers(inventoryAPI.getSuppliers());
    onRefresh();
  };

  const activeSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  const ledgerHistory = useMemo(() => {
    if (!selectedSupplierId) return [];
    return inventoryAPI.getSupplierLedgers(selectedSupplierId);
  }, [selectedSupplierId, suppliers]); // Re-fetch on suppliers update

  const materials = useMemo(() => {
    return inventoryAPI.getRawMaterials();
  }, []);

  // Filter materials specific to the selected supplier to pre-populate custom purchases!
  const supplierSpecificMaterials = useMemo(() => {
    if (!selectedSupplierId) return [];
    return materials.filter(m => m.supplier_id === selectedSupplierId);
  }, [materials, selectedSupplierId]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      return s.name.toLowerCase().includes(search.toLowerCase()) ||
             s.contact_person.toLowerCase().includes(search.toLowerCase()) ||
             (s.gst_number || '').toLowerCase().includes(search.toLowerCase());
    });
  }, [suppliers, search]);

  const totalDuesWeOwe = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + s.outstanding_balance, 0);
  }, [suppliers]);

  // Handle supplier details Save
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMobile.trim()) return;

    const savedSupp: ISupplier = {
      id: editSupplier ? editSupplier.id : `supp-${Math.random().toString(36).substr(2, 9)}`,
      name: formName,
      contact_person: formPerson,
      mobile: formMobile,
      alternate_mobile: formAltMobile || null,
      email: formEmail || null,
      address: formAddress,
      gst_number: formGst || null,
      notes: formNotes,
      status: formStatus,
      outstanding_balance: editSupplier ? editSupplier.outstanding_balance : 0
    };

    inventoryAPI.saveSupplier(savedSupp);
    setIsFormOpen(false);
    refreshList();
    if (!selectedSupplierId) {
      setSelectedSupplierId(savedSupp.id);
    }
  };

  const handleOpenCreateSupplier = () => {
    setEditSupplier(null);
    setFormName('');
    setFormPerson('');
    setFormMobile('');
    setFormAltMobile('');
    setFormEmail('');
    setFormAddress('');
    setFormGst('');
    setFormNotes('');
    setFormStatus('Active');
    setIsFormOpen(true);
  };

  const handleOpenEditSupplier = (s: ISupplier) => {
    setEditSupplier(s);
    setFormName(s.name);
    setFormPerson(s.contact_person);
    setFormMobile(s.mobile);
    setFormAltMobile(s.alternate_mobile || '');
    setFormEmail(s.email || '');
    setFormAddress(s.address);
    setFormGst(s.gst_number || '');
    setFormNotes(s.notes);
    setFormStatus(s.status);
    setIsFormOpen(true);
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm('Deletes supplier info? All active ledgers and raw materials allocated will remain intact.')) {
      inventoryAPI.deleteSupplier(id);
      setSelectedSupplierId(null);
      refreshList();
    }
  };

  // Workflow A: Trigger Purchase Form
  const handleOpenPurchase = () => {
    if (!supplierSpecificMaterials.length) {
      alert('You must first assign some raw materials in the catalogue to this supplier in order to trigger stock purchases!');
      return;
    }
    const standardMat = supplierSpecificMaterials[0];
    setPurchaseMatId(standardMat.id);
    setPurchaseQty(10);
    setPurchaseCost(standardMat.purchase_cost * 10);
    setPurchaseRef(`PI-${Math.random().toString(36).substr(2, 5).toUpperCase()}`);
    setPurchaseNotes('');
    setIsPurchaseOpen(true);
  };

  const handleProcessPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !purchaseMatId) return;

    inventoryAPI.triggerPurchaseWorkflow({
      materialId: purchaseMatId,
      supplierId: selectedSupplierId,
      quantity: Number(purchaseQty),
      billingCost: Number(purchaseCost),
      referenceNo: purchaseRef,
      notes: purchaseNotes || 'Direct vendor purchases trigger logs'
    });

    setIsPurchaseOpen(false);
    refreshList();
  };

  // Live Cost Recalculator based on materials unit prices
  const onPurchaseChange = (matId: string, q: number) => {
    setPurchaseMatId(matId);
    setPurchaseQty(q);
    const targetMat = materials.find(m => m.id === matId);
    if (targetMat) {
      setPurchaseCost(targetMat.purchase_cost * q);
    }
  };

  // Workflow B: Trigger Payment made out to Supplier
  const handleOpenPayment = () => {
    if (!activeSupplier || activeSupplier.outstanding_balance <= 0) {
      alert('This supplier account has clear credit! No outstanding balances require payments.');
      return;
    }
    setPaymentAmount(activeSupplier.outstanding_balance);
    setPaymentRef(`PAY-${Math.random().toString(36).substr(2, 5).toUpperCase()}`);
    setPaymentNotes('');
    setIsPaymentOpen(true);
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;

    inventoryAPI.triggerSupplierPayment({
      supplierId: selectedSupplierId,
      amount: Number(paymentAmount),
      referenceNo: paymentRef,
      date: new Date().toISOString().split('T')[0],
      notes: paymentNotes || 'Cash release to vendor'
    });

    setIsPaymentOpen(false);
    refreshList();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[calc(100vh-175px)] lg:h-[620px]">
      
      {/* SUPPLIER SIDE DIRECTORY LIST (LG 4 cols) */}
      <div className="lg:col-span-4 bg-[#111625] border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden max-lg:h-[350px]">
        {/* Inner Search & Add row */}
        <div className="p-4 border-b border-slate-850 space-y-3 bg-slate-950/20">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-serif font-black tracking-tight text-white flex items-center gap-1.5">
              <Handshake className="w-4 h-4 text-orange-400" />
              <span>Vendors & Merchants</span>
            </h4>
            <button
              onClick={handleOpenCreateSupplier}
              className="p-1 px-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold font-mono text-[9px] cursor-pointer"
            >
              + ADD VENDOR
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search vendor name, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[11px] pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Directory Listings */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-850 custom-scrollbar">
          {filteredSuppliers.map((supp) => {
            const isSelected = supp.id === selectedSupplierId;
            return (
              <div
                key={supp.id}
                onClick={() => setSelectedSupplierId(supp.id)}
                className={`p-3.5 text-xs select-none transition cursor-pointer flex items-center justify-between ${
                  isSelected ? 'bg-blue-600/10 border-r-2 border-blue-500' : 'hover:bg-slate-900/40'
                }`}
              >
                <div className="space-y-1 pr-2">
                  <h5 className="font-bold text-slate-200 line-clamp-1">{supp.name}</h5>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{supp.mobile}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Dues Owed</p>
                  <p className={`font-mono font-bold ${supp.outstanding_balance > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                    ₹{supp.outstanding_balance.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            );
          })}

          {filteredSuppliers.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-8">No vendors correspond</p>
          )}
        </div>

        {/* Sticky Global Balance We Owe */}
        <div className="p-3 bg-slate-950 border-t border-slate-850 text-center text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>Our Outstanding Purchasing Debt:</span>
          <span className="font-bold text-orange-400">₹{totalDuesWeOwe.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* SUPPLIER LEDGER ACCOUNTS WORKSPACE (LG 8 COLS) */}
      <div className="lg:col-span-8 bg-[#111625] border border-slate-800 rounded-2xl h-full flex flex-col overflow-hidden">
        
        {activeSupplier ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Header specs */}
            <div className="p-5 border-b border-slate-850 bg-slate-950/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${activeSupplier.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <h3 className="text-base font-serif font-black text-white">{activeSupplier.name}</h3>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                    Core Vendor Profile ID: {activeSupplier.id} {activeSupplier.gst_number && `| GST: ${activeSupplier.gst_number}`}
                  </p>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <button 
                    onClick={() => handleOpenEditSupplier(activeSupplier)}
                    className="p-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-lg transition text-2xs cursor-pointer"
                  >
                    Edit Info
                  </button>
                  <button 
                    onClick={() => handleDeleteSupplier(activeSupplier.id)}
                    className="p-1.5 bg-slate-900 border border-slate-800 hover:border-red-500/20 hover:text-red-400 rounded-lg transition text-2xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Extra specifications columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-sans text-slate-300 bg-slate-900/40 rounded-xl p-3">
                <div className="space-y-1">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase font-mono">Contact Details</span>
                  <p className="font-bold font-serif text-white">{activeSupplier.contact_person}</p>
                  <p className="text-slate-400 flex items-center space-x-1.5 text-xs">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{activeSupplier.mobile}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase font-mono">Primary Hub Warehouse</span>
                  <p className="text-slate-400 leading-snug flex items-start space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5" />
                    <span className="line-clamp-2">{activeSupplier.address}</span>
                  </p>
                </div>
                <div className="space-y-1 sm:text-right">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase font-mono">Dues Outstanding</span>
                  <p className="text-base font-serif font-black text-rose-400">
                    ₹{activeSupplier.outstanding_balance.toLocaleString('en-IN')}
                  </p>
                  <p className="text-3xs font-mono text-slate-500">Includes purchases - cash payments</p>
                </div>
              </div>

              {/* Action Operations menu */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenPurchase}
                  className="flex-1 flex items-center justify-center space-x-2 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold py-2 rounded-xl border border-emerald-600 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Receive Material Purchase</span>
                </button>
                <button
                  onClick={handleOpenPayment}
                  className="flex-1 flex items-center justify-center space-x-2 bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-bold py-2 rounded-xl border border-purple-600 transition cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Pay Outstanding Cash</span>
                </button>
              </div>
            </div>

            {/* LEDGER GRID LOGS TABLE */}
            <div className="flex-1 overflow-hidden flex flex-col h-full bg-slate-950/20">
              <div className="p-3 border-b border-slate-850 flex items-center justify-between bg-slate-900/50">
                <h4 className="text-[10px] font-serif font-black tracking-widest text-slate-400 uppercase">
                  Vendor Ledger Accounts Statements
                </h4>
                <span className="text-3xs font-mono text-slate-500">Credit increases balance debt | Debit decreases</span>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar">
                {/* DESKTOP TABLE */}
                <table className="hidden md:table w-full text-left text-xs text-slate-300 border-collapse min-w-[550px]">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-mono text-3xs uppercase tracking-wider sticky top-0 border-b border-slate-850 z-10">
                      <th className="p-3">Txn Date</th>
                      <th className="p-3">Receipt Type</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Debit (Payment Out)</th>
                      <th className="p-3 text-right">Credit (P. Invoice)</th>
                      <th className="p-3 text-right">Remaining Bal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {ledgerHistory.map((le) => (
                      <tr key={le.id} className="hover:bg-slate-900/50 text-[11px]">
                        <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{le.date}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono leading-none ${
                            le.type === 'Payment Out' ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {le.type}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-blue-400 font-semibold">{le.reference_no}</td>
                        <td className="p-3 text-slate-300 line-clamp-1 max-w-[150px]" title={le.description}>
                          {le.description}
                        </td>
                        <td className="p-3 text-right text-purple-400 font-mono">
                          {le.debit > 0 ? `₹${le.debit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-3 text-right text-emerald-400 font-mono">
                          {le.credit > 0 ? `₹${le.credit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-200">
                          ₹{le.running_balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* MOBILE CARDS */}
                <div className="md:hidden space-y-3.5 p-3">
                  {ledgerHistory.map((le) => {
                    const isPayment = le.type === 'Payment Out';
                    return (
                      <div 
                        key={le.id}
                        className={`p-4 rounded-xl border ${
                          isPayment 
                            ? 'bg-purple-950/5 border-purple-900/20' 
                            : 'bg-emerald-950/5 border-emerald-900/20'
                        } bg-slate-900/40 space-y-3 shadow-md`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-850 px-2 py-0.5 rounded border border-slate-800">
                            {le.date}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono leading-none ${
                            isPayment ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {le.type}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono font-bold text-blue-405">
                            Ref: {le.reference_no}
                          </span>
                          <span className="text-slate-400 truncate max-w-[170px]" title={le.description}>
                            {le.description}
                          </span>
                        </div>
                        
                        <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 block">
                              {isPayment ? 'Debit (Payment Out)' : 'Credit (P. Invoice)'}
                            </span>
                            <strong className={`font-mono text-sm ${isPayment ? 'text-purple-400 font-bold' : 'text-emerald-400 font-bold'}`}>
                              ₹{(isPayment ? le.debit : le.credit).toLocaleString('en-IN')}
                            </strong>
                          </div>
                          <div className="text-right space-y-0.5">
                            <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 block">
                              Remaining Bal
                            </span>
                            <strong className="font-mono text-sm text-white font-extrabold">
                              ₹{le.running_balance.toLocaleString('en-IN')}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {ledgerHistory.length === 0 && (
                  <div className="text-center py-12 text-slate-500 italic text-xs font-mono">
                    No ledger transaction postings
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 p-12 text-center h-full">
            <Handshake className="w-12 h-12 text-slate-700 animate-bounce" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-300">Supplier Ledger Panel Docked</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-normal">
                Select a merchant vendor from the directory scroll on the left to review ledger accounts sheets and issue direct purchases or payments.
              </p>
            </div>
            <button
              onClick={handleOpenCreateSupplier}
              className="text-xs font-mono font-bold text-blue-400 hover:text-blue-300 border border-slate-800 hover:border-blue-500/30 px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Add New Supplier Now
            </button>
          </div>
        )}
      </div>

      {/* --- ADD/EDIT SUPPLIER INFO MODAL --- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 my-8 shadow-2xl">
            <h3 className="text-base font-serif font-black text-white flex items-center gap-2">
              <Handshake className="w-5 h-5 text-orange-400" />
              <span>{editSupplier ? 'Modify Vendor Record' : 'Record New Vendor Merchant'}</span>
            </h3>

            <form onSubmit={handleSaveSupplier} className="space-y-4.5">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Supplier Company Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  placeholder="e.g. Jindal Steel Distributors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Contact Executive *</label>
                  <input
                    type="text"
                    required
                    value={formPerson}
                    onChange={(e) => setFormPerson(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    placeholder="Representative Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="Active">Active Agent</option>
                    <option value="Inactive">Block/Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{10}"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
                    placeholder="10 digit mobile"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Alternative Mobile</label>
                  <input
                    type="text"
                    value={formAltMobile}
                    onChange={(e) => setFormAltMobile(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Merchant GST No</label>
                  <input
                    type="text"
                    value={formGst}
                    onChange={(e) => setFormGst(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono uppercase"
                    placeholder="15-digit GSTIN"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Company Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
                    placeholder="e.g. sales@jindal.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Core Registered address *</label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  placeholder="HQ location..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Extra notes & annotations</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition h-16 resize-none"
                  placeholder="Primary credit term index, delivery cycles..."
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 transition cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold rounded-lg transition cursor-pointer"
                >
                  Confirm supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RECEIVE PURCHASE MODAL --- */}
      {isPurchaseOpen && activeSupplier && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-emerald-400 animate-bounce" />
              <span>Record Purchase (Billed)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Purchasing from vendor: <strong className="text-slate-200">{activeSupplier.name}</strong>
            </p>

            <form onSubmit={handleProcessPurchase} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Select Raw Material Profile</label>
                <select
                  required
                  value={purchaseMatId}
                  onChange={(e) => onPurchaseChange(e.target.value, purchaseQty)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {supplierSpecificMaterials.map(m => (
                    <option key={m.id} value={m.id}>{m.name} (Code: {m.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={purchaseQty}
                    onChange={(e) => onPurchaseChange(purchaseMatId, Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Grand Cost (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Purchase bill invoice reference</label>
                <input
                  type="text"
                  required
                  value={purchaseRef}
                  onChange={(e) => setPurchaseRef(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 placeholder-slate-500 font-mono focus:outline-none"
                  placeholder="e.g. BILL-905-CAL"
                />
              </div>

              <div className="space-y-1 text-[10px] text-slate-500 bg-slate-950/45 p-2 rounded-lg leading-normal">
                💡 <span className="text-slate-400">Inventory automation trigger:</span> This action adds <strong>+{purchaseQty} units</strong> to stock levels and logs a ledger credit of <strong>-₹{purchaseCost}</strong>.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsPurchaseOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-lg font-mono text-slate-400 cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer animate-pulse"
                >
                  Post Billed stock-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PAY SUPPLIER OUTSTANDING MODAL --- */}
      {isPaymentOpen && activeSupplier && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-purple-400 animate-pulse" />
              <span>Record Cash Payment Out</span>
            </h3>
            <p className="text-xs text-slate-400">
              Payment out to: <strong className="text-slate-200">{activeSupplier.name}</strong>
            </p>

            <form onSubmit={handleProcessPayment} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Payout amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={activeSupplier.outstanding_balance}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Max limit: ₹{activeSupplier.outstanding_balance.toLocaleString('en-IN')}</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Bank transaction ID / Cheque / Cash Reference</label>
                <input
                  type="text"
                  required
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono placeholder-slate-500 focus:outline-none"
                  placeholder="UPI-1234567, NEFT-890B"
                />
              </div>

              <div className="space-y-2 text-[10px] text-slate-500 bg-slate-950/45 p-2 rounded-lg leading-normal">
                💡 <span className="text-slate-400 font-semibold text-purple-400">Ledger debit trigger:</span> This will register a payment-out debit on the vendor statement, reducing the outstanding sum.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-lg font-mono text-slate-400 cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  Complete payment out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
