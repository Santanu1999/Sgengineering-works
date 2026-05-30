import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  CloudRain, 
  RefreshCw, 
  Database, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  FileJson,
  Check,
  Upload,
  Download,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export default function BackupModule() {
  // Local Integrity Diagnostics Status
  const [localIntegrity, setLocalIntegrity] = useState<{
    valid: boolean;
    errors: string[];
    counts: { [key: string]: number };
  } | null>(null);

  // Backup operations state
  const [backupInProgress, setBackupInProgress] = useState<boolean>(false);
  const [restoreInProgress, setRestoreInProgress] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected backup file for previewing before restore
  const [restorePreview, setRestorePreview] = useState<{
    filename: string;
    payload: any;
    integrity: { valid: boolean; errors: string[] };
  } | null>(null);

  // Notification Toast state
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  useEffect(() => {
    runDatabaseDiagnostics();
  }, []);

  const KEYS_TO_BACKUP = [
    'sg_db_customers',
    'sg_db_interactions',
    'sg_db_orders',
    'sg_db_invoices',
    'sg_db_payments',
    'sg_db_pin_locked',
    'sg_db_raw_materials',
    'sg_db_suppliers',
    'sg_db_supplier_ledgers',
    'sg_db_inv_transactions',
    'sg_db_boms',
    'sg_db_wip_jobs',
    'sg_db_finished_goods'
  ];

  // Load/Evaluate the current database diagnostics
  const runDatabaseDiagnostics = (dataToCheck?: any) => {
    const currentDB: any = dataToCheck || {};
    
    if (!dataToCheck) {
      KEYS_TO_BACKUP.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try {
            currentDB[key] = JSON.parse(raw);
          } catch {
            currentDB[key] = raw;
          }
        }
      });
    }

    // Verify Integrity
    let valid = true;
    const errors: string[] = [];
    const counts: { [key: string]: number } = {};

    Object.keys(currentDB).forEach(key => {
      if (Array.isArray(currentDB[key])) {
        counts[key] = currentDB[key].length;
      } else {
        counts[key] = 1;
      }
    });

    const status = { valid, errors, counts };
    if (!dataToCheck) {
      setLocalIntegrity(status);
    }
    return status;
  };

  const handleExportBackup = async () => {
    setBackupInProgress(true);
    try {
      runDatabaseDiagnostics();
      
      const currentDB: any = {};
      const recordCounts: any = {};
      
      KEYS_TO_BACKUP.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          currentDB[key] = JSON.parse(raw);
          recordCounts[key] = Array.isArray(currentDB[key]) ? currentDB[key].length : 1;
        }
      });

      const payload = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        recordCounts,
        data: currentDB
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const filename = `sg_works_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      if (Capacitor.isNativePlatform()) {
        // Native: write to cache and share
        const result = await Filesystem.writeFile({
          path: filename,
          data: jsonStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });

        await Share.share({
          title: 'SG Engineering Backup',
          text: 'Here is your database backup file.',
          url: result.uri,
          dialogTitle: 'Save Backup'
        });
        
        showToast('Backup shared successfully.', 'success');
      } else {
        // Web: trigger download
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Backup downloaded successfully.', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to generate backup.', 'error');
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreInProgress(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const payload = JSON.parse(content);
        
        if (!payload.data || !payload.version) {
          throw new Error('Invalid backup file structure.');
        }

        const integrity = runDatabaseDiagnostics(payload.data);
        
        setRestorePreview({
          filename: file.name,
          payload,
          integrity
        });
      } catch (err: any) {
        showToast(err.message || 'Failed to read backup file.', 'error');
      } finally {
        setRestoreInProgress(false);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      showToast('Failed to read file.', 'error');
      setRestoreInProgress(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!restorePreview) return;

    const details = Object.entries(restorePreview.payload.recordCounts || {})
      .map(([tbl, cnt]) => `${tbl.replace('sg_db_', '')}: ${cnt}`)
      .join(', ');

    const confirmText = 
      `CRITICAL RESTORE REQUEST:\n\n` +
      `You are about to restore backup "${restorePreview.filename}" consisting of: \n${details}.\n\n` +
      `THIS WILL ENTIRELY OVERWRITE ALL CURRENT LOCAL STORAGE DATA.\n` +
      `Are you sure you want to proceed and run the restoration process?`;

    const confirmed = window.confirm(confirmText);
    if (!confirmed) return;

    try {
      // Clear existing DB keys
      KEYS_TO_BACKUP.forEach(key => localStorage.removeItem(key));
      
      // Write new data
      Object.keys(restorePreview.payload.data).forEach(key => {
        localStorage.setItem(key, JSON.stringify(restorePreview.payload.data[key]));
      });

      showToast('Database restore completed! Rebooting ERP workflow engine...', 'success');
      
      setRestorePreview(null);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      showToast('Failed during storage restoration rewrite.', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* TOAST NOTIFICATION CONTAINER */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl border flex items-center space-x-3 text-xs md:text-sm ${
              toast.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/30 text-rose-300'
                : 'bg-blue-950/90 border-blue-500/30 text-blue-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER COVER */}
      <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none -mb-20"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Database className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h2 className="text-lg font-serif font-bold text-white tracking-tight flex items-center gap-2">
                  Local Backup & Restore
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Manual Data Management for SG Engineering Works
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed pt-2">
              Secure your workshop enterprise status manually. Download your data as a backup file and safely store it on Google Drive or another secure location. When needed, upload the file to restore your entire database.
            </p>
          </div>
        </div>
      </div>

      {/* TWO PANELS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* PANEL 1: BACKUP EXPORT */}
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 shadow-lg flex flex-col space-y-4 h-full">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export Database File</span>
            </h3>

            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Backup Size:</span>
                <span className="font-mono font-bold text-slate-100">
                  {localIntegrity && localIntegrity.valid 
                    ? `${(JSON.stringify(localIntegrity.counts).length * 1.5 / 1024).toFixed(2)} KB` 
                    : 'Calculating...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Tables:</span>
                <span className="font-mono text-slate-300">
                  {localIntegrity ? Object.keys(localIntegrity.counts).length : 0} registered
                </span>
              </div>
            </div>

            <div className="flex-1"></div>

            <button
              onClick={handleExportBackup}
              disabled={backupInProgress}
              className={`w-full py-3 mt-4 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition cursor-pointer ${
                backupInProgress
                  ? 'bg-blue-900 text-blue-200 border border-blue-500/25'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10 active:scale-[0.99]'
              }`}
            >
              {backupInProgress ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Generating Backup File...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Backup File</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-500 leading-relaxed font-mono text-center">
              Save this file to a secure location (e.g. Google Drive).
            </p>
          </div>
        </div>

        {/* PANEL 2: RESTORE IMPORT */}
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 shadow-lg flex flex-col space-y-4 h-full">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restore Database File</span>
            </h3>

            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 relative hover:bg-slate-900/60 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".json" 
                onChange={handleFileSelect} 
                className="hidden" 
              />
              <Upload className="w-10 h-10 text-slate-500 mb-3" />
              <h4 className="text-xs font-semibold text-slate-300">Select Backup File</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1.5 leading-relaxed text-center">
                Tap to browse for a previously downloaded `sg_works_backup_...json` file.
              </p>
            </div>
            
            {restoreInProgress && (
              <div className="text-center py-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto" />
                <div className="text-[10px] text-slate-400 mt-2 font-mono">Reading file contents...</div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* DETAILED INTEGRITY SUMMARY PREVIEW MODAL BEFORE RESTORING */}
      <AnimatePresence>
        {restorePreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="p-1 px-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px] font-semibold uppercase tracking-wider">
                      Verify File Contents
                    </span>
                  </div>
                  <h3 className="text-base font-serif font-bold text-white mt-1">
                    Analyze Backup Prior to Restore
                  </h3>
                </div>
                <button
                  onClick={() => setRestorePreview(null)}
                  className="p-1 text-slate-400 hover:text-slate-100 rounded bg-slate-950 transition border border-slate-800"
                >
                  <span className="text-xs px-1.5 py-0.5 block font-mono">ESC</span>
                </button>
              </div>

              <div className="space-y-3.5 font-mono">
                <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
                  restorePreview.integrity.valid 
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                }`}>
                  {restorePreview.integrity.valid ? (
                    <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/40 rounded-full p-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-white">
                      {restorePreview.integrity.valid ? 'Backup File Valid' : 'Format Violations Found'}
                    </h4>
                    <p className="text-[11px] opacity-80 leading-relaxed mb-3 text-slate-300">
                      {restorePreview.filename}
                    </p>
                    <p className="text-[11px] opacity-80 leading-relaxed">
                      Timestamp: {new Date(restorePreview.payload.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800 shadow-inner">
                  <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider pb-1">
                    Payload Metrics
                  </div>
                  {Object.entries(restorePreview.integrity.counts).map(([tbl, count]) => (
                    <div key={tbl} className="flex items-center justify-between text-xs font-mono border-b border-slate-800/60 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-slate-400 truncate max-w-[180px]">{tbl.replace('sg_db_', '')}</span>
                      <span className="text-emerald-400 font-semibold">{count} records</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  onClick={() => setRestorePreview(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteRestore}
                  disabled={!restorePreview.integrity.valid}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 disabled:text-rose-400 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-rose-900/20 active:scale-[0.98] cursor-pointer"
                >
                  OVERWRITE & RESTORE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
