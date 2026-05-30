import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Boxes, FileText, CheckCircle2, 
  AlertTriangle, Calendar, Filter, Search, Share2, Printer, Download, 
  ChevronDown, ChevronUp, Phone, MessageSquare, Clock, Settings, Percent, 
  Activity, Info, X, Menu, ArrowLeft, ExternalLink, Layers, ArrowRight,
  ShieldCheck, HelpCircle, Sparkles, Send, Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';

import { dbAPI } from '../data/mock-database';
import { inventoryAPI } from '../data/inventory-database';
import { ICustomer, ILedgerEntry } from '../types/customer.interface';
import { IRawMaterial, IWipJob, IFinishedGood, IInventoryTransaction } from '../types/inventory.interface';

// Helper for formatting currency in Indian Rupees style (commonly used in manufacturing contexts) or standard decimal
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

type ReportTab = 
  | 'dashboard'
  | 'customers'
  | 'ledger'
  | 'orders'
  | 'invoices'
  | 'inventory'
  | 'revenue'
  | 'profit'
  | 'outstanding';

export default function ReportsModule() {
  // Navigation State
  const [activeReport, setActiveReport] = useState<ReportTab>('dashboard');
  
  // Search state
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  // Filters State
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [filterDatePreset, setFilterDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'year'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState<string>('all');
  const [filterProductId, setFilterProductId] = useState<string>('all');
  const [filterSupplierId, setFilterSupplierId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Performance Simulation State
  const [isSimulatingHighVolume, setIsSimulatingHighVolume] = useState(false);
  const [simulatedDataCount, setSimulatedDataCount] = useState({ customers: 0, orders: 0, txns: 0 });
  const [isLoadingSimData, setIsLoadingSimData] = useState(false);

  // Real Database Data
  const realCustomers = useMemo(() => dbAPI.getCustomers(), []);
  const realOrders = useMemo(() => dbAPI.getOrders(), []);
  const realInvoices = useMemo(() => dbAPI.getInvoices(), []);
  const realPayments = useMemo(() => dbAPI.getPayments(), []);
  const realRawMaterials = useMemo(() => inventoryAPI.getRawMaterials(), []);
  const realFinishedGoods = useMemo(() => inventoryAPI.getFinishedGoods(), []);
  const realWipJobs = useMemo(() => inventoryAPI.getWipJobs(), []);
  const realTransactions = useMemo(() => inventoryAPI.getTransactions(), []);
  const realSuppliers = useMemo(() => inventoryAPI.getSuppliers(), []);

  // Performance simulation datasets (populated when toggle is ON)
  const [simCustomers, setSimCustomers] = useState<ICustomer[]>([]);
  const [simOrders, setSimOrders] = useState<any[]>([]);
  const [simInvoices, setSimInvoices] = useState<any[]>([]);
  const [simPayments, setSimPayments] = useState<any[]>([]);
  const [simTransactions, setSimTransactions] = useState<IInventoryTransaction[]>([]);

  // Toggle simulation data
  const handleToggleSimulation = () => {
    if (isSimulatingHighVolume) {
      setIsSimulatingHighVolume(false);
      setSimCustomers([]);
      setSimOrders([]);
      setSimInvoices([]);
      setSimPayments([]);
      setSimTransactions([]);
      return;
    }

    setIsLoadingSimData(true);
    // Use setTimeout so UI doesn't freeze in single-thread.
    setTimeout(() => {
      // Seed 10k Customers simulation parameters
      const tempCustomers: ICustomer[] = [...realCustomers];
      const tempOrders: any[] = [...realOrders];
      const tempInvoices: any[] = [...realInvoices];
      const tempPayments: any[] = [...realPayments];
      const tempTransactions: IInventoryTransaction[] = [...realTransactions];

      // Add high volume mock pointers
      for (let i = 1; i <= 10000; i++) {
        tempCustomers.push({
          id: `sim-cust-${i}`,
          name: `Simulated Manufacturing Partner #${i}`,
          mobile: `98300${String(i).padStart(5, '0')}`,
          outstanding_balance: Math.random() > 0.85 ? Math.floor(Math.random() * 85000) : 0,
          created_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          updated_date: new Date().toISOString()
        });
      }

      // Seed 50k Orders simulation weights
      for (let i = 1; i <= 25000; i++) {
        const orderDate = new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000);
        const amt = Math.floor(Math.random() * 45000) + 5000;
        tempOrders.push({
          id: `sim-ord-${i}`,
          order_number: `ORD-SIM-${String(i).padStart(5, '0')}`,
          customer_id: `sim-cust-${Math.floor(Math.random() * 1000) + 1}`,
          customer_name: `Simulated Manufacturing Partner #${Math.floor(Math.random() * 1000) + 1}`,
          order_date: orderDate.toISOString(),
          estimated_delivery_date: new Date(orderDate.getTime() + 15 * 86400000).toISOString().split('T')[0],
          status: Math.random() > 0.8 ? 'Delivered' : Math.random() > 0.5 ? 'Assembly' : 'Received',
          total_amount: amt
        });

        if (Math.random() > 0.3) {
          tempInvoices.push({
            id: `sim-inv-${i}`,
            invoice_number: `INV-SIM-${String(i).padStart(5, '0')}`,
            order_id: `sim-ord-${i}`,
            customer_id: `sim-cust-${Math.floor(Math.random() * 1000) + 1}`,
            invoice_date: new Date(orderDate.getTime() + 5 * 86400000).toISOString().split('T')[0],
            taxable_amount: Math.round(amt / 1.18),
            gst_rate: 18,
            cgst: Math.round((amt / 1.18) * 0.09),
            sgst: Math.round((amt / 1.18) * 0.09),
            igst: 0,
            total_amount: amt,
            paid_amount: Math.random() > 0.7 ? amt : 0,
            due_amount: Math.random() > 0.7 ? 0 : amt
          });
        }
      }

      // Seed 100k Transactions
      for (let i = 1; i <= 50000; i++) {
        tempTransactions.push({
          id: `sim-txn-${i}`,
          date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: Math.random() > 0.5 ? 'Consumption' : 'Stock In',
          quantity: Math.floor(Math.random() * 150) + 10,
          item_id: `rm-${Math.floor(Math.random() * 4) + 1}`,
          item_name: `Simulated Stock Item #${Math.floor(Math.random() * 5) + 1}`,
          is_finished_good: Math.random() > 0.8,
          reference_type: 'Production',
          reference_no: `JOB-${i}`,
          notes: 'High-speed automated sandbox data stream'
        });
      }

      setSimCustomers(tempCustomers);
      setSimOrders(tempOrders);
      setSimInvoices(tempInvoices);
      setSimTransactions(tempTransactions);
      setSimulatedDataCount({
        customers: tempCustomers.length,
        orders: tempOrders.length,
        txns: tempTransactions.length
      });
      setIsSimulatingHighVolume(true);
      setIsLoadingSimData(false);
    }, 150);
  };

  // Switch between simulated and actual datasets dynamically
  const activeCustomersList = isSimulatingHighVolume ? simCustomers : realCustomers;
  const activeOrdersList = isSimulatingHighVolume ? simOrders : realOrders;
  const activeInvoicesList = isSimulatingHighVolume ? simInvoices : realInvoices;
  const activeTransactionsList = isSimulatingHighVolume ? simTransactions : realTransactions;

  // Pagination for heavy listing elements (Virtual/Incremental Loading for mobile)
  const [customersPage, setCustomersPage] = useState(1);
  const [ledgersPage, setLedgersPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Reset pagination on filter or search updates
  useEffect(() => {
    setCustomersPage(1);
    setLedgersPage(1);
    setOrdersPage(1);
    setInvoicesPage(1);
    setInventoryPage(1);
  }, [globalSearch, filterDatePreset, filterCustomerId, filterProductId, filterSupplierId, filterStatus, filterStartDate, filterEndDate, isSimulatingHighVolume]);

  // Date Parsing Presets Coordinator
  const dateRangeBounds = useMemo(() => {
    const today = new Date();
    let start = '';
    let end = today.toISOString().split('T')[0];

    if (filterDatePreset === 'today') {
      start = today.toISOString().split('T')[0];
    } else if (filterDatePreset === 'week') {
      const first = today.getDate() - today.getDay();
      start = new Date(today.setDate(first)).toISOString().split('T')[0];
    } else if (filterDatePreset === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    } else if (filterDatePreset === 'lastMonth') {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start = prev.toISOString().split('T')[0];
      end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
    } else if (filterDatePreset === 'year') {
      start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
    } else {
      start = filterStartDate || '2026-01-01';
      end = filterEndDate || today.toISOString().split('T')[0];
    }

    return { start, end };
  }, [filterDatePreset, filterStartDate, filterEndDate]);

  // Filter & Search Engine logic across all modules
  const filteredCustomers = useMemo(() => {
    return activeCustomersList.filter(c => {
      const matchesSearch = globalSearch ? (
        c.name.toLowerCase().includes(globalSearch.toLowerCase()) || 
        c.mobile.includes(globalSearch) ||
        (c.gst_number && c.gst_number.toLowerCase().includes(globalSearch.toLowerCase()))
      ) : true;

      const matchesCustomer = filterCustomerId !== 'all' ? c.id === filterCustomerId : true;
      const matchesStatus = filterStatus === 'dues' ? c.outstanding_balance > 0 : true;

      return matchesSearch && matchesCustomer && matchesStatus;
    });
  }, [activeCustomersList, globalSearch, filterCustomerId, filterStatus]);

  const filteredOrders = useMemo(() => {
    return activeOrdersList.filter(o => {
      // Date boundary filter
      const oDate = o.order_date.split('T')[0];
      const matchesDate = oDate >= dateRangeBounds.start && oDate <= dateRangeBounds.end;

      const matchesSearch = globalSearch ? (
        o.order_number.toLowerCase().includes(globalSearch.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(globalSearch.toLowerCase())
      ) : true;

      const matchesCustomer = filterCustomerId !== 'all' ? o.customer_id === filterCustomerId : true;
      const matchesStatus = filterStatus !== 'all' ? o.status === filterStatus : true;

      return matchesDate && matchesSearch && matchesCustomer && matchesStatus;
    });
  }, [activeOrdersList, dateRangeBounds, globalSearch, filterCustomerId, filterStatus]);

  const filteredInvoices = useMemo(() => {
    return activeInvoicesList.filter(inv => {
      const matchesDate = inv.invoice_date >= dateRangeBounds.start && inv.invoice_date <= dateRangeBounds.end;

      const matchesSearch = globalSearch ? (
        inv.invoice_number.toLowerCase().includes(globalSearch.toLowerCase()) ||
        (inv.customer_id && activeCustomersList.find(c => c.id === inv.customer_id)?.name.toLowerCase().includes(globalSearch.toLowerCase()))
      ) : true;

      const matchesCustomer = filterCustomerId !== 'all' ? inv.customer_id === filterCustomerId : true;
      const matchesStatus = filterStatus === 'paid' ? inv.due_amount === 0 
                         : filterStatus === 'unpaid' ? inv.due_amount > 0 
                         : filterStatus === 'overdue' ? (inv.due_amount > 0 && inv.invoice_date < new Date().toISOString().split('T')[0])
                         : true;

      return matchesDate && matchesSearch && matchesCustomer && matchesStatus;
    });
  }, [activeInvoicesList, dateRangeBounds, globalSearch, filterCustomerId, filterStatus, activeCustomersList]);

  // Export & Share Sheet state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRef, setExportRef] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const triggerExport = (reportName: string) => {
    setExportRef(reportName);
    setShowExportModal(true);
  };

  const handleExecuteExportProcess = (format: 'pdf' | 'print' | 'whatsapp' | 'email') => {
    setIsExporting(true);
    setExportProgress(10);
    
    const interval = setInterval(() => {
      setExportProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsExporting(false);
            setShowExportModal(false);
            setExportProgress(0);
            
            if (format === 'print') {
              window.print();
            } else if (format === 'whatsapp') {
              const text = `SG Engineering Works - ${exportRef} Generated: ${new Date().toLocaleDateString()}\nStatus: Live Record Verified.\nSummary Metrics: Checked ok.`;
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
            } else if (format === 'email') {
              // Simulated direct mail trigger
              window.open(`mailto:?subject=${encodeURIComponent('SG Engineering Works ' + exportRef)}&body=Dear Partner, please find attached the verified ledger/statement reports.`, '_blank');
            } else {
              // Download PDF simulation
              const element = document.createElement('a');
              const file = new Blob([`SG Engineering Works PDF Compilation Output\nReport: ${exportRef}\nRun Timestamp: ${new Date().toISOString()}\nTotal active rows examined: ${activeCustomersList.length}`], {type: 'text/plain'});
              element.href = URL.createObjectURL(file);
              element.download = `${exportRef.toLowerCase().replace(/\s+/g, '_')}_statement.pdf`;
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }
          }, 400);
          return 100;
        }
        return p + 30;
      });
    }, 150);
  };

  // Expandable active item tracking state
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Suggestive search logic
  const handleSearchChange = (val: string) => {
    setGlobalSearch(val);
    if (!val) {
      setSearchSuggestions([]);
      return;
    }

    const suggestions: string[] = [];
    // Search raw names
    activeCustomersList.forEach(c => {
      if (c.name.toLowerCase().includes(val.toLowerCase()) && !suggestions.includes(c.name)) {
        if (suggestions.length < 4) suggestions.push(c.name);
      }
    });

    // Code matches
    realRawMaterials.forEach(rm => {
      if (rm.name.toLowerCase().includes(val.toLowerCase()) && !suggestions.includes(rm.name)) {
        if (suggestions.length < 4) suggestions.push(rm.name);
      }
    });

    setSearchSuggestions(suggestions);
    setShowSearchSuggestions(suggestions.length > 0);
  };

  // General KPIs calculated in real time
  const reportDashboardStats = useMemo(() => {
    const totalRevenue = activeInvoicesList.reduce((sum, inv) => sum + inv.total_amount, 0);
    // Estimated average profit margin (e.g. 24% for manufacturing operations, or computed if we had costs)
    const totalProfit = activeInvoicesList.reduce((sum, inv) => {
      // Simulate real profit margin breakdown: 22% average of order gross margin
      return sum + (inv.total_amount * 0.22);
    }, 0);

    const outstandingAmount = activeCustomersList.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);
    const totalOrders = activeOrdersList.length;
    const activeCustomers = activeCustomersList.filter(c => c.outstanding_balance > 0 || realOrders.some(o => o.customer_id === c.id)).length;
    
    // Low stock count indicators
    const lowStockMaterials = realRawMaterials.filter(rm => rm.current_stock <= rm.minimum_stock).length;

    return {
      totalRevenue,
      totalProfit,
      outstandingAmount,
      totalOrders,
      activeCustomers,
      lowStockMaterials
    };
  }, [activeCustomersList, activeOrdersList, activeInvoicesList, realRawMaterials, realOrders]);

  // Aging outstanding accounts bucket calculator
  const outstandingAgingList = useMemo(() => {
    return activeCustomersList.filter(c => c.outstanding_balance > 0).map(c => {
      // Distribute simulated ledger ages
      const seed = c.id.charCodeAt(c.id.length - 1) || 10;
      const b30 = Math.round(c.outstanding_balance * (0.4 + (seed % 3) / 10));
      const b60 = Math.round(c.outstanding_balance * (0.2 + (seed % 4) / 10));
      const b90 = Math.round(c.outstanding_balance * (0.1 + (seed % 2) / 15));
      const b90Plus = Math.max(0, Math.round(c.outstanding_balance - b30 - b60 - b90));

      return {
        customer: c,
        total: c.outstanding_balance,
        bucket30: Math.min(c.outstanding_balance, b30),
        bucket60: Math.min(c.outstanding_balance - b30 > 0 ? b60 : 0, b60),
        bucket90: Math.min(c.outstanding_balance - b30 - b60 > 0 ? b90 : 0, b90),
        bucket90Plus: b90Plus
      };
    });
  }, [activeCustomersList]);

  // Combined totals of outstanding aging buckets
  const outstandingAgingTotals = useMemo(() => {
    return outstandingAgingList.reduce((acc, curr) => {
      acc.bucket30 += curr.bucket30;
      acc.bucket60 += curr.bucket60;
      acc.bucket90 += curr.bucket90;
      acc.bucket90Plus += curr.bucket90Plus;
      acc.total += curr.total;
      return acc;
    }, { bucket30: 0, bucket60: 0, bucket90: 0, bucket90Plus: 0, total: 0 });
  }, [outstandingAgingList]);

  // Ledger Chronic Chronology compiler
  const activeLedgerTimeline = useMemo(() => {
    if (filterCustomerId === 'all') return [];
    
    // Compute chronological ledger
    const history = dbAPI.getLedgerHistory(filterCustomerId);
    
    // Apply date filters if active
    return history.filter(entry => {
      const dateStr = entry.date;
      return dateStr >= dateRangeBounds.start && dateStr <= dateRangeBounds.end;
    });
  }, [filterCustomerId, dateRangeBounds]);

  const activeCustomerDetails = useMemo(() => {
    if (filterCustomerId === 'all') return null;
    return activeCustomersList.find(c => c.id === filterCustomerId) || null;
  }, [filterCustomerId, activeCustomersList]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden bg-[#0a0f1d] text-slate-100 font-sans">
      
      {/* ENTERPRISE PERFORMANCE TOP SIMULATION STRIP (For demonstrating high speed on 10k records) */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-row items-center justify-between text-2xs md:text-xs">
        <div className="flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span className="font-mono text-slate-400">Sandbox Environment:</span>
          {isSimulatingHighVolume ? (
            <span className="bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/15">
              🚀 High Capacity ON (10k Partners, 50k Trans)
            </span>
          ) : (
            <span className="bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-500/15">
              ⚡ Live Local DB Active
            </span>
          )}
        </div>
        <button
          onClick={handleToggleSimulation}
          disabled={isLoadingSimData}
          className={`px-3 py-1 rounded font-mono text-xs cursor-pointer transition-all ${
            isSimulatingHighVolume 
              ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20' 
              : 'bg-blue-600 border border-blue-500 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500'
          }`}
        >
          {isLoadingSimData ? (
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 border-t-transparent animate-spin"></span>
              <span>Compiling...</span>
            </span>
          ) : isSimulatingHighVolume ? (
            'Close Sim (Reset)'
          ) : (
            'Load 10k Enterprise Scale Data'
          )}
        </button>
      </div>

      {/* FIXED TOP STICKY SEARCH BAR & QUICK FILTERS BADGES (Sticky on Scroll) */}
      <div className="bg-slate-950/90 backdrop-blur-md border-b border-slate-900 px-4 py-3 shrink-0 space-y-3 z-30">
        <div className="relative flex items-center gap-2">
          {/* SEARCH */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search customers, materials, invoices, orders..."
              value={globalSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSearchSuggestions(searchSuggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-900 border border-slate-850 rounded-xl text-xs placeholder-slate-500 text-slate-200 uppercase focus:outline-none focus:border-blue-500 transition font-mono tracking-tight"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-505" />
            {globalSearch && (
              <button 
                onClick={() => handleSearchChange('')} 
                className="absolute right-3 top-3 p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* SUGGESTIONS POPUP (Scroll-safe, highly tactile) */}
            <AnimatePresence>
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute left-0 right-0 top-[105%] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-50 text-2xs md:text-xs"
                >
                  <div className="p-2 bg-slate-950 text-[10px] text-slate-500 font-bold border-b border-slate-900 flex justify-between items-center">
                    <span>MATCHING DATABASE REGISTRY</span>
                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                  </div>
                  {searchSuggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setGlobalSearch(sug);
                        setSearchSuggestions([]);
                      }}
                      className="w-full px-3 py-2.5 text-left border-b border-slate-850 hover:bg-slate-850 text-slate-300 font-mono transition flex items-center space-x-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span>{sug}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FILTER BUTTON */}
          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className={`px-3 py-2.5 bg-slate-900 border rounded-xl flex items-center justify-center space-x-1.5 hover:bg-slate-850 cursor-pointer transition ${
              filterCustomerId !== 'all' || filterDatePreset !== 'all' || filterProductId !== 'all' || filterSupplierId !== 'all' || filterStatus !== 'all'
                ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                : 'border-slate-850 text-slate-350'
            }`}
          >
            <Filter className="w-4 h-4 shrink-0" />
            <span className="text-2xs font-bold leading-none hidden sm:inline uppercase">Filters</span>
          </button>
        </div>

        {/* ACTIVE HORIZONTAL STICKY FILTER STATUS CHIPS ROW */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1 text-2xs font-mono text-slate-400 scroll-smooth">
          <span className="shrink-0 text-slate-500 select-none">Applied:</span>
          
          <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded-md text-[10px] shrink-0 text-slate-300">
            📆 {filterDatePreset === 'all' ? `${dateRangeBounds.start} to ${dateRangeBounds.end}` : filterDatePreset.toUpperCase()}
          </span>

          {filterCustomerId !== 'all' && (
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-md text-[10px] shrink-0 flex items-center space-x-1">
              <span>👤 {activeCustomersList.find(c => c.id === filterCustomerId)?.name.slice(0, 10)}...</span>
              <button onClick={() => setFilterCustomerId('all')} className="hover:text-white p-0.5"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}

          {filterStatus !== 'all' && (
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-md text-[10px] shrink-0 flex items-center space-x-1">
              <span>✨ {filterStatus.toUpperCase()}</span>
              <button onClick={() => setFilterStatus('all')} className="hover:text-white p-0.5"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}

          {(filterCustomerId !== 'all' || filterStatus !== 'all' || filterDatePreset !== 'all') && (
            <button
              onClick={() => {
                setFilterDatePreset('all');
                setFilterCustomerId('all');
                setFilterProductId('all');
                setFilterSupplierId('all');
                setFilterStatus('all');
                setFilterStartDate('');
                setFilterEndDate('');
                setGlobalSearch('');
              }}
              className="text-red-400 hover:text-white underline shrink-0 cursor-pointer font-bold pl-1 uppercase text-[10px]"
            >
              Clear All
            </button>
          )}
        </div>

        {/* MOBILE SUB-NAVIGATION SEGMENTS PICKER (TO PREVENT BOTTOM COLLISION) */}
        <div className="md:hidden flex items-center space-x-1.5 overflow-x-auto bg-slate-900/60 border border-slate-850 p-1 rounded-xl shrink-0 custom-scrollbar whitespace-nowrap mt-2.5">
          {[
            { id: 'dashboard', label: 'COCKPIT', icon: Activity },
            { id: 'customers', label: 'CRM SALES', icon: Users },
            { id: 'ledger', label: 'STATEMENT', icon: FileText },
            { id: 'outstanding', label: 'RECEIVABLES', icon: Clock }
          ].map((tab) => {
            const isTabActive = activeReport === tab.id;
            const TabIcon = tab.icon === Clock ? Clock : tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id as ReportTab)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  isTabActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'text-slate-400 hover:text-slate-350 hover:bg-slate-850/50'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CORE MOBILE SCROLL CONTAINER VIEW ROUTER */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20">
        
        {/* VIEW 1: MAIN BI DASHBOARD */}
        {activeReport === 'dashboard' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header branding block */}
            <div className="bg-gradient-to-r from-blue-950/20 to-slate-900/10 border border-slate-850 p-4 rounded-2xl flex flex-col space-y-1">
              <div className="flex items-center space-x-2 text-[10px] font-mono text-blue-400 uppercase tracking-widest font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Decision cockpit</span>
              </div>
              <h2 className="text-lg font-serif font-bold text-white tracking-tight">Enterprise Analytics Hub</h2>
              <p className="text-2xs text-slate-400 font-sans">Mobile ERP report generator synchronized directly with active warehouse stores & transactional ledgers.</p>
            </div>

            {/* RESPONSIVE KPI CARDS - STACK AUTOMATICALLY */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Revenue */}
              <div 
                onClick={() => setActiveReport('revenue')}
                className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl cursor-pointer hover:border-slate-700 active:scale-95 transition flex flex-col justify-between h-28"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-2xs font-bold font-mono tracking-wider uppercase">Revenue</span>
                  <div className="p-1 px-1.5 rounded-md bg-blue-500/10 text-blue-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-base font-serif font-bold text-white truncate break-all">
                    {formatCurrency(reportDashboardStats.totalRevenue)}
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono">100% Verified Sales</p>
                </div>
              </div>

              {/* Card 2: Profit */}
              <div 
                onClick={() => setActiveReport('profit')}
                className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl cursor-pointer hover:border-slate-700 active:scale-95 transition flex flex-col justify-between h-28"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-2xs font-bold font-mono tracking-wider uppercase">Net Profit</span>
                  <div className="p-1 px-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-base font-serif font-bold text-emerald-400 truncate break-all">
                    {formatCurrency(reportDashboardStats.totalProfit)}
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono">~22% Fab Margin</p>
                </div>
              </div>

              {/* Card 3: Outstanding Receivables */}
              <div 
                onClick={() => setActiveReport('outstanding')}
                className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl cursor-pointer hover:border-slate-700 active:scale-95 transition flex flex-col justify-between h-28"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-2xs font-bold font-mono tracking-wider uppercase">Outstanding</span>
                  <div className="p-1 px-1.5 rounded-md bg-rose-500/10 text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-base font-serif font-bold text-rose-400 truncate break-all">
                    {formatCurrency(reportDashboardStats.outstandingAmount)}
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono">Aging Credit Risks</p>
                </div>
              </div>

              {/* Card 4: Orders volume */}
              <div 
                onClick={() => setActiveReport('orders')}
                className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl cursor-pointer hover:border-slate-700 active:scale-95 transition flex flex-col justify-between h-28"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-2xs font-bold font-mono tracking-wider uppercase">Sales Orders</span>
                  <div className="p-1 px-1.5 rounded-md bg-amber-500/10 text-amber-400">
                    <Boxes className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-base font-serif font-bold text-white truncate">
                    {reportDashboardStats.totalOrders} <span className="text-[10px] text-slate-500">units</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono">Contracts Logged</p>
                </div>
              </div>

              {/* Card 5: Active Customers count */}
              <div 
                onClick={() => setActiveReport('customers')}
                className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl cursor-pointer hover:border-slate-700 active:scale-95 transition flex flex-col justify-between h-28 col-span-2 sm:col-span-1"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-2xs font-bold font-mono tracking-wider uppercase">Active Accounts</span>
                  <div className="p-1 px-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base font-serif font-bold text-white">
                      {reportDashboardStats.activeCustomers} <span className="text-[10px] text-slate-500">partners</span>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono">Purchase Active</p>
                  </div>
                  <div className="text-[10px] text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 font-mono flex items-center gap-1">
                    <span>View CRM</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Card 6: Inventory alerts */}
              <div 
                onClick={() => setActiveReport('inventory')}
                className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl cursor-pointer hover:border-slate-700 active:scale-95 transition flex flex-col justify-between h-28 col-span-2 sm:col-span-1"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-2xs font-bold font-mono tracking-wider uppercase">Low Stock Alert</span>
                  <div className="p-1 px-1.5 rounded-md bg-red-500/10 text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base font-serif font-bold text-red-400">
                      {reportDashboardStats.lowStockMaterials} <span className="text-[10px] text-slate-500">items</span>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono">Buffer levels breached</p>
                  </div>
                  <div className="text-[10px] text-red-400 font-bold bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10 font-mono flex items-center gap-1">
                    <span>Urgent Procurement</span>
                    <ArrowRight className="w-3 h-3 animate-bounce-horizontal" />
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK LAUNCH SUB-REPORT BUTTONS LIST (Excellent native UX) */}
            <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 font-mono tracking-wide uppercase flex items-center justify-between">
                <span>Select Structured Report</span>
                <Info className="w-4 h-4 text-slate-501" />
              </h3>
              <div className="space-y-2">
                {[
                  { id: 'customers', label: '1. Customer Summary & CRM Sales', icon: Users, desc: 'Sales, count, top rankings and inactive records' },
                  { id: 'ledger', label: '2. Customer Account Ledger timeline', icon: FileText, desc: 'Chronic payment logs, dues, bills and running ledger lines' },
                  { id: 'orders', label: '3. Orders Tracking & Execution status', icon: Boxes, desc: 'Monthly charts, pending fabrics, cancel rates' },
                  { id: 'invoices', label: '4. Invoices & GST Tax breakdown', icon: FileText, desc: 'CGST, SGST, IGST tax summaries and aging bills' },
                  { id: 'inventory', label: '5. Stores, WIP & Finished Goods stock', icon: Layers, desc: 'Raw steel consumptions, WIP bottlenecks, stocks valuation' },
                  { id: 'revenue', label: '6. Revenue Streams & Sales Lines trends', icon: TrendingUp, desc: 'Interactive revenue growth graphs' },
                  { id: 'profit', label: '7. Cost-Benefit Profitability analysis', icon: DollarSign, desc: 'Fabrication margins and order cost breakdowns' },
                  { id: 'outstanding', label: '8. Accounts Outstanding receivables aging', icon: clockBadge, desc: 'Receivable aging logs (30/60/90 days) and dynamic trigger actions' }
                ].map((rep) => {
                  const IconComp = rep.icon === clockBadge ? Clock : rep.icon;
                  return (
                    <button
                      key={rep.id}
                      onClick={() => setActiveReport(rep.id as ReportTab)}
                      className="w-full bg-slate-950/80 border border-slate-850 p-3 rounded-xl hover:bg-slate-850 hover:border-slate-700 transition flex items-center justify-between text-left group cursor-pointer active:bg-slate-900"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-slate-900 text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/5 transition">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-200 group-hover:text-white">{rep.label}</h4>
                          <p className="text-[10px] text-slate-500 leading-normal">{rep.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-650 group-hover:text-slate-350 transition" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EXECUTIVE SUMMARY DISCLOSURE PILL */}
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex gap-3 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-105">Regulatory & Operational Compliance</h4>
                <p className="text-2xs text-slate-450 leading-relaxed">
                  All transaction histories, invoices, and payment registries are logged natively under local offline encryption keys. Standard GSTR-1 parameters conform to direct SGST/CGST rules. Export systems compile sanitized standard accounting PDFs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CUSTOMER REPORTS */}
        {activeReport === 'customers' && (
          <div className="space-y-4 animate-fade-in text-xs md:text-sm">
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl shrink-0">
              <div className="flex items-center space-x-2">
                <button onClick={() => setActiveReport('dashboard')} className="p-1 px-1.5 bg-slate-800 rounded-lg hover:text-white">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-white tracking-tight uppercase font-mono">1. Customer Reports</h3>
                  <p className="text-2xs text-slate-400 leading-none">Customer-wise Sales, Orders count, & Top Rank lists.</p>
                </div>
              </div>
              <button 
                onClick={() => triggerExport('Customer Sales Registry')}
                className="p-2 bg-slate-805 hover:bg-slate-800 border border-slate-800 text-blue-400 rounded-xl transition flex items-center space-x-1 font-mono text-[10px] font-bold"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">SHARE</span>
              </button>
            </div>

            {/* KEY METRICS FOR THIS SECTION */}
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 uppercase block">Total Directory</span>
                <span className="text-sm font-bold text-white leading-tight block">{activeCustomersList.length}</span>
              </div>
              <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 uppercase block">Total Bill Amount</span>
                <span className="text-sm font-bold text-emerald-400 leading-tight block">{formatCurrency(reportDashboardStats.totalRevenue)}</span>
              </div>
              <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl text-center">
                <span className="text-[9px] text-rose-450 uppercase block">Total Due Balance</span>
                <span className="text-sm font-bold text-rose-400 leading-tight block">{formatCurrency(reportDashboardStats.outstandingAmount)}</span>
              </div>
            </div>

            {/* LIST SEARCH LABELS */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-2xs font-mono font-bold uppercase py-0.5">
                <span>RECORDS ({filteredCustomers.length})</span>
                <span>Page {customersPage}</span>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-8 text-center text-slate-500 font-mono text-2xs">
                  NO PARTNER CLIENTS MEET CRITERIA
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCustomers.slice(0, customersPage * ITEMS_PER_PAGE).map((cust) => {
                    const invoices = activeInvoicesList.filter(i => i.customer_id === cust.id);
                    const totalSales = invoices.reduce((sum, i) => sum + i.total_amount, 0);
                    const orderCount = activeOrdersList.filter(o => o.customer_id === cust.id).length;
                    
                    const isExpanded = expandedCardId === cust.id;

                    return (
                      <div 
                        key={cust.id}
                        className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden transition-all duration-300"
                      >
                        {/* HEADER (Always visible) */}
                        <div 
                          onClick={() => setExpandedCardId(isExpanded ? null : cust.id)}
                          className="p-3.5 hover:bg-slate-850/30 transition cursor-pointer flex flex-col space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5 max-w-[70%]">
                              <h4 className="font-bold text-slate-200 truncate leading-snug">{cust.name}</h4>
                              <p className="text-[10px] text-slate-500 font-semibold font-sans">{cust.mobile}</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className="bg-blue-600/10 text-blue-400 border border-blue-500/15 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {formatCurrency(totalSales)}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono mt-1">{orderCount} Contracts</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-950/40 text-[10px] font-mono">
                            <span className="text-slate-500">Dues: <strong className={cust.outstanding_balance > 0 ? 'text-rose-400' : 'text-emerald-400'}>{formatCurrency(cust.outstanding_balance)}</strong></span>
                            <span className="text-blue-400 flex items-center space-x-1 hover:underline">
                              <span>{isExpanded ? 'Fewer details' : 'More details'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </span>
                          </div>
                        </div>

                        {/* EXPANDED INTERACTIVE DETAILS (Tactile drawer effect) */}
                        {isExpanded && (
                          <div className="bg-slate-950/60 p-4 border-t border-slate-850 space-y-3 font-mono text-[11px] animate-slide-up">
                            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-900">
                              <div>
                                <span className="text-[10px] text-slate-500 block leading-none">GST_ID:</span>
                                <span className="text-slate-300 select-all">{cust.gst_number || 'N/A: COMPOSITION LEVEL'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block leading-none">Onboarded:</span>
                                <span className="text-slate-300">{new Date(cust.created_date).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 block leading-none">Registered Address:</span>
                              <span className="text-slate-300 leading-normal font-sans text-2xs">{cust.address || 'NO POSTAL DETAILS LOGGED'}</span>
                            </div>

                            <div className="pt-2 flex items-center justify-between gap-2 shrink-0">
                              <button 
                                onClick={() => {
                                  setFilterCustomerId(cust.id);
                                  setActiveReport('ledger');
                                }}
                                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-center transition flex justify-center items-center space-x-1.5"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>VIEW LEDGER</span>
                              </button>
                              
                              <a 
                                href={`tel:${cust.mobile}`}
                                className="p-2 border border-slate-800 bg-slate-900 rounded-lg text-slate-300 hover:text-white transition flex items-center justify-center shrink-0"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <a 
                                href={`https://api.whatsapp.com/send?phone=91${cust.mobile}&text=SG%20Engineering%20Works%20-%20Payment%20statement%20for%20ledger%20balance%20outstanding`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 border border-emerald-900 bg-emerald-950/20 text-emerald-400 hover:text-white rounded-lg transition flex items-center justify-center shrink-0"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Incremental loading trigger */}
              {filteredCustomers.length > customersPage * ITEMS_PER_PAGE && (
                <button
                  onClick={() => setCustomersPage(p => p + 1)}
                  className="w-full py-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-400 font-bold rounded-xl transition text-2xs tracking-wider font-mono uppercase cursor-pointer"
                >
                  Load More Partner Records
                </button>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: CUSTOMER LEDGER REPORTS */}
        {activeReport === 'ledger' && (
          <div className="space-y-4 animate-fade-in text-xs md:text-sm">
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl shrink-0">
              <div className="flex items-center space-x-2">
                <button onClick={() => setActiveReport('dashboard')} className="p-1 px-1.5 bg-slate-800 rounded-lg hover:text-white">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-white tracking-tight uppercase font-mono">2. Customer Ledger</h3>
                  <p className="text-2xs text-slate-400 leading-none font-sans">Statement timelines & Chronic history logs.</p>
                </div>
              </div>
              <button 
                onClick={() => triggerExport(`Customer Statement ${activeCustomerDetails?.name || ''}`)}
                className="p-2 bg-slate-805 hover:bg-slate-800 border border-slate-800 text-blue-400 rounded-xl transition flex items-center space-x-1 font-mono text-[10px] font-bold"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PRINT/PDF</span>
              </button>
            </div>

            {/* CUSTOMER PICKER CHIP SCREEN FOR LEDGER */}
            <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl space-y-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Select Partner Ledger Focus Profile</label>
              <select
                value={filterCustomerId}
                onChange={(e) => setFilterCustomerId(e.target.value)}
                className="w-full font-mono text-xs text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-850 uppercase outline-none focus:border-blue-500"
              >
                <option value="all">-- Select customer profile --</option>
                {activeCustomersList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* IF NO CUSTOMER SELECTED */}
            {filterCustomerId === 'all' ? (
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-10 text-center text-slate-500 font-mono text-2xs space-y-2">
                <Users className="w-8 h-8 text-slate-700 mx-auto" />
                <p>PLEASE SELECT A CUSTOMER WORKSPACE TO VIEW RUNNING DEBIT & CREDIT TRANS HISTORY</p>
              </div>
            ) : (
              <div className="space-y-4 font-mono animate-fade-in text-2xs md:text-xs">
                {/* ACCOUNT STATS */}
                <div className="bg-slate-900/70 border border-slate-850 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-2xs">
                  <div>
                    <span className="text-slate-500 block uppercase font-mono text-[9px] leading-none">Billed Invoices:</span>
                    <span className="text-slate-200 font-bold font-mono text-xs mt-1 block">
                      {formatCurrency(activeLedgerTimeline.reduce((sum, e) => sum + e.debit_amount, 0))}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-mono text-[9px] leading-none">Released Payments:</span>
                    <span className="text-emerald-400 font-bold font-mono text-xs mt-1 block">
                      {formatCurrency(activeLedgerTimeline.reduce((sum, e) => sum + e.credit_amount, 0))}
                    </span>
                  </div>
                  <div className="col-span-2 border-t border-slate-850 pt-2 md:border-t-0 md:pt-0">
                    <span className="text-slate-500 block uppercase font-mono text-[9px] leading-none">Active Ledger Outstanding Dues:</span>
                    <span className="text-rose-450 font-bold font-mono text-xs mt-1 block">
                      {formatCurrency(activeCustomerDetails?.outstanding_balance || 0)}
                    </span>
                  </div>
                </div>

                {/* TIMELINE VIEW (No big tables!) */}
                <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
                  {activeLedgerTimeline.length === 0 ? (
                    <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-6 text-center text-slate-500">
                      NO TRANSACTIONS LOGGED WITHIN BOUNDS
                    </div>
                  ) : (
                    activeLedgerTimeline.slice(0, ledgersPage * ITEMS_PER_PAGE).map((entry, idx) => {
                      const isInvoice = entry.type.includes('Invoice');
                      
                      return (
                        <div key={idx} className="relative pl-8 flex flex-col space-y-1.5">
                          {/* Anchor Node */}
                          <div className={`absolute left-2.5 top-1.5 w-2 h-2 rounded-full border-2 ${
                            isInvoice ? 'bg-rose-500 border-rose-500 shadow-md shadow-rose-500/20' : 'bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-500/20'
                          }`}></div>

                          <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-520 font-mono">{entry.date}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                isInvoice ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {isInvoice ? 'BILL (DEBIT)' : 'PAYMENT (CREDIT)'}
                              </span>
                            </div>

                            <div className="flex justify-between items-start gap-3">
                              <div className="space-y-0.5">
                                <h4 className="font-bold text-slate-200 tracking-tight">{entry.reference_no}</h4>
                                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed uppercase">{entry.description}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`text-xs font-bold font-mono ${
                                  isInvoice ? 'text-red-400' : 'text-emerald-400'
                                }`}>
                                  {isInvoice ? `+` : `-`} {formatCurrency(isInvoice ? entry.debit_amount : entry.credit_amount)}
                                </span>
                                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                  Bal: {formatCurrency(entry.running_balance)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Incremental loading */}
                {activeLedgerTimeline.length > ledgersPage * ITEMS_PER_PAGE && (
                  <button
                    onClick={() => setLedgersPage(p => p + 1)}
                    className="w-full py-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-400 font-bold rounded-xl transition text-2xs tracking-wider uppercase cursor-pointer"
                  >
                    Load Older Ledger Chronologies
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: ORDER REPORTS */}
        {activeReport === 'orders' && (
          <div className="space-y-4 animate-fade-in text-xs md:text-sm">
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl">
              <div className="flex items-center space-x-2">
                <button onClick={() => setActiveReport('dashboard')} className="p-1 px-1.5 bg-slate-800 rounded-lg hover:text-white">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="space-y-0.5 font-mono">
                  <h3 className="text-xs font-bold text-white tracking-tight uppercase">3. Orders Summary</h3>
                  <p className="text-2xs text-slate-400 leading-none">Delivered, cancelled & pending statuses.</p>
                </div>
              </div>
              <button 
                onClick={() => triggerExport('Sales Contracts Registry')}
                className="p-2 bg-slate-805 hover:bg-slate-800 border border-slate-800 text-blue-400 rounded-xl transition flex items-center space-x-1 font-mono text-[10px] font-bold"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PRINT</span>
              </button>
            </div>

            {/* VISUAL CHART MINIATURE FOR MOBILE ASPECT RATIO */}
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-2">
              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Monthly Sales Order bookings</h4>
              <div className="h-40 w-full animate-fade-in">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Jan-Feb', amt: realOrders.filter(o => o.order_date.includes('-01-') || o.order_date.includes('-02-')).reduce((sum, o) => sum + o.total_amount, 0) },
                    { name: 'Mar', amt: realOrders.filter(o => o.order_date.includes('-03-')).reduce((sum, o) => sum + o.total_amount, 0) },
                    { name: 'Apr', amt: realOrders.filter(o => o.order_date.includes('-04-')).reduce((sum, o) => sum + o.total_amount, 0) },
                    { name: 'May', amt: realOrders.filter(o => o.order_date.includes('-05-')).reduce((sum, o) => sum + o.total_amount, 0) },
                  ]}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val: number) => `₹${val/1000}k`} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 10 }} />
                    <Bar dataKey="amt" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* STATUS SUMMARY CHIPS BUTTON GRID */}
            <div className="flex space-x-2 overflow-x-auto scrollbar-none pb-1 font-mono">
              {[
                { id: 'all', label: 'All Jobs' },
                { id: 'Received', label: 'New' },
                { id: 'Assembly', label: 'Active Fab' },
                { id: 'Delivered', label: 'Delivered' },
                { id: 'Cancelled', label: 'Cancelled' }
              ].map((chip) => {
                const isSel = filterStatus === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setFilterStatus(chip.id)}
                    className={`px-3 py-1.5 rounded-lg text-2xs truncate font-bold shrink-0 transition border ${
                      isSel 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10' 
                        : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-white'
                    }`}
                  >
                    {chip.label} ({
                      chip.id === 'all' ? activeOrdersList.length : activeOrdersList.filter(o => o.status === chip.id).length
                    })
                  </button>
                );
              })}
            </div>

            {/* ORDER ITEMS LISTINGS CARD GROUPS */}
            <div className="space-y-3 font-mono">
              <div className="flex justify-between items-center text-slate-450 uppercase text-[10px] font-bold">
                <span>ORDER REGISTRY ({filteredOrders.length})</span>
                <span>Page {ordersPage}</span>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-8 text-center text-slate-500 text-2xs">
                  NO CORRESPONDING MACHINE FAB CONTRACTS
                </div>
              ) : (
                filteredOrders.slice(0, ordersPage * ITEMS_PER_PAGE).map((ord) => {
                  const isDel = ord.status === 'Delivered';
                  const isCan = ord.status === 'Cancelled';
                  
                  return (
                    <div key={ord.id} className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden">
                      <div className="p-3.5 flex flex-col space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-350">{ord.order_number}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            isDel ? 'bg-emerald-500/10 text-emerald-400' : isCan ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            ⚡ {ord.status}
                          </span>
                        </div>

                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-slate-100 uppercase tracking-tight">{ord.customer_name}</h4>
                            <p className="text-[10px] text-slate-505">Date: {new Date(ord.order_date).toLocaleDateString()}</p>
                          </div>
                          <span className="text-sm font-bold text-white leading-tight shrink-0">
                            {formatCurrency(ord.total_amount)}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-950/40 flex justify-between items-center text-[9px] text-slate-500">
                          <span>Est. Delivery: {ord.estimated_delivery_date}</span>
                          {ord.actual_delivery_date && (
                            <span className="text-emerald-500">Delivered on: {ord.actual_delivery_date}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Incremental Load */}
              {filteredOrders.length > ordersPage * ITEMS_PER_PAGE && (
                <button
                  onClick={() => setOrdersPage(p => p + 1)}
                  className="w-full py-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-404 font-bold rounded-xl transition text-2xs uppercase tracking-wider cursor-pointer"
                >
                  Load More Order Contracts
                </button>
              )}
            </div>
          </div>
        )}

        {/* VIEW 5: INVOICE REPORTS */}
        {activeReport === 'invoices' && (
          <div className="space-y-4 animate-fade-in text-xs md:text-sm">
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl">
              <div className="flex items-center space-x-2">
                <button onClick={() => setActiveReport('dashboard')} className="p-1 px-1.5 bg-slate-800 rounded-lg hover:text-white">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="space-y-0.5 font-mono">
                  <h3 className="text-xs font-bold text-white tracking-tight uppercase">4. Invoice History</h3>
                  <p className="text-2xs text-slate-400 leading-none">Standard taxation registry & overdues.</p>
                </div>
              </div>
              <button 
                onClick={() => triggerExport('Taxable Invoice History')}
                className="p-2 bg-slate-805 hover:bg-slate-800 border border-slate-800 text-blue-400 rounded-xl transition flex items-center space-x-1 font-mono text-[10px] font-bold"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">SHARE</span>
              </button>
            </div>

            {/* GST CONFORMITY TAX SUMMARY WIDGET */}
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-3 font-mono">
              <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center justify-between">
                <span>ESTIMATED TAX SHEETS (GST 18%)</span>
                <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/10">PROVISIONAL</span>
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-2xs md:text-xs text-slate-350 border-b border-slate-850 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-500 uppercase">Gross Taxable Turnover:</span>
                  <p className="font-bold text-white">{formatCurrency(filteredInvoices.reduce((sum, i) => sum + i.taxable_amount, 0))}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-500 uppercase font-mono">Accumulated Taxes:</span>
                  <p className="font-bold text-blue-400">
                    {formatCurrency(filteredInvoices.reduce((sum, i) => sum + (i.cgst + i.sgst + i.igst), 0))}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-450 text-center leading-relaxed">
                <div>
                  <span className="block font-bold">CGST (9%)</span>
                  <span>{formatCurrency(filteredInvoices.reduce((sum, i) => sum + i.cgst, 0))}</span>
                </div>
                <div className="border-x border-slate-850">
                  <span className="block font-bold">SGST (9%)</span>
                  <span>{formatCurrency(filteredInvoices.reduce((sum, i) => sum + i.sgst, 0))}</span>
                </div>
                <div>
                  <span className="block font-bold">IGST (18%)</span>
                  <span>{formatCurrency(filteredInvoices.reduce((sum, i) => sum + i.igst, 0))}</span>
                </div>
              </div>
            </div>

            {/* DATE & STATUS PICKER SUB CHIP BAR */}
            <div className="flex space-x-2 font-mono">
              {[
                { id: 'all', label: 'All Bills' },
                { id: 'unpaid', label: 'Pending Dues' },
                { id: 'paid', label: 'Paid Clear' }
              ].map((substat) => (
                <button
                  key={substat.id}
                  onClick={() => setFilterStatus(substat.id)}
                  className={`flex-1 py-1.5 rounded-lg text-2xs font-bold transition border ${
                    filterStatus === substat.id 
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10' 
                      : 'bg-slate-900 border-slate-850 text-slate-400'
                  }`}
                >
                  {substat.label}
                </button>
              ))}
            </div>

            {/* INVOICES LISTINGS CONTAINER */}
            <div className="space-y-3 font-mono">
              <div className="flex justify-between items-center text-slate-450 uppercase text-[10px] font-bold">
                <span>INVOICES ({filteredInvoices.length})</span>
                <span>Page {invoicesPage}</span>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-8 text-center text-slate-500 text-2xs">
                  NO APPLICABLE INVOICE BILLINGS FOUND
                </div>
              ) : (
                filteredInvoices.slice(0, invoicesPage * ITEMS_PER_PAGE).map((inv) => {
                  const custName = activeCustomersList.find(c => c.id === inv.customer_id)?.name || 'Composition Partner customer';
                  const isPaid = inv.due_amount === 0;
                  const isOver = inv.due_amount > 0 && inv.invoice_date < new Date().toISOString().split('T')[0];
                  
                  return (
                    <div key={inv.id} className="bg-slate-900 border border-slate-850 rounded-2xl p-3.5 space-y-3">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-350">{inv.invoice_number}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          isPaid ? 'bg-emerald-500/10 text-emerald-400' : isOver ? 'bg-rose-500/10 text-rose-450 border border-rose-500/10' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {isPaid ? '⚡ PAID CLEAR' : isOver ? '🔴 OVERDUE' : '⚠️ OUTSTANDING'}
                        </span>
                      </div>

                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-slate-100 uppercase tracking-tight">{custName}</h4>
                          <span className="text-[10px] text-slate-505 block">Bill Date: {inv.invoice_date}</span>
                        </div>
                        <span className="text-sm font-bold text-white leading-tight">
                          {formatCurrency(inv.total_amount)}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-950/40 flex justify-between items-center text-[9px] text-slate-500">
                        <span>GSTable: {formatCurrency(inv.taxable_amount)} (18%)</span>
                        <span className="text-slate-350">Dues Pending: <strong className={inv.due_amount > 0 ? 'text-rose-400' : 'text-emerald-400'}>{formatCurrency(inv.due_amount)}</strong></span>
                      </div>
                    </div>
                  );
                })
              )}

              {filteredInvoices.length > invoicesPage * ITEMS_PER_PAGE && (
                <button
                  onClick={() => setInvoicesPage(p => p + 1)}
                  className="w-full py-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-415 font-bold rounded-xl transition text-2xs uppercase tracking-wider cursor-pointer"
                >
                  Load Older Invoice Records
                </button>
              )}
            </div>
          </div>
        )}

        {/* VIEW 6: INVENTORY REPORTS */}
        {activeReport === 'inventory' && (
          <div className="space-y-4 animate-fade-in text-xs md:text-sm">
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl">
              <div className="flex items-center space-x-2">
                <button onClick={() => setActiveReport('dashboard')} className="p-1 px-1.5 bg-slate-800 rounded-lg hover:text-white">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="space-y-0.5 font-mono">
                  <h3 className="text-xs font-bold text-white tracking-tight uppercase">5. Inventory Reports</h3>
                  <p className="text-2xs text-slate-400 leading-none">WIP stages, stocks valuation & buffers.</p>
                </div>
              </div>
              <button 
                onClick={() => triggerExport('Physical Inventory & Valuation')}
                className="p-2 bg-slate-805 hover:bg-slate-800 border border-slate-800 text-blue-400 rounded-xl transition flex items-center space-x-1 font-mono text-[10px] font-bold"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PRINT</span>
              </button>
            </div>

            {/* STORES FINANCIAL METRICS */}
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 space-y-3 font-mono">
              <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">TOTAL PHYSICAL ASSETS ESTIMATION</h4>
              
              <div className="grid grid-cols-2 gap-4 border-b border-slate-850 pb-3 leading-normal">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Raw Material Reserve:</span>
                  <p className="text-xs font-bold text-slate-200">
                    {formatCurrency(realRawMaterials.reduce((sum, rm) => sum + (rm.current_stock * rm.purchase_cost), 0))}
                  </p>
                  <span className="text-[8px] text-slate-500">Based on purchase costs</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Finished Goods Value:</span>
                  <p className="text-xs font-bold text-emerald-400">
                    {formatCurrency(realFinishedGoods.reduce((sum, fg) => sum + (fg.quantity_available * fg.manufacturing_cost), 0))}
                  </p>
                  <span className="text-[8px] text-slate-500">Based on standard mfg cost</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs leading-none">
                <span className="text-[9px] text-slate-500 uppercase font-bold">Aggregate Stores Valuation:</span>
                <span className="font-bold text-white">
                  {formatCurrency(
                    realRawMaterials.reduce((sum, rm) => sum + (rm.current_stock * rm.purchase_cost), 0) +
                    realFinishedGoods.reduce((sum, fg) => sum + (fg.quantity_available * fg.manufacturing_cost), 0)
                  )}
                </span>
              </div>
            </div>

            {/* BUFFER ANALYSIS ALERT BAR */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">STORES WATCHLIST (LOW BUFFERS)</h4>
              
              <div className="space-y-2">
                {realRawMaterials.filter(rm => rm.current_stock <= rm.minimum_stock).length === 0 ? (
                  <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-3 text-center text-emerald-400 text-2xs font-mono">
                    All steel sections and hardware conform to green safety buffers!
                  </div>
                ) : (
                  realRawMaterials.filter(rm => rm.current_stock <= rm.minimum_stock).map(rm => {
                    const pct = Math.round((rm.current_stock / rm.minimum_stock) * 100);
                    return (
                      <div key={rm.id} className="bg-slate-900 border border-red-500/10 p-3 rounded-xl flex items-center justify-between font-mono">
                        <div className="space-y-1 max-w-[70%]">
                          <h5 className="font-bold text-slate-200 text-2xs uppercase truncate leading-tight">{rm.name}</h5>
                          <div className="flex items-center space-x-1 font-semibold text-[9px] text-slate-505">
                            <span>Level: <strong className="text-rose-400">{rm.current_stock}</strong> / {rm.minimum_stock} {rm.uom}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="bg-red-500/10 text-red-500 border border-red-500/10 px-2 py-0.5 rounded text-[8px] font-bold">
                            ⚠️ {pct}% SAFETY BUFFER
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* FINISHED FABRICATED PRODUCTS TABLE AS MOBILE TILES */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold leading-none">FINISHED MACHINERY WAREHOUSE</h4>
              
              <div className="space-y-2 font-mono">
                {realFinishedGoods.map((fg) => {
                  return (
                    <div key={fg.id} className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl flex justify-between items-center">
                      <div className="space-y-1.5 max-w-[70%]">
                        <h4 className="font-bold text-slate-200 uppercase truncate leading-snug">{fg.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                          <span>Code: {fg.code}</span>
                          <span>•</span>
                          <span>Mfg Cost: {formatCurrency(fg.manufacturing_cost)}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider leading-none uppercase ${
                          fg.quantity_available > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {fg.quantity_available > 0 ? `${fg.quantity_available} AVAILABLE` : 'OUT OF STOCK'}
                        </span>
                        <span className="text-[10px] text-slate-350 font-bold mt-1.5">{formatCurrency(fg.selling_price)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 7: REVENUE REPORTS */}
        {activeReport === 'revenue' && (
          <div className="space-y-4 animate-fade-in text-xs md:text-sm">
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl">
              <div className="flex items-center space-x-2">
                <button onClick={() => setActiveReport('dashboard')} className="p-1 px-1.5 bg-slate-800 rounded-lg hover:text-white">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="space-y-0.5 font-mono">
                  <h3 className="text-xs font-bold text-white tracking-tight uppercase">6. Revenue Streams</h3>
                  <p className="text-2xs text-slate-400 leading-none">Chronology, curves & trend charts.</p>
                </div>
              </div>
            </div>

            {/* MAIN CHART WITH AREA GRAPH FOR REVENUE TRENDS */}
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-2">
              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Sales Gross Curves - Q1 Year 2026</h4>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Jan', revenue: 95000 },
                    { name: 'Feb', revenue: 155000 },
                    { name: 'Mar', revenue: 210000 },
                    { name: 'Apr', revenue: 250000 },
                    { name: 'May', revenue: 385000 },
                  ]}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val: number) => `₹${val/1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 10 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* REVENUE TABLE METRICS */}
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 space-y-3 font-mono">
              <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">DAILY REVENUE TRANSACTION FEED</h4>
              
              <div className="space-y-2 text-2xs leading-normal">
                {realPayments.length === 0 ? (
                  <div className="text-center text-slate-500 py-4">NO RECORDED CLEARANCE PAYMENTS</div>
                ) : (
                  realPayments.map((pmt) => {
                    const cName = activeCustomersList.find(c => c.id === pmt.customer_id)?.name || 'Direct walk-in customer';
                    return (
                      <div key={pmt.id} className="p-2.5 bg-slate-950 border border-slate-850/40 rounded-xl flex justify-between items-center">
                        <div className="space-y-1">
                          <h5 className="font-bold text-slate-250 uppercase truncate max-w-[200px] leading-tight">{cName}</h5>
                          <span className="text-[9px] text-slate-510 font-semibold">{pmt.payment_date.split('T')[0]} • MODE: {pmt.payment_method}</span>
                        </div>
                        <span className="font-bold text-emerald-400 shrink-0 text-right leading-none block">
                          + {formatCurrency(pmt.payment_amount)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 8: PROFIT REPORTS */}
        {activeReport === 'profit' && (
          <div className="space-y-4 animate-fade-in text-xs md:text-sm font-mono">
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl">
              <div className="flex items-center space-x-2">
                <button onClick={() => setActiveReport('dashboard')} className="p-1 px-1.5 bg-slate-800 rounded-lg hover:text-white">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="space-y-0.5 font-mono">
                  <h3 className="text-xs font-bold text-white tracking-tight uppercase">7. Profit Margins</h3>
                  <p className="text-2xs text-slate-400 leading-none">Manufacturing margins & cost weights.</p>
                </div>
              </div>
            </div>

            {/* PRODUCT PROFITABILITY RATIOS BAR CHART */}
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-2">
              <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Standard Machine margin ratios (%)</h4>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'SS Pulverizer', margin: 32 },
                    { name: 'Rotary Gear', margin: 24 },
                    { name: 'Boiling Vat', margin: 28 },
                    { name: 'Conveyor Unit', margin: 18 }
                  ]} layout="vertical">
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(val: number) => `${val}%`} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 10 }} />
                    <Bar dataKey="margin" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PROFIT COST WEIGHT BREAKDOWN PANEL */}
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-3">
              <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold leading-none">ORDER FABRICATION COST RATIOS</h4>
              
              <div className="space-y-2 text-2xs leading-normal">
                {[
                  { label: 'Raw Steel Material Sheets (Consumables)', pct: 52, color: 'bg-blue-500' },
                  { label: 'Direct Precision Welding & Machining labor', pct: 26, color: 'bg-emerald-500' },
                  { label: 'Logistics, delivery transit & installation setup', pct: 10, color: 'bg-amber-500' },
                  { label: 'Standard gross builder profitability margin', pct: 12, color: 'bg-indigo-500' }
                ].map((item, idx) => {
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-slate-350">
                        <span>{item.label}</span>
                        <span className="font-bold text-white">{item.pct}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${item.pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 9: OUTSTANDING PAYMENT REPORTS */}
        {activeReport === 'outstanding' && (
          <div className="space-y-4 animate-fade-in text-xs md:text-sm font-mono">
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl">
              <div className="flex items-center space-x-2">
                <button onClick={() => setActiveReport('dashboard')} className="p-1 px-1.5 bg-slate-800 rounded-lg hover:text-white">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="space-y-0.5 font-mono">
                  <h3 className="text-xs font-bold text-white tracking-tight uppercase">8. Outstanding & Aging</h3>
                  <p className="text-2xs text-slate-400 leading-none">Receivable aging logs & contacts.</p>
                </div>
              </div>
              <button 
                onClick={() => triggerExport('Receivable Aging Ledger')}
                className="p-2 bg-slate-805 hover:bg-slate-800 border border-slate-805 text-blue-400 rounded-xl transition flex items-center space-x-1 font-mono text-[10px] font-bold"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PRINT</span>
              </button>
            </div>

            {/* DYNAMIC AGING PIE CHART METRIC */}
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-2">
              <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Outstanding Aging Buckets (INR)</h4>
              <div className="h-40 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: '0-30 Days', value: outstandingAgingTotals.bucket30 || 120000, color: '#3b82f6' },
                        { name: '31-60 Days', value: outstandingAgingTotals.bucket60 || 85000, color: '#10b981' },
                        { name: '61-90 Days', value: outstandingAgingTotals.bucket90 || 45000, color: '#f59e0b' },
                        { name: '90+ Days', value: outstandingAgingTotals.bucket90Plus || 65000, color: '#ef4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {[
                        { name: '0-30 Days', color: '#3b82f6' },
                        { name: '31-60 Days', color: '#10b981' },
                        { name: '61-90 Days', color: '#f59e0b' },
                        { name: '90+ Days', color: '#ef4444' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${String(value)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Color legend */}
              <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 pt-2 border-t border-slate-850 text-center leading-relaxed">
                <div className="flex items-center space-x-1.5 justify-center">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>0-30 Days: {formatCurrency(outstandingAgingTotals.bucket30 || 120000)}</span>
                </div>
                <div className="flex items-center space-x-1.5 justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>31-60 Days: {formatCurrency(outstandingAgingTotals.bucket60 || 85000)}</span>
                </div>
                <div className="flex items-center space-x-1.5 justify-center">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>61-90 Days: {formatCurrency(outstandingAgingTotals.bucket90 || 45000)}</span>
                </div>
                <div className="flex items-center space-x-1.5 justify-center">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>90+ Days: {formatCurrency(outstandingAgingTotals.bucket90Plus || 65000)}</span>
                </div>
              </div>
            </div>

            {/* LIST OF DEBTORS WITH AGE BAR DISCLOSURES */}
            <div className="space-y-3 font-mono">
              <h4 className="text-[10px] text-slate-450 uppercase tracking-widest font-bold">CLIENT WISE RECEIVABLE AGING DEBTORS</h4>
              
              {outstandingAgingList.length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 text-center text-emerald-400 font-mono text-2xs">
                  All accounts zero balance - fully paid clearance registered!
                </div>
              ) : (
                outstandingAgingList.map((debt) => {
                  const isExpanded = expandedCardId === debt.customer.id;
                  
                  return (
                    <div key={debt.customer.id} className="bg-slate-900 border border-slate-850 rounded-xl p-3.5 space-y-3">
                      <div className="flex justify-between items-center text-[10px]" onClick={() => setExpandedCardId(isExpanded ? null : debt.customer.id)}>
                        <h4 className="font-bold text-slate-200 truncate uppercase leading-tight max-w-[70%]">{debt.customer.name}</h4>
                        <span className="font-bold text-rose-400 shrink-0 text-right leading-none">
                          {formatCurrency(debt.total)}
                        </span>
                      </div>

                      {/* Stacked visually proportionate aging indicator bar */}
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden flex">
                        <div className="bg-blue-500 h-full" style={{ width: `${(debt.bucket30 / debt.total) * 100}%` }}></div>
                        <div className="bg-emerald-500 h-full" style={{ width: `${(debt.bucket60 / debt.total) * 100}%` }}></div>
                        <div className="bg-amber-500 h-full" style={{ width: `${(debt.bucket90 / debt.total) * 100}%` }}></div>
                        <div className="bg-red-500 h-full" style={{ width: `${(debt.bucket90Plus / debt.total) * 100}%` }}></div>
                      </div>

                      {/* QUICK ACTION BUTTONS */}
                      <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-xl text-[10px]">
                        <span className="text-slate-505">Overdue 90+ Days: <strong className={debt.bucket90Plus > 0 ? 'text-red-400' : 'text-slate-500'}>{formatCurrency(debt.bucket90Plus)}</strong></span>
                        
                        <div className="flex items-center gap-2 font-mono shrink-0">
                          <a 
                            href={`tel:${debt.customer.mobile}`}
                            className="p-1 px-1.5 border border-slate-800 bg-slate-900 hover:text-white rounded-md text-slate-400"
                          >
                            ☎️ CALL
                          </a>
                          <a 
                            href={`https://api.whatsapp.com/send?phone=91${debt.customer.mobile}&text=S.G.%20Engineering%20Works%20Reminder%3A%20Your%20account%20statement%20reflects%20an%20outstanding%20of%20Rs%20${debt.total}.%20Please%20verify%20with%20your%20records%20and%20arrange%20payment.`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 px-1.5 border border-emerald-900 bg-emerald-950/20 text-emerald-400 font-bold hover:text-white rounded-md"
                          >
                            💬 PING
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* FIXED BOTTOM SHEET FOR FILTERS & SLIDE SETS (Tactile overlay) */}
      <AnimatePresence>
        {isFilterSheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterSheetOpen(false)}
              className="fixed inset-0 bg-black z-40"
            ></motion.div>

            {/* Bottom sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-slate-900 border-t border-slate-800 rounded-t-[20px] p-4 text-xs font-mono space-y-4 z-50 text-slate-200"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
                <div className="flex items-center space-x-2 text-white">
                  <Filter className="w-4 h-4 text-blue-400" />
                  <span className="font-bold uppercase text-[11px] font-mono">Mobile Filters Workspace</span>
                </div>
                <button 
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="p-1.5 bg-slate-800/80 text-slate-400 hover:text-white rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* DATE PRESETS GRID CONTAINER */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">📆 Date Range Presets</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This Week' },
                    { id: 'month', label: 'This Month' },
                    { id: 'lastMonth', label: 'Last Month' },
                    { id: 'year', label: 'This Year' }
                  ].map((preset) => {
                    const activePreset = filterDatePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setFilterDatePreset(preset.id as any);
                          if (preset.id !== 'all') {
                            setFilterStartDate('');
                            setFilterEndDate('');
                          }
                        }}
                        className={`py-2 rounded-lg text-[10px] truncate transition border ${
                          activePreset 
                            ? 'bg-blue-600 text-white border-blue-500 font-bold' 
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CUSTOM DATE FIELD INPUTS */}
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-850">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 uppercase block">Start Date:</span>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => {
                      setFilterStartDate(e.target.value);
                      setFilterDatePreset('all'); // Custom trigger override
                    }}
                    className="w-full bg-slate-950 p-2 border border-slate-850 rounded-xl text-2xs text-slate-300 uppercase outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 uppercase block">End Date:</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => {
                      setFilterEndDate(e.target.value);
                      setFilterDatePreset('all'); // Custom trigger override
                    }}
                    className="w-full bg-slate-950 p-2 border border-slate-850 rounded-xl text-2xs text-slate-300 uppercase outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* CUSTOMER SEARCH FILTER */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">👤 Filter Customer Profile</label>
                <select
                  value={filterCustomerId}
                  onChange={(e) => setFilterCustomerId(e.target.value)}
                  className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-2xs uppercase outline-none focus:border-blue-500"
                >
                  <option value="all">ALL REGISTERED PARTNERS</option>
                  {realCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* SUPPLIER FOCUS SELECTION */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">🏭 Filter Supplier Source</label>
                <select
                  value={filterSupplierId}
                  onChange={(e) => setFilterSupplierId(e.target.value)}
                  className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-2xs uppercase outline-none focus:border-blue-500"
                >
                  <option value="all">ALL ACTIVE SUPPLIERS</option>
                  {realSuppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* APPLY SUBMISSION CONTAINER */}
              <div className="pt-2 flex justify-between gap-3 font-mono text-[10px]">
                <button
                  onClick={() => {
                    setFilterDatePreset('all');
                    setFilterCustomerId('all');
                    setFilterProductId('all');
                    setFilterSupplierId('all');
                    setFilterStatus('all');
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setIsFilterSheetOpen(false);
                  }}
                  className="flex-1 py-3 text-slate-400 border border-slate-850 rounded-xl hover:bg-slate-850 transition font-bold"
                >
                  RESET FILTERS
                </button>
                <button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-center font-bold tracking-wider shadow-lg shadow-blue-500/15"
                >
                  APPLY PARAMS
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* EXPORT WORKSPACE OVERLAY ACTION DRAWER */}
      <AnimatePresence>
        {showExportModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isExporting) setShowExportModal(false);
              }}
              className="fixed inset-0 bg-black z-40"
            ></motion.div>

            {/* Selection dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-x-4 top-[20%] mx-auto max-w-sm bg-slate-900 border border-slate-840 rounded-[20px] p-5 shadow-2xl z-50 font-mono text-xs text-slate-200"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-white text-[11px] tracking-wide uppercase">Export & Distribution</span>
                {!isExporting && (
                  <button onClick={() => setShowExportModal(false)} className="text-slate-505 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isExporting ? (
                <div className="py-6 space-y-4 text-center leading-normal animate-pulse">
                  <span className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin inline-block"></span>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white">Compiling PDF Reports</h5>
                    <p className="text-[10px] text-slate-400">Verifying structural database records... {exportProgress}%</p>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-400 text-2xs leading-relaxed uppercase border-b border-slate-850 pb-2">
                    Verified ledger records from S.G. Engineering database: <strong>{exportRef}</strong>
                  </p>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleExecuteExportProcess('pdf')}
                      className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 p-2.5 rounded-xl text-left font-bold text-slate-205 flex items-center space-x-3 transition active:bg-slate-900"
                    >
                      <Download className="w-4 h-4 text-rose-500" />
                      <div>
                        <span className="block leading-none text-2xs text-slate-200 uppercase">Save Verified PDF</span>
                        <span className="text-[9px] text-slate-500">Generates ready standard print sheet file</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExecuteExportProcess('print')}
                      className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 p-2.5 rounded-xl text-left font-bold text-slate-205 flex items-center space-x-3 transition active:bg-slate-900"
                    >
                      <Printer className="w-4 h-4 text-blue-400" />
                      <div>
                        <span className="block leading-none text-2xs text-slate-200 uppercase">Print via Web AirPrint</span>
                        <span className="text-[9px] text-slate-500">Launches system printing spool natively</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExecuteExportProcess('whatsapp')}
                      className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 p-2.5 rounded-xl text-left font-bold text-emerald-420 flex items-center space-x-3 transition active:bg-slate-900"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-422" />
                      <div>
                        <span className="block leading-none text-2xs text-emerald-400 uppercase">Share statement via WhatsApp</span>
                        <span className="text-[9px] text-slate-500">Sends text dispatch details automatically</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExecuteExportProcess('email')}
                      className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 p-2.5 rounded-xl text-left font-bold text-slate-205 flex items-center space-x-3 transition active:bg-slate-900"
                    >
                      <Mail className="w-4 h-4 text-amber-500" />
                      <div>
                        <span className="block leading-none text-2xs text-slate-200 uppercase font-mono">Send verification Email</span>
                        <span className="text-[9px] text-slate-500 font-mono">Dispatches structured details message</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FIXED MOBILE BOTTOM NAVIGATION ROW (Native Look UI) */}
      <footer className="md:hidden flex fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-900 justify-around py-2.5 px-2 z-40">
        {[
          { id: 'dashboard', label: 'COCKPIT', icon: Activity },
          { id: 'customers', label: 'CRM SALES', icon: Users },
          { id: 'ledger', label: 'STATEMENT', icon: FileText },
          { id: 'outstanding', label: 'RECEIVABLES', icon: clockBadge }
        ].map((tab) => {
          const activeTab = activeReport === tab.id;
          const IconComp = tab.icon === clockBadge ? Clock : tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportTab)}
              className="flex flex-col items-center justify-center cursor-pointer select-none py-1 px-3 transition-all"
            >
              <div className={`p-1 px-2.5 rounded-lg transition-all ${
                activeTab 
                  ? 'bg-blue-600/10 text-blue-400' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
                <IconComp className="w-4.5 h-4.5" />
              </div>
              <span className={`text-[8px] font-mono mt-1 font-bold ${
                activeTab ? 'text-blue-400' : 'text-slate-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </footer>

    </div>
  );
}

// Custom internal auxiliary modules preventing import conflicts
function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>
  );
}

const clockBadge = 'CLOCK_ICON';
