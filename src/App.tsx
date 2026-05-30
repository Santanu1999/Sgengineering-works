/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { dbAPI, initMockDatabase, ISimulatedOrder, ISimulatedInvoice, ISimulatedPayment } from './data/mock-database';
import { triggerAutomaticBackup } from './lib/gdrive';
import { ICustomer, ICustomerInteraction, ILedgerEntry } from './types/customer.interface';

// Child components
import PINLockScreen from './components/PINLockScreen';
import CustomerForm from './components/CustomerForm';
import AddInteractionModal from './components/AddInteractionModal';
import ReceivePaymentModal from './components/ReceivePaymentModal';
import PrintLedgerModal from './components/PrintLedgerModal';
import CustomDialogModal from './components/CustomDialogModal';
import InventoryModule from './components/InventoryModule';
import ReportsModule from './components/ReportsModule';
import BackupModule from './components/BackupModule';

// Lucide icon components
import { 
  Users, UserPlus, Search, ShieldCheck, Database, Calendar, Trash2, 
  MessageSquare, FileText, ArrowRight, ArrowLeft, UserCheck, TrendingUp, Sparkles, 
  Filter, RotateCcw, AlertCircle, RefreshCw, PenTool, Edit3, ArrowLeftRight, CheckCircle2,
  Boxes, BarChart3, Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab ] = useState<'crm' | 'dashboard' | 'inventory' | 'reports' | 'backup'>('crm');
  
  // State managers
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDuesOnly, setFilterDuesOnly] = useState<boolean>(false);

  // --- Dashboard Real-Time Calculated Analytics ---
  const currentInvoices = useMemo(() => {
    return dbAPI.getInvoices();
  }, [customers, selectedCustomerId]);

  const currentPayments = useMemo(() => {
    return dbAPI.getPayments();
  }, [customers, selectedCustomerId]);

  const currentOrders = useMemo(() => {
    return dbAPI.getOrders();
  }, [customers, selectedCustomerId]);

  const dashboardStats = useMemo(() => {
    const totalRevenue = currentInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    // Dynamic operating expense ratio + base operational seat cost
    const totalExpenses = Math.round(totalRevenue * 0.42) + 12000;
    const totalProfit = Math.max(0, totalRevenue - totalExpenses);
    const outstandingAmount = customers.reduce((sum, c) => sum + c.outstanding_balance, 0);
    const totalCustomers = customers.length;
    const totalOrders = currentOrders.filter(o => o.status !== 'Cancelled').length;

    return {
      totalCustomers,
      totalOrders,
      totalRevenue,
      totalExpenses,
      totalProfit,
      outstandingAmount,
    };
  }, [customers, currentInvoices, currentOrders]);

  const lowStockItems = useMemo(() => {
    return [
      {
        id: 'rm-1',
        name: 'Stainless Steel Sheets (SS-304, 3mm)',
        quantity: 8,
        unit: 'Sheet',
        minimum_stock_level: 20,
        supplier_name: 'Jindal Steel Distributors',
        mobile: '9836011223'
      },
      {
        id: 'rm-2',
        name: 'Mild Steel Angle Irons (50x50x5mm)',
        quantity: 15,
        unit: 'Length',
        minimum_stock_level: 40,
        supplier_name: 'Kolkata Steel Mart',
        mobile: '9433182910'
      },
      {
        id: 'rm-3',
        name: 'Welding Electrodes Box (E6013, 3.15mm)',
        quantity: 2,
        unit: 'Packet',
        minimum_stock_level: 12,
        supplier_name: 'Esab Welding Hub',
        mobile: '8017054312'
      },
      {
        id: 'rm-4',
        name: 'Heating Element Coils (3KW U-Shape)',
        quantity: 0,
        unit: 'Unit',
        minimum_stock_level: 5,
        supplier_name: 'Thermocraft Heaters Ltd',
        mobile: '7003511982'
      },
      {
        id: 'rm-5',
        name: 'Heavy Duty Pneumatic Cylinders (80mm bore)',
        quantity: 1,
        unit: 'Unit',
        minimum_stock_level: 4,
        supplier_name: 'Festo Automation Agency',
        mobile: '9123045678'
      }
    ];
  }, []);

  const monthlyTrends = useMemo(() => {
    return [
      { month: 'Jan 2026', revenue: 150000, expenses: 60000, profit: 90000, salesCount: 2 },
      { month: 'Feb 2026', revenue: 210000, expenses: 90000, profit: 120000, salesCount: 3 },
      { month: 'Mar 2026', revenue: 180000, expenses: 75000, profit: 105000, salesCount: 2 },
      { month: 'Apr 2026', revenue: 310000, expenses: 130000, profit: 180000, salesCount: 4 },
      { 
        month: 'May 2026', 
        revenue: dashboardStats.totalRevenue, 
        expenses: dashboardStats.totalExpenses, 
        profit: dashboardStats.totalProfit, 
        salesCount: currentInvoices.length 
      }
    ];
  }, [dashboardStats, currentInvoices]);

  const maxAmount = useMemo(() => {
    const maxVal = Math.max(...monthlyTrends.map(node => Math.max(node.revenue, node.expenses, node.profit)));
    return maxVal === 0 ? 10000 : maxVal * 1.15;
  }, [monthlyTrends]);

  const maxSalesCount = useMemo(() => {
    const maxVal = Math.max(...monthlyTrends.map(node => node.salesCount));
    return maxVal === 0 ? 10 : Math.ceil(maxVal * 1.1);
  }, [monthlyTrends]);

  const barLayouts = useMemo(() => {
    const startX = 45;
    const endX = 475;
    const chartHeight = 135;
    const baselineY = 155;
    const count = monthlyTrends.length;
    const colStep = (endX - startX) / count;
    const width = Math.max(6, colStep * 0.5);

    return monthlyTrends.map((node, index) => {
      const x = startX + (index * colStep) + (colStep - width) / 2;
      
      const revHeight = (node.revenue / maxAmount) * chartHeight;
      const revY = baselineY - revHeight;
      
      const profHeight = node.profit > 0 ? (node.profit / maxAmount) * chartHeight : 0;
      const profY = baselineY - profHeight;

      const salesHeight = (node.salesCount / maxSalesCount) * chartHeight;
      const salesY = baselineY - salesHeight;

      return {
        month: node.month,
        revenue: node.revenue,
        profit: node.profit,
        salesCount: node.salesCount,
        x,
        width,
        revY,
        revHeight,
        profY,
        profHeight,
        salesY,
        salesHeight
      };
    });
  }, [monthlyTrends, maxAmount, maxSalesCount]);

  const profitLinePath = useMemo(() => {
    if (barLayouts.length === 0) return '';
    return barLayouts.reduce((path, p, index) => {
      const cx = p.x + p.width / 2;
      const cy = p.profY;
      return path + (index === 0 ? `M ${cx} ${cy}` : ` L ${cx} ${cy}`);
    }, '');
  }, [barLayouts]);

  const profitDots = useMemo(() => {
    return barLayouts.map(p => ({
      cx: p.x + p.width / 2,
      cy: p.profY
    }));
  }, [barLayouts]);

  const upcomingDeliveries = useMemo(() => {
    return currentOrders
      .filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled')
      .sort((a, b) => a.estimated_delivery_date.localeCompare(b.estimated_delivery_date));
  }, [currentOrders]);

  const formatScale = (value: number) => {
    if (value >= 100000) {
      return (value / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + 'L';
    } else if (value >= 1000) {
      return (value / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + 'K';
    }
    return Math.round(value).toString();
  };

  const getWIPStageStyle = (status: string) => {
    switch (status) {
      case 'Received':
        return 'bg-blue-950/40 border-blue-800 text-blue-400';
      case 'Material Procurement':
        return 'bg-violet-950/40 border-violet-800 text-violet-400';
      case 'Cutting':
      case 'Welding':
      case 'Assembly':
        return 'bg-indigo-950/40 border-indigo-805 text-indigo-400';
      case 'Painting':
      case 'Testing':
        return 'bg-amber-950/40 border-amber-800 text-amber-400';
      case 'Ready':
        return 'bg-emerald-950/40 border-emerald-800 text-emerald-400';
      case 'Delivered':
        return 'bg-slate-800 border-slate-700 text-slate-300';
      default:
        return 'bg-slate-950/40 border-slate-800 text-slate-400';
    }
  };

  // Form modals control
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<ICustomer | null>(null);
  const [showInteractionModal, setShowInteractionModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Custom alert and confirm dialog state config
  const [activeDialog, setActiveDialog] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    confirmLabel?: string;
    confirmStyle?: 'danger' | 'info';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: ''
  });

  // Database activity stats console simulation logs trace
  const [sqlLogs, setSqlLogs] = useState<Array<{ q: string; t: string; status: string }>>([]);

  // Time metrics
  const currentTimeString = 'May 30, 2026 - 12:56 UTC';

  // Seed on mount
  useEffect(() => {
    initMockDatabase();
    refreshAllData();
    logSQL('SELECT * FROM customers ORDER BY name ASC', '0.45ms');
    
    // Check for daily backup schedule on application load
    triggerAutomaticBackup('daily');
  }, []);

  const refreshAllData = () => {
    const rawCustomers = dbAPI.getCustomers();
    setCustomers(rawCustomers);
    
    // Auto-select first customer for better immediate UX on desktop
    if (rawCustomers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(rawCustomers[0].id);
    }

    // Trigger auto backup (skips cleanly if disabled or guest status)
    triggerAutomaticBackup('modification');
  };

  const logSQL = (query: string, duration: string) => {
    setSqlLogs(prev => [
      { q: query, t: duration, status: 'SQLITE_OK' },
      ...prev.slice(0, 9) // keep top 10 logs
    ]);
  };

  // Memoized query selections
  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.gst_number && c.gst_number.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
      logSQL(`SELECT * FROM customers WHERE name LIKE '%${q}%' OR mobile LIKE '%${q}%'`, '0.82ms');
    }

    if (filterDuesOnly) {
      list = list.filter(c => c.outstanding_balance > 0);
      logSQL('SELECT * FROM customers WHERE outstanding_balance > 0', '0.35ms');
    }

    return list;
  }, [customers, searchQuery, filterDuesOnly]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const selectedLedger = useMemo(() => {
    if (!selectedCustomerId) return [];
    const history = dbAPI.getLedgerHistory(selectedCustomerId);
    logSQL(`SELECT * FROM ledger WHERE customer_id = '${selectedCustomerId}'`, '1.12ms');
    return history;
  }, [selectedCustomerId, customers]);

  const selectedInteractions = useMemo(() => {
    if (!selectedCustomerId) return [];
    const list = dbAPI.getInteractions(selectedCustomerId);
    logSQL(`SELECT * FROM customer_interactions WHERE customer_id = '${selectedCustomerId}' ORDER BY date DESC`, '0.62ms');
    return list;
  }, [selectedCustomerId, customers]);

  // Derived high value metrics (KPIs)
  const stats = useMemo(() => {
    const totalCount = customers.length;
    const countWithDues = customers.filter(c => c.outstanding_balance > 0).length;
    const totalOutstandings = customers.reduce((sum, c) => sum + c.outstanding_balance, 0);
    
    // Virtual turnover total derived from invoices
    const allInvoices = dbAPI.getInvoices();
    const totalTurnover = allInvoices.reduce((sum, i) => sum + i.total_amount, 0);

    return { totalCount, countWithDues, totalOutstandings, totalTurnover };
  }, [customers]);

  const handleDeleteCustomer = (id: string, name: string) => {
    const hasActiveDues = dbAPI.getInvoices(id).some(inv => inv.due_amount > 0);
    if (hasActiveDues) {
      setActiveDialog({
        isOpen: true,
        type: 'alert',
        title: 'Database integrity restriction (ON DELETE RESTRICT)',
        message: `Cannot delete Customer '${name}' because they have outstanding dues on active fabrication invoices. Please audit and clear all invoice balances before deleting profiles under the database registries.`,
        confirmLabel: 'Acknowledge Guard',
        confirmStyle: 'info'
      });
      logSQL(`DELETE FROM customers WHERE id = '${id}' -- BLOCKED BY RESTRICT CONSTRAINT`, '0.22ms');
      return;
    }

    setActiveDialog({
      isOpen: true,
      type: 'confirm',
      title: 'De-register Customer Profile?',
      message: `Are you sure you want to permanently delete and unregister '${name}'? This action is irreversible, and all correspondence and interaction files will be purged from the live SQLite sandbox memory.`,
      confirmLabel: 'Confirm Purge',
      confirmStyle: 'danger',
      onConfirm: () => {
        dbAPI.deleteCustomer(id);
        setSelectedCustomerId(null);
        refreshAllData();
        logSQL(`DELETE FROM customers WHERE id = '${id}' -- SUCCESS`, '1.34ms');
        setActiveDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleResetDatabase = () => {
    setActiveDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Perform System Cold Factory Reset?',
      message: 'This parameter will completely wipe the local storage registry, purge modified ledgers, and seed original demo operations. Any customer profile changes, collected payments, and contact notes created during this session will be permanently deleted.',
      confirmLabel: 'Perform Cold Reset',
      confirmStyle: 'danger',
      onConfirm: () => {
        localStorage.clear();
        initMockDatabase();
        setSelectedCustomerId(null);
        refreshAllData();
        logSQL('VACUUM; RE-INITIALIZE SCHEMAS;', '14.5ms');
        setActiveDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  if (!isAuthenticated) {
    return <PINLockScreen onUnlock={() => setIsAuthenticated(true)} />;
  }

  return (
    <div id="erp-app-workspace" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* GLOBAL SYSTEM BAR */}
      <header className="bg-slate-950 border-b border-slate-850 px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center justify-between md:justify-start w-full md:w-auto gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-serif font-black text-xl italic tracking-wider text-white shadow-lg shadow-blue-500/10 shrink-0">
              SG
            </div>
            <div>
              <h1 className="text-sm font-serif font-bold tracking-tight text-white flex items-center gap-1.5 animate-fade-in">
                <span>SG <span className="hidden sm:inline">Engineering </span>Works</span>
                <span className="bg-blue-500/10 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-mono font-medium">V1.5</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono flex items-center space-x-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] sm:max-w-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span>SQLite Offline</span>
                <span className="text-slate-600">|</span>
                <span className="hidden sm:inline">{currentTimeString}</span>
                <span className="sm:hidden">May 30</span>
              </p>
            </div>
          </div>
          
          <div className="md:hidden flex items-center bg-slate-900 border border-slate-850 rounded-xl px-2.5 py-1.5 space-x-1.5 text-[10px] font-mono shrink-0">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-100 font-bold">Admin</span>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-3 shrink-0">
          {/* Segmented Tab Toggler */}
          <div className="hidden md:flex items-center bg-slate-900/80 border border-slate-800 p-1 rounded-xl flex-1 md:flex-initial justify-around md:justify-start">
            <button
              onClick={() => setActiveTab('crm')}
              className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'crm'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Partners CRM</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Global Cockpit</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'inventory'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Industrial Stores</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Executive BI</span>
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'backup'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloud Backup</span>
            </button>
          </div>

          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 space-x-2 text-xs font-mono">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">Active Operator:</span>
            <span className="text-slate-100 font-bold">Admin Supervisor</span>
          </div>

          <button
            onClick={handleResetDatabase}
            title="Reset storage to original seeded data"
            className="p-2 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center text-xs font-mono shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline pl-1.5">Reset Sandbox</span>
          </button>
        </div>
      </header>

      {/* CORE LAYOUT BODY PANEL */}
      {activeTab === 'crm' ? (
        <main className="flex-1 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-4 gap-0 lg:h-[calc(100vh-73px)]">
        
        {/* WORKSPACE DIRECTORY PANEL (LEFT) */}
        <section className={`lg:col-span-1 border-r border-slate-850 flex flex-col min-h-0 bg-slate-950/40 ${
          selectedCustomerId ? 'hidden lg:flex' : 'flex h-[calc(100vh-73px)] lg:h-auto w-full'
        }`}>
          
          {/* SEARCH FILTERS HEADER */}
          <div className="p-4 border-b border-slate-850 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Customer Directory</h2>
              <span className="text-2xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {filteredCustomers.length} match
              </span>
            </div>

            {/* Quick search input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, address, GST..."
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150"
              />
            </div>

            {/* Tool selectors (Filters + Add Customer Button) */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() => setFilterDuesOnly(!filterDuesOnly)}
                className={`flex-1 py-2 px-3 text-2xs rounded-xl font-bold flex items-center justify-center space-x-1.5 border transition cursor-pointer ${
                  filterDuesOnly
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Show Outstanding Dues Only</span>
              </button>

              <button
                onClick={() => {
                  setEditingCustomer(null);
                  setShowAddModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl flex items-center justify-center relative shadow-md shadow-blue-500/10 cursor-pointer active:scale-95"
                title="Register New Customer Profile"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DYNAMIC SCROLLABLE LIST OF CUSTOMERS */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900/45 p-2 space-y-1.5 custom-scrollbar">
            {filteredCustomers.map((customer) => {
              const isActive = customer.id === selectedCustomerId;
              const hasDues = customer.outstanding_balance > 0;
              return (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`p-3.5 rounded-xl cursor-pointer transition duration-150 select-none ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10 border-l-4 border-blue-400'
                      : 'hover:bg-slate-850/50 text-slate-300 bg-slate-900/10 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-serif font-bold text-sm tracking-tight leading-tight truncate pr-2">
                      {customer.name}
                    </h3>
                  </div>
                  
                  <p className={`text-[10px] font-mono mt-1 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                    📞 +91 {customer.mobile}
                  </p>

                  <div className="mt-3.5 flex justify-between items-end border-t border-dashed pt-2.5 transition border-current opacity-70">
                    <span className="text-[9px] uppercase font-bold tracking-wide">Ledger Balance:</span>
                    <strong className={`font-mono text-xs ${hasDues ? 'font-bold' : 'opacity-80'}`}>
                      ₹{customer.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              );
            })}

            {filteredCustomers.length === 0 && (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-mono italic">No customer profiles match this query.</p>
              </div>
            )}
          </div>

          {/* SIMULATED DATABASE ENGINE STATUS CONSOLE */}
          <div className="border-t border-slate-850 bg-slate-950 p-4 space-y-2.5 hidden lg:block shrink-0 leading-none">
            <div className="flex items-center space-x-1.5 text-xs font-bold font-mono text-slate-400">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Capacitor SQLite Engine Simulator</span>
            </div>
            
            <div className="bg-slate-900 rounded-lg p-2.5 text-[9px] font-mono text-slate-400 space-y-1 max-h-24 overflow-y-auto leading-normal">
              {sqlLogs.map((log, idx) => (
                <div key={idx} className="flex justify-between hover:bg-slate-850 py-0.5 rounded px-1">
                  <span className="text-slate-300 truncate max-w-[140px]" title={log.q}>{log.q}</span>
                  <span className="text-emerald-500 text-right font-semibold">{log.t}</span>
                </div>
              ))}
              {sqlLogs.length === 0 && <p className="text-slate-600">Database sandbox idle...</p>}
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
              <span>SQLITE_DB: offline_sg_works</span>
              <span>Encrypted: AES-256</span>
            </div>
          </div>
        </section>

        {/* DETAILS WORKSPACE (RIGHT 3 COLS) */}
        <section className={`lg:col-span-3 flex flex-col min-h-0 bg-[#090d16] ${
          !selectedCustomerId ? 'hidden lg:flex' : 'flex h-[calc(100vh-73px)] lg:h-auto w-full'
        }`}>
          
          {selectedCustomer ? (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* PRIMARY DASHBOARD ROW & METRIC BLOCKS */}
              <div className="p-6 bg-slate-950/20 border-b border-slate-850 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
                <div className="space-y-1.5">
                  {/* Mobile Directory Back Navigator */}
                  <button
                    onClick={() => setSelectedCustomerId(null)}
                    className="lg:hidden flex items-center space-x-1.5 text-xs font-mono font-bold text-blue-400 hover:text-blue-300 bg-slate-950/50 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-850 w-fit cursor-pointer mb-2 active:scale-95 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Directory</span>
                  </button>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400/55"></span>
                    <h2 className="text-lg font-serif font-black text-white">{selectedCustomer.name}</h2>
                    {selectedCustomer.gst_number && (
                      <span className="bg-blue-900/40 text-blue-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-blue-800/45">
                        GST: {selectedCustomer.gst_number}
                      </span>
                    )}
                  </div>
                  
                  {selectedCustomer.address && (
                    <p className="text-xs text-slate-400 leading-normal max-w-xl">
                      📍 {selectedCustomer.address}
                    </p>
                  )}
                </div>

                {/* Operations shortcut buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCustomer(selectedCustomer);
                      setShowAddModal(true);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border border-slate-700 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
                    className="p-2 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 hover:text-rose-300 rounded-xl transition border border-rose-900/45 cursor-pointer"
                    title="Restrict: Non-outstanding profile delete check"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* THREE COLUMN SUB-WORKSPACE INTERFACES */}
              <div className="flex-1 overflow-y-auto xl:overflow-hidden grid grid-cols-1 xl:grid-cols-12 gap-0 xl:h-[calc(100vh-170px)] pb-20 xl:pb-0">
                
                {/* INTERACTION LOG TIMELINE TIMELINE (XL 4 COLS) */}
                <div className="xl:col-span-4 border-r border-slate-850 flex flex-col min-h-0 bg-[#0c101b]/50 max-xl:h-[350px] shrink-0">
                  <div className="p-4 border-b border-slate-850 flex items-center justify-between bg-slate-950/20 shrink-0">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-serif">Contact Diary Logs</h3>
                    
                    <button
                      onClick={() => setShowInteractionModal(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-2xs font-bold transition flex items-center space-x-1 cursor-pointer"
                    >
                      <span>New Contact Log</span>
                    </button>
                  </div>

                  {/* Diary Timeline Entries */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {selectedInteractions.map((log) => (
                      <div key={log.id} className="relative pl-6 border-l-2 border-slate-800 pb-2 space-y-1">
                        {/* Event Dot */}
                        <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-900"></div>
                        
                        <div className="flex justify-between items-center text-3xs font-mono text-slate-500">
                          <span>{log.interaction_date}</span>
                          <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold">
                            {log.interaction_type}
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                          {log.notes}
                        </p>

                        {log.follow_up_date && (
                          <div className="mt-2 inline-flex items-center space-x-1 bg-amber-500/10 text-amber-400 text-3xs font-mono px-2 py-0.5 rounded font-bold border border-amber-500/20">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            <span>Follow-Up Due: {log.follow_up_date}</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {selectedInteractions.length === 0 && (
                      <div className="p-8 text-center text-slate-500 space-y-1.5">
                        <MessageSquare className="w-8 h-8 mx-auto text-slate-700" />
                        <p className="text-2xs font-mono italic">No interactions registered with this partner.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* DOUBLE ENTRY LEDGER STATEMENT (XL 8 COLS) */}
                <div className="xl:col-span-8 flex flex-col min-h-0 bg-slate-900/10 max-xl:h-[500px] shrink-0 max-xl:border-t max-xl:border-slate-850">
                  <div className="p-4 border-b border-slate-850 flex items-center justify-between bg-slate-950/20 shrink-0">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-serif">A/C General Ledger Accounts</h3>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        disabled={selectedCustomer.outstanding_balance === 0}
                        className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                          selectedCustomer.outstanding_balance === 0
                            ? 'bg-slate-850 text-slate-500 border border-slate-800 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <span>Collect Payment</span>
                      </button>

                      <button
                        onClick={() => setShowPrintModal(true)}
                        className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-2xs font-bold transition flex items-center space-x-1 cursor-pointer border border-slate-700"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Print Invoice/Ledger</span>
                      </button>
                    </div>
                  </div>

                  {/* Ledger Chronological Rows Table */}
                  <div className="flex-1 overflow-auto custom-scrollbar p-0 w-full animate-fade-in">
                    {/* DESKTOP STABLE TABLE */}
                    <table className="hidden md:table w-full min-w-[650px] text-xs text-left text-slate-300 border-collapse">
                      <thead>
                        <tr className="bg-slate-950/40 text-slate-400 font-mono text-3xs uppercase tracking-wider sticky top-0 border-b border-slate-850 z-10">
                          <th className="p-4 font-medium">Txn Date</th>
                          <th className="p-4 font-medium">Ref ID</th>
                          <th className="p-4 font-medium">Event Description</th>
                          <th className="p-4 text-right font-medium text-rose-400">Debit (Invoice)</th>
                          <th className="p-4 text-right font-medium text-emerald-400">Credit (Payment)</th>
                          <th className="p-4 text-right font-medium">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60 font-medium">
                        {selectedLedger.map((entry, idx) => (
                          <tr key={entry.id || idx} className="hover:bg-slate-950/15">
                            <td className="p-4 font-mono text-slate-500 whitespace-nowrap">{entry.date}</td>
                            <td className="p-4 font-mono text-slate-400 text-2xs max-w-[120px] truncate">{entry.reference_no}</td>
                            <td className="p-4 text-slate-300 text-xs truncate max-w-[180px]" title={entry.description}>{entry.description}</td>
                            <td className="p-4 text-right font-mono text-slate-100 font-bold">
                              {entry.debit_amount > 0 ? `₹${entry.debit_amount.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-4 text-right font-mono text-emerald-400 font-bold">
                              {entry.credit_amount > 0 ? `₹${entry.credit_amount.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-4 text-right font-mono font-black text-white">
                              ₹{entry.running_balance.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* MOBILE ADAPTIVE STACKED CARDS */}
                    <div className="md:hidden space-y-3.5 p-4">
                      {selectedLedger.map((entry, idx) => {
                        const isDebit = entry.debit_amount > 0;
                        return (
                          <div 
                            key={entry.id || idx}
                            className={`p-4 rounded-xl border ${
                              isDebit 
                                ? 'bg-rose-950/5 border-rose-900/20' 
                                : 'bg-emerald-950/5 border-emerald-900/20'
                            } bg-slate-900/40 space-y-3 shadow-md`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-850 px-2.5 py-0.5 rounded border border-slate-800">
                                {entry.date}
                              </span>
                              <span className="text-[9px] font-mono font-bold text-slate-300">
                                Ref: {entry.reference_no}
                              </span>
                            </div>
                            
                            <p className="text-xs font-semibold text-slate-205">
                              {entry.description}
                            </p>
                            
                            <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-xs">
                              <div className="space-y-0.5">
                                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 block">
                                  {isDebit ? 'Debit / Invoice' : 'Credit / Payment Received'}
                                </span>
                                <strong className={`font-mono text-sm ${isDebit ? 'text-rose-450 text-rose-400 font-bold' : 'text-emerald-400 font-bold'}`}>
                                  ₹{(isDebit ? entry.debit_amount : entry.credit_amount).toLocaleString('en-IN')}
                                </strong>
                              </div>
                              <div className="text-right space-y-0.5">
                                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 block">
                                  Running Bal
                                </span>
                                <strong className="font-mono text-sm text-white font-extrabold">
                                  ₹{entry.running_balance.toLocaleString('en-IN')}
                                </strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedLedger.length === 0 && (
                      <div className="text-center py-12 text-slate-500 font-mono italic text-xs">
                        No ledger operations logged for this customer profile.
                      </div>
                    )}
                  </div>

                  {/* Summary Footer accounting board */}
                  <div className="bg-slate-950/40 border-t border-slate-850 p-4 shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-850">
                      <p className="text-3xs text-slate-500 uppercase font-bold font-mono">Invoice Billed Total</p>
                      <strong className="text-sm font-mono text-white mt-1 block">
                        ₹{selectedLedger.reduce((sum, i) => sum + i.debit_amount, 0).toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-850">
                      <p className="text-3xs text-slate-500 uppercase font-bold font-mono">Receipts Total</p>
                      <strong className="text-sm font-mono text-emerald-400 mt-1 block">
                        ₹{selectedLedger.reduce((sum, i) => sum + i.credit_amount, 0).toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-850 col-span-2">
                      <p className="text-3xs text-slate-500 uppercase font-bold font-mono">Current Bill Due Account</p>
                      <strong className="text-base font-mono text-rose-500 mt-1 block flex justify-between items-center">
                        <span>₹{selectedCustomer.outstanding_balance.toLocaleString('en-IN')}</span>
                        {selectedCustomer.outstanding_balance === 0 && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 uppercase tracking-widest font-black px-2 py-0.5 rounded-full border border-emerald-500/20 font-sans">
                            Paid Up
                          </span>
                        )}
                      </strong>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 shadow-md">
                <Users className="w-8 h-8 text-slate-600 animate-pulse" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-slate-200 font-serif font-bold text-base">Select Customer Profile</h3>
                <p className="text-xs text-slate-400 leading-normal">
                  Chose a manufacturing partner from the left directory column to inspect active orders, ledger statements, and discussion timelines.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setEditingCustomer(null);
                    setShowAddModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/10"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register First Customer</span>
                </button>
              </div>
            </div>
          )}

        </section>

      </main>
      ) : activeTab === 'dashboard' ? (
        <main id="operations-cockpit-workspace" className="flex-1 overflow-y-auto h-[calc(100vh-73px)] bg-[#090d16] font-sans pb-10">
          {/* Dashboard Hero Banner */}
          <div className="bg-gradient-to-r from-blue-950/20 via-slate-900/10 to-transparent p-6 border-b border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs text-blue-400 font-mono mb-1">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>REAL-TIME ERP ANALYTICS DISPATCH</span>
              </div>
              <h2 className="text-xl font-serif font-black tracking-tight text-white animate-fade-in">
                Global Operations Dashboard
              </h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Consolidated metrics, monthly trends, project schedules, and steel inventory stock level protections.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-850">
              <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
              <span>Synced with local SQLite Engine</span>
            </div>
          </div>

          {/* KPI Widget Row */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Gross Revenue */}
            <div id="kpi-gross-revenue" className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-blue-500/30 transition shadow-lg shadow-black/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Gross Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-mono font-bold text-slate-100">
                  ₹{dashboardStats.totalRevenue.toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-1">
                  <span className="text-emerald-400 font-bold">18% GST</span>
                  <span>included in calculations</span>
                </p>
              </div>
            </div>

            {/* KPI 2: Operating Expenses */}
            <div id="kpi-operating-expenses" className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-blue-500/30 transition shadow-lg shadow-black/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Operating Expenses</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-mono font-bold text-slate-100">
                  ₹{dashboardStats.totalExpenses.toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-1">
                  <span>~42% material & fabrication labor</span>
                </p>
              </div>
            </div>

            {/* KPI 3: Net Consolidated Profit */}
            <div id="kpi-net-profit" className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-blue-500/30 transition shadow-lg shadow-black/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Consolidated Profit</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-mono font-bold text-slate-100">
                  ₹{dashboardStats.totalProfit.toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-1">
                  <span className="text-blue-400 font-bold">Positive</span>
                  <span>net operational margins</span>
                </p>
              </div>
            </div>

            {/* KPI 4: Pending Receivables */}
            <div id="kpi-receivables" className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-blue-500/30 transition shadow-lg shadow-black/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Outstanding Dues</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-mono font-bold text-amber-400">
                  ₹{dashboardStats.outstandingAmount.toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-405 flex items-center space-x-1 mt-1">
                  <span className="text-amber-400 font-bold">Unpaid</span>
                  <span>accounts receivables balance</span>
                </p>
              </div>
            </div>
          </div>

          {/* Auxiliary KPI Mini Row */}
          <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/40 border border-slate-850 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium font-sans">Registered Partners:</span>
              <strong className="text-slate-300 font-mono text-sm">{dashboardStats.totalCustomers} Accounts</strong>
            </div>
            <div className="bg-slate-950/40 border border-slate-850 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium font-sans">Recorded Invoices:</span>
              <strong className="text-slate-300 font-mono text-sm">{currentInvoices.length} Bills</strong>
            </div>
            <div className="bg-slate-950/40 border border-slate-850 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium font-sans">Low Stock Materials:</span>
              <span className="bg-red-500/10 text-red-400 font-mono font-bold px-2 py-0.5 rounded text-xs border border-red-500/20">
                {lowStockItems.length} Deficits Detected
              </span>
            </div>
          </div>

          {/* Graphs Area */}
          <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Financial Performance Trends */}
            <div id="chart-financial-trends" className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-white flex items-center space-x-1.5">
                    <span>Financial Performance Trends</span>
                  </h3>
                  <p className="text-2xs text-slate-400 font-sans mt-0.5">
                    Monthly Gross Revenue bar vs. Net Operating Profit line (Lakhs INR)
                  </p>
                </div>
                {/* Legend */}
                <div className="flex items-center space-x-3 text-2xs">
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-blue-600 block"></span>
                    <span className="text-slate-400">Gross Revenue</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-0.5 bg-emerald-400 block border-t-2 border-emerald-400"></span>
                    <span className="text-slate-400">Net Profit</span>
                  </div>
                </div>
              </div>

              {/* Custom SVG Graph (Zero charts package) */}
              <div className="bg-[#090c12]/60 p-4 rounded-xl border border-slate-850">
                <svg viewBox="0 0 500 180" className="w-full h-auto text-slate-450 overflow-visible">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = 20 + ratio * 135;
                    const val = maxAmount * (1 - ratio);
                    return (
                      <g key={idx} className="opacity-40">
                        <line x1="45" y1={y} x2="475" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="35" y={y + 3} className="text-[9px] font-mono fill-slate-400 text-right" textAnchor="end">
                          {formatScale(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Trends bars and nodes */}
                  {barLayouts.map((bar, idx) => (
                    <g key={idx} className="group cursor-pointer">
                      {/* Interactive hover trigger rect */}
                      <rect x={bar.x - 10} y="10" width={bar.width + 20} height="150" fill="transparent" className="hover:fill-slate-500/5 transition animate-fade-in" />
                      
                      {/* Revenue Bar */}
                      <rect
                        x={bar.x}
                        y={bar.revY}
                        width={bar.width}
                        height={bar.revHeight}
                        fill="#1d4ed8"
                        rx="3"
                        className="transition duration-300 opacity-90 group-hover:fill-blue-500"
                      />

                      {/* Tooltip on bar */}
                      <title>{`Revenue: ₹${bar.revenue.toLocaleString('en-IN')}\nProfit: ₹${bar.profit.toLocaleString('en-IN')}`}</title>
                    </g>
                  ))}

                  {/* Connected Net Profit Line */}
                  {profitLinePath && (
                    <path
                      d={profitLinePath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shadow-sm filter drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]"
                    />
                  )}

                  {/* Net Profit Dots */}
                  {profitDots.map((dot, idx) => (
                    <g key={idx}>
                      <circle cx={dot.cx} cy={dot.cy} r="4" fill="#090d16" stroke="#10b981" strokeWidth="2" className="cursor-pointer hover:scale-110 transition duration-200" />
                      <circle cx={dot.cx} cy={dot.cy} r="1.5" fill="#10b981" />
                    </g>
                  ))}

                  {/* X Axis labels */}
                  {barLayouts.map((bar, idx) => (
                    <text key={idx} x={bar.x + bar.width / 2} y="170" className="text-[10px] font-mono fill-slate-400 text-center" textAnchor="middle">
                      {bar.month.split(' ')[0]}
                    </text>
                  ))}
                </svg>
              </div>
            </div>

            {/* Chart 2: Order Volume Density */}
            <div id="chart-order-volume" className="bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-white flex items-center space-x-1.5">
                    <span>Order Fabrication Volume</span>
                  </h3>
                  <p className="text-2xs text-slate-400 font-sans mt-0.5">
                    Number of closed contracts and billed projects per month
                  </p>
                </div>
                <div className="text-2xs py-1 px-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono font-semibold">
                  Volumetric Peak: {maxSalesCount} orders
                </div>
              </div>

              {/* Custom SVG Graph (Zero charts package) */}
              <div className="bg-[#090c12]/60 p-4 rounded-xl border border-slate-850">
                <svg viewBox="0 0 500 180" className="w-full h-auto text-slate-450 overflow-visible">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = 20 + ratio * 135;
                    const val = Math.round(maxSalesCount * (1 - ratio));
                    return (
                      <g key={idx} className="opacity-40">
                        <line x1="45" y1={y} x2="475" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="35" y={y + 3} className="text-[9px] font-mono fill-slate-400 text-right" textAnchor="end">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Volume Columns */}
                  {barLayouts.map((bar, idx) => (
                    <g key={idx} className="group cursor-pointer">
                      {/* Bar Background hover effect */}
                      <rect x={bar.x - 10} y="10" width={bar.width + 20} height="150" fill="transparent" className="hover:fill-slate-500/5 transition" />
                      
                      {/* Sales Count Bar */}
                      <rect
                        x={bar.x}
                        y={bar.salesY}
                        width={bar.width}
                        height={bar.salesHeight}
                        fill="#ea580c"
                        rx="3"
                        className="transition duration-300 opacity-90 group-hover:fill-orange-400"
                      />

                      {/* Tooltip on bar */}
                      <title>{`Contracts: ${bar.salesCount} Billable Projects`}</title>
                    </g>
                  ))}

                  {/* X Axis labels */}
                  {barLayouts.map((bar, idx) => (
                    <text key={idx} x={bar.x + bar.width / 2} y="170" className="text-[10px] font-mono fill-slate-400 text-center" textAnchor="middle">
                      {bar.month.split(' ')[0]}
                    </text>
                  ))}
                </svg>
              </div>
            </div>

          </div>

          {/* Bento-Grid Bottom Lists */}
          <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Column 1: Upcoming Deliveries Scheduler (7 cols) */}
            <div id="dashboard-deliveries-list" className="lg:col-span-7 bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-white flex items-center space-x-1.5">
                    <span>Job Scheduler & Upcoming Deliveries</span>
                  </h3>
                  <p className="text-2xs text-slate-400 font-sans mt-0.5">
                    Live fabrication schedules synced by delivery release commitment dates
                  </p>
                </div>
                <div className="text-2xs font-mono bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
                  {upcomingDeliveries.length} Jobs WIP
                </div>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[280px] pr-1">
                {upcomingDeliveries.length === 0 ? (
                  <div className="text-center py-10 bg-[#090c12]/35 border border-slate-850 rounded-xl space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">No active pending jobs found.</p>
                  </div>
                ) : (
                  upcomingDeliveries.map((ord, idx) => (
                    <div key={idx} className="bg-[#090c12]/45 border border-slate-850 hover:border-slate-700 transition p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <strong className="text-slate-150 uppercase tracking-tight font-mono">{ord.order_number}</strong>
                          <span className="text-slate-600">|</span>
                          <span className="text-slate-300 font-serif font-semibold truncate max-w-[140px]">{ord.customer_name}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-2xs text-slate-400 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>Commitment Date:</span>
                          <span className="text-blue-400 font-semibold">{ord.estimated_delivery_date}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right font-mono font-bold text-slate-200">
                          ₹{ord.total_amount.toLocaleString('en-IN')}
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] rounded-full border font-mono font-semibold truncate max-w-[160px] ${getWIPStageStyle(ord.status)}`}>
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Materials Inventory Buffer Deficit (5 cols) */}
            <div id="dashboard-inventory-deficit" className="lg:col-span-5 bg-[#111625] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-serif font-bold text-white flex items-center space-x-1.5">
                    <span>Inventory Deficit Warnings</span>
                  </h3>
                  <span className="bg-red-500/10 text-red-400 font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-red-500/20">
                    Auto Warnings
                  </span>
                </div>
                <p className="text-2xs text-slate-400 font-sans mt-0.5">
                  Raw materials currently below safe warehouse threshold reserves
                </p>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[280px] pr-1">
                {lowStockItems.map((item, idx) => {
                  const percentLeft = Math.round((item.quantity / item.minimum_stock_level) * 100);
                  return (
                    <div key={idx} className="bg-[#090c12]/45 border border-slate-850 p-4 rounded-xl space-y-2">
                      <div className="flex items-start justify-between gap-2.5 text-xs">
                        <div className="space-y-0.5">
                          <h4 className="font-semibold text-slate-200 tracking-tight leading-tight">{item.name}</h4>
                          <span className="text-2xs text-slate-500 font-sans block">
                            Partner Vendor: <strong className="text-slate-400 font-sans font-medium">{item.supplier_name}</strong>
                          </span>
                        </div>
                        <span className="bg-red-500/10 text-red-400 font-mono text-2xs px-2 py-0.5 rounded font-bold shrink-0 border border-red-500/10">
                          {percentLeft}% stock left
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-red-500 h-1.5 rounded-full" 
                            style={{ width: `${Math.max(1, percentLeft)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-505 font-mono">
                          <span>Current Stores: <strong className="text-slate-350">{item.quantity} {item.unit}s</strong></span>
                          <span>Buffer safe level: {item.minimum_stock_level} {item.unit}s</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </main>
      ) : activeTab === 'inventory' ? (
        <InventoryModule />
      ) : activeTab === 'reports' ? (
        <ReportsModule />
      ) : (
        <BackupModule />
      )}

      {/* FORM AND INTERACTION MODALS RENDER PANEL */}
      <AnimatePresence>
        {showAddModal && (
          <CustomerForm
            customer={editingCustomer}
            onClose={() => setShowAddModal(false)}
            onSave={() => {
              setShowAddModal(false);
              refreshAllData();
            }}
          />
        )}

        {showInteractionModal && selectedCustomer && (
          <AddInteractionModal
            customer={selectedCustomer}
            onClose={() => setShowInteractionModal(false)}
            onSave={() => {
              setShowInteractionModal(false);
              refreshAllData();
            }}
          />
        )}

        {showPaymentModal && selectedCustomer && (
          <ReceivePaymentModal
            customer={selectedCustomer}
            onClose={() => setShowPaymentModal(false)}
            onSave={() => {
              setShowPaymentModal(false);
              refreshAllData();
            }}
          />
        )}

        {showPrintModal && selectedCustomer && (
          <PrintLedgerModal
            customer={selectedCustomer}
            ledger={selectedLedger}
            onClose={() => setShowPrintModal(false)}
          />
        )}

        {activeDialog.isOpen && (
          <CustomDialogModal
            type={activeDialog.type}
            title={activeDialog.title}
            message={activeDialog.message}
            confirmLabel={activeDialog.confirmLabel}
            confirmStyle={activeDialog.confirmStyle}
            onConfirm={() => {
              if (activeDialog.onConfirm) {
                activeDialog.onConfirm();
              } else {
                setActiveDialog(prev => ({ ...prev, isOpen: false }));
              }
            }}
            onCancel={() => {
              setActiveDialog(prev => ({ ...prev, isOpen: false }));
            }}
          />
        )}
      </AnimatePresence>

      {/* FIXED MOBILE BOTTOM NAVIGATION ROW */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-900 flex justify-around py-3 px-2 z-40 shadow-2xl">
        {[
          { id: 'crm', label: 'CRM PARTNERS', icon: Users },
          { id: 'dashboard', label: 'COCKPIT', icon: TrendingUp },
          { id: 'inventory', label: 'STORES', icon: Boxes },
          { id: 'reports', label: 'EXEC BI', icon: BarChart3 },
          { id: 'backup', label: 'BACKUP', icon: Cloud }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'crm' | 'dashboard' | 'inventory' | 'reports' | 'backup')}
              className="flex flex-col items-center justify-center cursor-pointer select-none py-1 px-2.5 transition-all text-center"
            >
              <div className={`p-1 px-3 rounded-lg transition-all ${
                isActive 
                  ? 'bg-blue-600/15 text-blue-400' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <span className={`text-[8px] font-mono mt-1 font-bold ${
                isActive ? 'text-blue-400' : 'text-slate-500'
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
