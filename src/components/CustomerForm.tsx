import React, { useState, useEffect } from 'react';
import { ICustomer } from '../types/customer.interface';
import { dbAPI } from '../data/mock-database';
import { X, Check, Save, User, Phone, MapPin, Mail, CreditCard, Notebook } from 'lucide-react';

interface CustomerFormProps {
  customer?: ICustomer | null;
  onClose: () => void;
  onSave: () => void;
}

export default function CustomerForm({ customer, onClose, onSave }: CustomerFormProps) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setMobile(customer.mobile);
      setAlternateMobile(customer.alternate_mobile || '');
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setGstNumber(customer.gst_number || '');
      setNotes(customer.notes || '');
    } else {
      setName('');
      setMobile('');
      setAlternateMobile('');
      setEmail('');
      setAddress('');
      setGstNumber('');
      setNotes('');
    }
  }, [customer]);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name = 'Customer name is strictly required.';
    }

    // 10 digit Indian Mobile filter
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobile.trim()) {
      nextErrors.mobile = 'Mobile number is strictly required.';
    } else if (!mobileRegex.test(mobile.trim())) {
      nextErrors.mobile = 'Must enter a valid 10-digit mobile number.';
    }

    if (alternateMobile.trim() && !mobileRegex.test(alternateMobile.trim())) {
      nextErrors.alternateMobile = 'Alternate mobile must also be a standard 10-digit number.';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        nextErrors.email = 'Please provide a valid email structure.';
      }
    }

    // GST validation configuration (15 characters)
    if (gstNumber.trim()) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
      if (gstNumber.trim().length !== 15) {
        nextErrors.gstNumber = 'GSTIN must consist of exactly 15 characters.';
      } else if (!gstRegex.test(gstNumber.trim().toUpperCase())) {
        nextErrors.gstNumber = 'GSTIN format is structurally invalid.';
      }
    }

    // Check for duplicated mobile codes in other customers
    const currentList = dbAPI.getCustomers();
    const duplicatedMob = currentList.find(c => c.mobile === mobile.trim() && c.id !== customer?.id);
    if (duplicatedMob) {
      nextErrors.mobile = 'A customer with this mobile number is already registered.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data: ICustomer = {
      id: customer ? customer.id : 'cust-' + Date.now(),
      name: name.trim(),
      mobile: mobile.trim(),
      alternate_mobile: alternateMobile.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      gst_number: gstNumber.trim().toUpperCase() || null,
      notes: notes.trim() || null,
      outstanding_balance: customer ? customer.outstanding_balance : 0.0,
      created_date: customer ? customer.created_date : new Date().toISOString(),
      updated_date: new Date().toISOString()
    };

    dbAPI.saveCustomer(data);
    onSave();
  };

  return (
    <div id="customer-form-backdrop" className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-40 p-4 backdrop-blur-xs font-sans">
      <div className="bg-white text-slate-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-400" />
            <h3 className="font-serif font-bold text-lg">
              {customer ? 'Update Customer Profile' : 'Register New Customer'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form panel body */}
        <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Section: Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Customer Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g., Anupam Food Processors Ltd"
                className={`w-full bg-slate-50 border ${
                  errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                } rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
              />
            </div>
            {errors.name && <p className="text-2xs text-rose-500 font-medium font-mono">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mobile Number */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Mobile Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="Primary 10-digit number"
                  className={`w-full bg-slate-50 border ${
                    errors.mobile ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  } rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
              </div>
              {errors.mobile && <p className="text-2xs text-rose-500 font-medium font-mono">{errors.mobile}</p>}
            </div>

            {/* Alternate Mobile */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Alternate Mobile</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  maxLength={10}
                  value={alternateMobile}
                  onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="Backup contact number"
                  className={`w-full bg-slate-50 border ${
                    errors.alternateMobile ? 'border-rose-400' : 'border-slate-200'
                  } rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
              </div>
              {errors.alternateMobile && (
                <p className="text-2xs text-rose-500 font-medium font-mono">{errors.alternateMobile}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@e-works.com"
                  className={`w-full bg-slate-50 border ${
                    errors.email ? 'border-rose-400' : 'border-slate-200'
                  } rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
              </div>
              {errors.email && <p className="text-2xs text-rose-500 font-medium font-mono">{errors.email}</p>}
            </div>

            {/* GSTIN registration */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Gst Number (GSTIN)</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  maxLength={15}
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="E.g., 19AAACA1122D1Z4"
                  className={`w-full bg-slate-50 border ${
                    errors.gstNumber ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  } rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
              </div>
              {errors.gstNumber && <p className="text-2xs text-rose-500 font-medium font-mono">{errors.gstNumber}</p>}
            </div>
          </div>

          {/* Billing Address details */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Billing Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full operational building, factory, or office location"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          {/* CRM Internal notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Internal Remarks / Notes</label>
            <div className="relative">
              <Notebook className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add special machining standards, custom designs references, delivery habits, etc."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 rounded-xl transition font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFormSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm rounded-xl font-bold flex items-center space-x-2 shadow-md shadow-blue-500/20 active:scale-98 transition duration-150 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
