import React, { useState } from 'react';
import { dbAPI } from '../data/mock-database';
import { ICustomer, ICustomerInteraction, InteractionType } from '../types/customer.interface';
import { X, Calendar, MessageSquare, Plus } from 'lucide-react';

interface AddInteractionModalProps {
  customer: ICustomer;
  onClose: () => void;
  onSave: () => void;
}

export default function AddInteractionModal({ customer, onClose, onSave }: AddInteractionModalProps) {
  const [type, setType] = useState<InteractionType>('Phone Call');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Please add detailed conversation logging remarks.');
      return;
    }

    const nextLog: ICustomerInteraction = {
      id: 'int-' + Date.now(),
      customer_id: customer.id,
      interaction_date: new Date().toISOString().split('T')[0],
      interaction_type: type,
      notes: notes.trim(),
      follow_up_date: followUpDate || null,
      created_date: new Date().toISOString()
    };

    dbAPI.addInteraction(nextLog);
    onSave();
  };

  return (
    <div id="interaction-form-backdrop" className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-45 p-4 backdrop-blur-xs font-sans">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header toolbar */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h3 className="font-serif font-bold text-base">
              Log Contact Timeline
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-500 font-mono">
            Adding log entry for: <strong className="text-slate-800 font-sans">{customer.name}</strong>
          </p>

          {/* Interaction Channel Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Contact Channel</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as InteractionType)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Phone Call">📞 Phone Conversation</option>
              <option value="WhatsApp">💬 WhatsApp Message</option>
              <option value="Meeting">🤝 In-Person Meeting</option>
              <option value="Site Visit">🏗️ Factory/Site Visit</option>
              <option value="Delivery Discussion">🚚 Delivery Discussion</option>
              <option value="Payment Follow Up">💰 Payment Follow Up</option>
              <option value="Other">📝 Other Discussion</option>
            </select>
          </div>

          {/* Discussion Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Meeting/Call Summary *</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setError('');
              }}
              placeholder="What did you discuss? Add pricing negotiations, drawings finalized, delivery steps discussed..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
            {error && <p className="text-2xs text-rose-500 font-medium font-mono">{error}</p>}
          </div>

          {/* Follow up Calendar trigger */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Follow-Up Date (Optional)</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <p className="text-[10px] text-slate-400">Specifying a date leaves an active marker on the dashboard schedule.</p>
          </div>
        </form>

        {/* Footer buttons */}
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs rounded-xl font-bold flex items-center space-x-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Log</span>
          </button>
        </div>
      </div>
    </div>
  );
}
