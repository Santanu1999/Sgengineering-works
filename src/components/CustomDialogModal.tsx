import React from 'react';
import { AlertCircle, HelpCircle, X, Terminal } from 'lucide-react';
import { motion } from 'motion/react';

interface CustomDialogModalProps {
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmStyle?: 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CustomDialogModal({
  type,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  confirmStyle = 'info',
  onConfirm,
  onCancel,
}: CustomDialogModalProps) {
  const isDanger = confirmStyle === 'danger';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={type === 'confirm' ? onCancel : onConfirm}
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs cursor-pointer"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-slate-950/50 flex flex-col z-[10000]"
      >
        {/* Subtle status top bar indicator color accent */}
        <div className={`h-1.5 w-full ${isDanger ? 'bg-rose-500' : 'bg-blue-500'}`} />

        {/* Dismiss absolute cross top-right */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition cursor-pointer"
          title="Dismiss dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Body */}
        <div className="p-6 flex space-x-4 items-start">
          <div className="shrink-0 pt-0.5">
            {isDanger ? (
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-bold text-slate-100 tracking-tight font-serif flex items-center space-x-2">
              <span>{title}</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>

        {/* Underlay terminal log snippet simulation */}
        <div className="px-6 py-2 bg-slate-950/40 border-y border-slate-850 flex items-center justify-between font-mono text-[10px] text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Terminal className="w-3 h-3 text-slate-600" />
            <span>SQLite Security Engine Integrity Guard</span>
          </div>
          <span className="text-slate-600 uppercase">SYS_LOCK</span>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-slate-950/20 border-t border-slate-850 flex items-center justify-end space-x-3 shrink-0">
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}

          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer shadow-lg active:scale-95 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/10'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/10'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
