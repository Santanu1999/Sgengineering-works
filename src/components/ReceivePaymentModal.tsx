import React, { useState } from 'react';
import { dbAPI, ISimulatedPayment } from '../data/mock-database';
import { ICustomer } from '../types/customer.interface';
import { X, Wallet, IndianRupee, HelpCircle } from 'lucide-react';

interface ReceivePaymentModalProps {
  customer: ICustomer;
  onClose: () => void;
  onSave: () => void;
}

export default function ReceivePaymentModal({ customer, onClose, onSave }: ReceivePaymentModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<ISimulatedPayment['payment_method']>('UPI');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const invoices = dbAPI.getInvoices(customer.id);
  const outstandingInvoicesCount = invoices.filter(i => i.due_amount > 0).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid, positive payment amount.');
      return;
    }

    if (parsedAmount > customer.outstanding_balance && customer.outstanding_balance > 0) {
      setError(`Entered amount (₹${parsedAmount.toLocaleString()}) exceeds the customer's total outstanding balance (₹${customer.outstanding_balance.toLocaleString()}).`);
      return;
    }

    // Allocate payment
    const newPayment: ISimulatedPayment = {
      id: 'pmt-' + Date.now(),
      customer_id: customer.id,
      order_id: invoices.find(i => i.due_amount > 0)?.order_id || 'unassigned',
      invoice_id: invoices.find(i => i.due_amount > 0)?.id || null,
      payment_amount: parsedAmount,
      payment_date: new Date().toISOString(),
      payment_method: method,
      notes: notes.trim() ? notes.trim() : `Payment collected via ${method}.`
    };

    dbAPI.addPayment(newPayment);
    onSave();
  };

  return (
    <div id="payment-form-backdrop" className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-45 p-4 backdrop-blur-xs font-sans">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Title head */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-serif font-bold text-base">
              Collect Ledger Payment
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content detail */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Customer:</span>
              <strong className="text-slate-800 font-sans">{customer.name}</strong>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Current Unpaid Balance:</span>
              <strong className="text-slate-800 font-mono">₹{customer.outstanding_balance.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Outstanding Invoices:</span>
              <span className="bg-amber-100 text-amber-800 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                {outstandingInvoicesCount} Pending
              </span>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Receipt Amount (INR) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400 text-sm font-semibold">₹</span>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="Enter exact collected amount"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            {error && <p className="text-2xs text-rose-500 font-medium font-mono">{error}</p>}
          </div>

          {/* Channel selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Payment Medium</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: 'UPI', label: '📱 UPI / QR code' },
                { key: 'Cash', label: '💵 Hard Cash' },
                { key: 'Bank Transfer', label: '🏦 Bank Transfer/NEFT' },
                { key: 'Cheque', label: '✍️ Cheque clearance' },
              ].map((m) => {
                const active = method === m.key;
                return (
                  <button
                    type="button"
                    key={m.key}
                    onClick={() => setMethod(m.key as any)}
                    className={`py-2 px-3 text-xs rounded-xl font-bold border transition ${
                      active
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ledger comments notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Receipt Remarks</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Advance deposit, partial invoice clearance notes, drawing references..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>
        </form>

        {/* Action Panel footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 rounded-xl transition font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs rounded-xl font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 active:scale-98 transition duration-150 cursor-pointer"
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Receive Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
}
