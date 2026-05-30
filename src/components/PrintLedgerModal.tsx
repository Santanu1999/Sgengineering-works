import React, { useRef } from 'react';
import { ICustomer, ILedgerEntry } from '../types/customer.interface';
import { X, Printer, Receipt } from 'lucide-react';

interface PrintLedgerModalProps {
  customer: ICustomer;
  ledger: ILedgerEntry[];
  onClose: () => void;
}

export default function PrintLedgerModal({ customer, ledger, onClose }: PrintLedgerModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const totalDues = customer.outstanding_balance;
  const totalBilled = ledger.reduce((sum, item) => sum + item.debit_amount, 0);
  const totalPaid = ledger.reduce((sum, item) => sum + item.credit_amount, 0);

  const handlePrint = () => {
    // Inject a global print-style override element dynamically
    // This allows native print layout rendering perfectly on all environments,
    // including nested sandbox iframes, without any cross-origin frame exceptions.
    const style = document.createElement('style');
    style.id = 'print-style-override';
    style.innerHTML = `
      @media print {
        /* Ensure default window backgrounds are forced light and margins cleared */
        html, body {
          background-color: #ffffff !important;
          background: #ffffff !important;
          color: #0f172a !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: auto !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Hide all root children elements in the application shell */
        body > *:not(#print-overlay-backdrop) {
          display: none !important;
        }

        /* Elevate the printable portal overlay container */
        #print-overlay-backdrop {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: auto !important;
          background: #ffffff !important;
          padding: 0 !important;
          margin: 0 !important;
          display: block !important;
          overflow: visible !important;
          z-index: 9999999 !important;
        }

        /* Remove fixed panel constraints on dialog wrapper */
        #print-overlay-backdrop > div {
          border: none !important;
          box-shadow: none !important;
          width: 100% !important;
          max-width: none !important;
          height: auto !important;
          border-radius: 0 !important;
          overflow: visible !important;
        }

        /* Hide visual actions top bar completely */
        #print-action-bar {
          display: none !important;
        }

        /* Clean up scroll view boundaries for printing */
        #print-scroll-container {
          padding: 0 !important;
          background: #ffffff !important;
          overflow: visible !important;
        }

        /* Force A4 physical dimensions with minimal margins */
        #printable-ledger-card {
          border: none !important;
          box-shadow: none !important;
          padding: 10mm !important;
          margin: 0 auto !important;
          width: 100% !important;
          max-width: 210mm !important;
          min-height: 0 !important;
          border-radius: 0 !important;
        }

        /* Force display of tables & keep columns correct */
        table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        th, td {
          border-bottom: 1px solid #e2e8f0 !important;
          font-size: 11px !important;
          padding: 6px 8px !important;
        }
        th {
          background-color: #0f172a !important;
          color: #ffffff !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Call the native browser print spool directly on current page
    window.print();

    // Safely remove the style overrides after spool opens
    setTimeout(() => {
      const el = document.getElementById('print-style-override');
      if (el) el.remove();
    }, 1000);
  };

  return (
    <div id="print-overlay-backdrop" className="fixed inset-0 bg-slate-900/60 sm:flex sm:items-center sm:justify-center z-50 sm:p-4 backdrop-blur-xs font-sans">
      <div className="bg-white text-slate-900 w-full h-full sm:h-[90vh] sm:max-w-4xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Actions bar top navbar (Responsive Layout) */}
        <div id="print-action-bar" className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <Receipt className="w-5 h-5 text-blue-400 shrink-0" />
            <h3 className="font-serif font-bold text-sm sm:text-base truncate">
              Statement Preview
            </h3>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Ledger (A4 PDF)</span>
              <span className="sm:hidden">Print</span>
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Printable Document Panel */}
        <div id="print-scroll-container" className="p-2 sm:p-8 overflow-y-auto bg-slate-100 flex-1">
          <div
            id="printable-ledger-card"
            ref={printRef}
            className="bg-white p-3.5 sm:p-10 w-full max-w-[210mm] mx-auto min-h-[140mm] sm:min-h-[297mm] shadow-lg rounded-xl border border-slate-200 text-slate-900 leading-relaxed font-sans"
          >
            {/* INVOICE STATEMENT HEADER */}
            <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-serif font-bold tracking-tight text-slate-900 uppercase">SG Engineering Works</h1>
                <p className="text-[10px] sm:text-xs text-slate-650 mt-1 font-medium">Specialists in Industrial Machine Fabrication & Steel Machining</p>
                <div className="text-[10px] sm:text-[11px] text-slate-500 mt-2 font-mono space-y-0.5">
                  <p>Plot No. 45/A, Liluah Industrial Area, Howrah, WB, 711204</p>
                  <p>Email: sg_engineering_works@yahoo.co.in | Tel: +91 33 2654 9081</p>
                  <p className="font-bold text-slate-700">GSTIN: 19AASFS1290K1ZM</p>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="bg-slate-900 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm block sm:inline-block">
                  Customer Ledger Statement
                </span>
                <p className="text-[10px] sm:text-xs text-slate-500 font-mono mt-2 sm:mt-3">Date Printed: {new Date().toISOString().split('T')[0]}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 font-mono">Period: Jan 01, 2026 – Active</p>
              </div>
            </div>

            {/* BILLED TO SPECIFICATIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-5 text-xs sm:text-sm">
              <div className="space-y-1.5 bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-100">
                <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Statement Issued To</p>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">{customer.name}</h4>
                {customer.address && <p className="text-[11px] sm:text-xs text-slate-650 mt-1 leading-normal">{customer.address}</p>}
                <p className="text-[11px] sm:text-xs text-slate-500 font-mono mt-1.5">📞 +91 {customer.mobile}</p>
                {customer.gst_number && (
                  <p className="text-[11px] sm:text-xs font-mono font-bold text-blue-800 mt-1">GSTIN: {customer.gst_number}</p>
                )}
              </div>

              <div className="flex flex-col justify-between border border-slate-100 p-3 sm:p-4 rounded-lg gap-2.5">
                <div className="space-y-1.5">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Ledger Balance Summary</p>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[11px] sm:text-xs text-slate-650">Total Fabrications Invoiced:</span>
                    <strong className="text-xs sm:text-sm font-mono text-slate-900">₹{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-dashed border-slate-100">
                    <span className="text-[11px] sm:text-xs text-slate-650">Total Payments Audited:</span>
                    <strong className="text-xs sm:text-sm font-mono text-emerald-700">₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>
                <div className="bg-yellow-50/50 p-2 rounded-md flex justify-between items-center gap-1.5 border border-yellow-105">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-705">OUTSTANDING DUE:</span>
                  <strong className="text-sm sm:text-base font-mono text-rose-700 font-bold shrink-0">₹{totalDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>

            {/* LEDGER TABLE DATA FIELDS */}
            <div className="mt-4 overflow-x-auto w-full border border-slate-100 rounded-lg">
              <table className="w-full min-w-[500px] sm:min-w-[700px] text-[10px] sm:text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-mono text-[9px] sm:text-[10px] uppercase">
                    <th className="p-2 sm:p-2.5 font-medium rounded-l">Date</th>
                    <th className="p-2 sm:p-2.5 font-medium">Ref No.</th>
                    <th className="p-2 sm:p-2.5 font-medium">Description</th>
                    <th className="p-2 sm:p-2.5 text-right font-medium">Debit (+)</th>
                    <th className="p-2 sm:p-2.5 text-right font-medium">Credit (-)</th>
                    <th className="p-2 sm:p-2.5 text-right font-medium rounded-r">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="p-2 sm:p-2.5 font-mono text-slate-500 whitespace-nowrap">{item.date}</td>
                      <td className="p-2 sm:p-2.5 font-mono text-slate-700 font-bold max-w-[100px] sm:max-w-[130px] truncate">{item.reference_no}</td>
                      <td className="p-2 sm:p-2.5 text-slate-650 leading-normal max-w-[140px] sm:max-w-[200px] truncate" title={item.description}>{item.description}</td>
                      <td className="p-2 sm:p-2.5 text-right font-mono text-slate-800 font-semibold whitespace-nowrap">
                        {item.debit_amount > 0 ? `₹${item.debit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-mono text-emerald-600 font-semibold whitespace-nowrap">
                        {item.credit_amount > 0 ? `₹${item.credit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{item.running_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-xs text-slate-400 font-mono italic">
                        No transactions found in this customer ledger profile.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* SIGNATURE FIELDS AT THE BASE */}
            <div className="mt-10 sm:mt-16 flex flex-row justify-between items-end gap-4 border-t border-dashed border-slate-200 pt-6 text-[10px] sm:text-xs">
              <div className="text-center w-28 sm:w-40 shrink-0">
                <div className="h-6 sm:h-10"></div>
                <div className="border-b border-slate-300 w-full mb-1"></div>
                <p className="text-slate-400 text-[9px] sm:text-2xs font-mono">Customer Sign</p>
              </div>
              <div className="text-center w-36 sm:w-48 shrink-0">
                <div className="h-6 sm:h-8 flex items-center justify-center font-serif text-[8px] sm:text-[10px] tracking-wide text-slate-500 italic">SG Engineering Works</div>
                <div className="border-b border-slate-300 w-full mb-1"></div>
                <p className="text-slate-700 text-[9px] sm:text-2xs font-bold uppercase">Authorized Sign</p>
              </div>
            </div>

            {/* AUDIT NOTE */}
            <p className="text-[8px] sm:text-[10px] text-center text-slate-400 mt-8 sm:mt-12 font-mono leading-normal">
              * This is a computer-generated ledger statement sourced locally from the SG Mobile Sandbox SQLite node.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
