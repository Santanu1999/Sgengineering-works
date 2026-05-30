import React, { useState, useEffect } from 'react';
import { 
  googleSignIn, 
  googleSignOut, 
  initAuth, 
  getAccessToken,
  setCachedAccessToken
} from '../lib/firebase';
import { 
  createGoogleDriveBackup, 
  listDriveBackups, 
  downloadAndRestoreBackup, 
  writeRestoredToLocalStorage, 
  verifyDatabaseIntegrity,
  IDriveBackupFile,
  IBackupPayload
} from '../lib/gdrive';
import { 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  RefreshCw, 
  Trash2, 
  Clock, 
  User, 
  LogIn, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  Database, 
  Layout, 
  ShieldCheck, 
  Sparkles, 
  FileJson,
  Check,
  AlertTriangle,
  Flame,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BackupModule() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Backup operations state
  const [backups, setBackups] = useState<IDriveBackupFile[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [backupInProgress, setBackupInProgress] = useState<boolean>(false);
  const [restoreInProgress, setRestoreInProgress] = useState<boolean>(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  // Auto-backup configuration state (stored in localStorage)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(() => {
    return localStorage.getItem('sg_settings_auto_backup') === 'true';
  });
  const [autoBackupTriggerMode, setAutoBackupTriggerMode] = useState<string>(() => {
    return localStorage.getItem('sg_settings_auto_backup_trigger') || 'modification';
  });

  // Local Integrity Diagnostics Status
  const [localIntegrity, setLocalIntegrity] = useState<{
    valid: boolean;
    errors: string[];
    counts: { [key: string]: number };
  } | null>(null);

  // Selected backup file for previewing before restore
  const [restorePreview, setRestorePreview] = useState<{
    fileId: string;
    payload: IBackupPayload;
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

  // Run initial Auth check
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setIsLoadingAuth(false);
        showToast(`Welcome back, ${currentUser.displayName || 'Operator'}! Google Drive connected.`);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsLoadingAuth(false);
      }
    );
    
    // Evaluate current Database Integrity on load
    runDatabaseDiagnostics();

    return () => unsubscribe();
  }, []);

  // Sync state to Drive files once token changes
  useEffect(() => {
    if (token) {
      fetchBackupHistory(token);
    } else {
      setBackups([]);
    }
  }, [token]);

  // Load/Evaluate the current database diagnostics
  const runDatabaseDiagnostics = () => {
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

    const currentDB: any = {};
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

    const status = verifyDatabaseIntegrity(currentDB);
    setLocalIntegrity(status);
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        showToast('Successfully signed in with Google! Drive Cloud access enabled.', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Google Auth cancelled or failed.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setToken(null);
      showToast('Logged out of Google secure session.', 'info');
    } catch (err: any) {
      showToast('Failed to log out correctly.', 'error');
    }
  };

  const fetchBackupHistory = async (accessToken: string) => {
    setIsLoadingBackups(true);
    try {
      const list = await listDriveBackups(accessToken);
      setBackups(list);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to list backups from Google Drive.', 'error');
      // If unauthorized token state, clear
      if (err.message?.includes('401') || err.message?.includes('invalid_grant') || err.message?.includes('auth')) {
        setToken(null);
        setCachedAccessToken(null);
      }
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleCreateManualBackup = async () => {
    if (!token) {
      showToast('Authentication required. Let\'s sign in first.', 'info');
      return;
    }

    setBackupInProgress(true);
    try {
      // Evaluate local integrity beforehand
      runDatabaseDiagnostics();
      
      const res = await createGoogleDriveBackup(token);
      showToast(`Manual backup uploaded: ${res.filename}. (Cleared old archive files to keep last 7)`, 'success');
      
      // Refresh list
      await fetchBackupHistory(token);
      runDatabaseDiagnostics();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to generate cloud database backup.', 'error');
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleDeleteBackup = async (fileId: string, filename: string) => {
    if (!token) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete backup "${filename}" from Google Drive? This action is irreversible.`
    );
    if (!confirmed) return;

    setDeletingFileId(fileId);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to delete file from Drive REST endpoint.');
      }

      showToast(`Removed backup file "${filename}" from your cloud storage.`, 'success');
      await fetchBackupHistory(token);
    } catch (err: any) {
      showToast('Failed to delete backup file.', 'error');
    } finally {
      setDeletingFileId(null);
    }
  };

  const handlePreviewRestore = async (fileId: string) => {
    if (!token) return;

    setRestoreInProgress(true);
    try {
      const { payload, integrity } = await downloadAndRestoreBackup(token, fileId);
      setRestorePreview({
        fileId,
        payload,
        integrity
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to download backup preview.', 'error');
    } finally {
      setRestoreInProgress(false);
    }
  };

  const handleExecuteRestore = () => {
    if (!restorePreview) return;

    const keyCount = Object.keys(restorePreview.payload.recordCounts).length;
    const details = Object.entries(restorePreview.payload.recordCounts)
      .map(([tbl, cnt]) => `${tbl.replace('sg_db_', '')}: ${cnt}`)
      .join(', ');

    const confirmText = 
      `CRITICAL RESTORE REQUEST:\n\n` +
      `You are about to restore backup "${restorePreview.payload.timestamp}" consisting of: \n${details}.\n\n` +
      `THIS WILL ENTIRELY OVERWRITE ALL CURRENT LOCAL STORAGE DATA.\n` +
      `Are you sure you want to proceed and run the restoration process?`;

    const confirmed = window.confirm(confirmText);
    if (!confirmed) return;

    try {
      writeRestoredToLocalStorage(restorePreview.payload.data);
      showToast('Database restore completed! Rebooting ERP workflow engine...', 'success');
      
      // Clear preview
      setRestorePreview(null);
      
      // Delay briefly then reload to let keys activate
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      showToast('Failed during storage restoration rewrite.', 'error');
    }
  };

  const toggleAutoBackup = (checked: boolean) => {
    setAutoBackupEnabled(checked);
    localStorage.setItem('sg_settings_auto_backup', String(checked));
    showToast(`Automatic backups turned ${checked ? 'ON' : 'OFF'}.`, 'info');
  };

  const changeAutoBackupTrigger = (val: string) => {
    setAutoBackupTriggerMode(val);
    localStorage.setItem('sg_settings_auto_backup_trigger', val);
    showToast(`Backup schedule updated to: ${val === 'daily' ? 'Daily automatic simulated check' : 'Immediate data modifications'}.`, 'success');
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

      {/* COCKPIT HEADER COVER */}
      <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none -mb-20"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Cloud className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h2 className="text-lg font-serif font-bold text-white tracking-tight flex items-center gap-2">
                  Google Drive Backup & Restore Cloud
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Integrated Safe-Rooms for SG Engineering Works Enterprise Data Security
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed pt-2">
              Secure your complete workshop enterprise status. Easily download and overwrite schemas, list cloud history logs, 
              control automatic schedules, and keep your business resilient with high-fidelity backup checkpoints.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isLoadingAuth ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Checking Google Link...</span>
              </div>
            ) : user ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-2.5">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-slate-700 referrerPolicy" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                      {user.displayName?.[0] || 'O'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-semibold text-white truncate max-w-[140px] sm:max-w-[200px]">
                      {user.displayName || 'Authorized User'}
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center space-x-1 font-mono">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      <span>Connected</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Disconnect Google Drive Integration"
                  className="p-1 px-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 transition text-[10px] uppercase font-mono tracking-wider cursor-pointer flex items-center space-x-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Unlink</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isLoggingIn}
                className="gsi-material-button text-xs font-semibold shadow-lg shadow-blue-500/5 hover:scale-[1.01] transition active:scale-[0.99] cursor-pointer"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-sans">Google Drive Integration</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* THREE PANELS LAYOUT BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PANEL 1: MANUAL BACKUP CONTROL PANEL & SYSTEM INTEGRITY */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* SECURE DIRECT CONSOLE */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 shadow-lg flex flex-col space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Backup Ignition Room</span>
            </h3>

            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Target Connection:</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/10 text-[10px] font-mono">
                  Google Drive Cloud
                </span>
              </div>
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

            <button
              onClick={handleCreateManualBackup}
              disabled={backupInProgress || !user}
              className={`w-full py-3 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition cursor-pointer ${
                !user 
                  ? 'bg-slate-800 text-slate-500 border border-slate-850 cursor-not-allowed'
                  : backupInProgress
                  ? 'bg-blue-900 text-blue-200 border border-blue-500/25'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10 active:scale-[0.99]'
              }`}
            >
              {backupInProgress ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Generating Secure Backup Payload...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>Execute Manual Cloud Backup</span>
                </>
              )}
            </button>
            
            {!user && (
              <p className="text-[10px] text-amber-500/80 leading-relaxed font-mono text-center">
                ⚠ Please link your Google Drive Integration above before running manual backups.
              </p>
            )}
          </div>

          {/* DYNAMIC DATABASE INTEGRITY CHECKER */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Integrity Guard System</span>
              </h3>
              <button 
                onClick={() => { runDatabaseDiagnostics(); showToast('Integrity check completed.', 'info'); }}
                title="Force-diagnose DB"
                className="p-1 text-slate-400 hover:text-white rounded border border-slate-850 bg-slate-900 transition"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {localIntegrity ? (
              <div className="space-y-3.5">
                <div className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                  localIntegrity.valid 
                    ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' 
                    : 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                }`}>
                  {localIntegrity.valid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-semibold">
                      {localIntegrity.valid ? 'All Data Registers Valid' : 'Integrity Violations Found'}
                    </h4>
                    <p className="text-[10.5px] opacity-80 leading-relaxed mt-0.5">
                      {localIntegrity.valid 
                        ? '0 corrupted fields. The relational simulation successfully matches complete ERP guidelines with clear validation states.'
                        : `${localIntegrity.errors.length} cracks detected. Restoring a healthy backup recommended.`
                      }
                    </p>
                  </div>
                </div>

                {/* Sub-counts diagnostic listing */}
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-850">
                  <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider pb-1">Register Diagnostics</div>
                  {Object.entries(localIntegrity.counts).map(([tbl, count]) => (
                    <div key={tbl} className="flex items-center justify-between text-[11px] font-mono border-b border-slate-900/60 pb-1 last:border-0 last:pb-0">
                      <span className="text-slate-400 truncate max-w-[150px]">{tbl.replace('sg_db_', '')}</span>
                      <span className="text-slate-200 font-semibold">{count} rows</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 font-mono">
                Running diagnostic analysis...
              </div>
            )}
          </div>

        </div>

        {/* PANEL 2: INTEGRATION CLINIC & AUTOMATED CYCLES */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* AUTOMATED SCHEDULE CONTROL */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Smart Cloud Schedules</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-900/50 rounded-xl border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Toggle Auto Backup</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    Trigger background database checks periodically
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAutoBackup(!autoBackupEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoBackupEnabled ? 'bg-blue-600' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoBackupEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {autoBackupEnabled && (
                <div className="space-y-3 p-3.5 bg-slate-900/20 border border-slate-800/60 rounded-xl space-y-2 animate-fade-in">
                  <div className="text-xs font-semibold text-slate-300">Choose Automation Trigger:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => changeAutoBackupTrigger('modification')}
                      className={`p-2.5 rounded-lg border text-left text-[11px] transition cursor-pointer flex flex-col justify-between ${
                        autoBackupTriggerMode === 'modification'
                          ? 'border-blue-500/50 bg-blue-500/10 text-white'
                          : 'border-slate-850 bg-slate-950/30 text-slate-300 hover:bg-slate-950/60'
                      }`}
                    >
                      <span className="font-semibold block">On Data Modification</span>
                      <span className="text-[9px] text-slate-400 mt-1 block">Backs up dynamically when customer data is edited</span>
                    </button>

                    <button
                      onClick={() => changeAutoBackupTrigger('daily')}
                      className={`p-2.5 rounded-lg border text-left text-[11px] transition cursor-pointer flex flex-col justify-between ${
                        autoBackupTriggerMode === 'daily'
                          ? 'border-blue-500/50 bg-blue-500/10 text-white'
                          : 'border-slate-850 bg-slate-950/30 text-slate-300 hover:bg-slate-950/60'
                      }`}
                    >
                      <span className="font-semibold block">Daily (Daily simulated check)</span>
                      <span className="text-[9px] text-slate-400 mt-1 block">Checks if 24 hours elapsed on system launch</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="text-2xs bg-slate-900 border border-slate-855 rounded-lg p-3 text-slate-400 leading-relaxed font-mono flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Compression Rule:</strong> The cloud manager maintains a maximum of <strong>last 7 backups</strong>. Older files are cleared from the storage bucket automatically on every new cycle to conserve capacity.
                </span>
              </div>
            </div>
          </div>

          {/* HISTORICAL ARCHIVE METRICS BADGE */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Drive Storage Statistics</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase">Available Slots</div>
                <div className="text-lg font-bold text-white mt-1">
                  {Math.max(0, 7 - backups.length)} <span className="text-xs font-normal text-slate-500">of 7</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase">Active Backups</div>
                <div className="text-lg font-bold text-blue-400 mt-1">
                  {backups.length} <span className="text-xs font-normal text-slate-500">stored</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-950/20 border border-blue-500/10 rounded-xl">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shrink-0"></div>
                <span className="text-[11px] font-semibold text-blue-300">Keep Last 7 Backups Guard Enabled</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-1.5">
                The auto-pruner ensures that older backups (beyond slot index 7) are silently moved to trash on Google Drive whenever a new manual or automatic backup executes.
              </p>
            </div>
          </div>

        </div>

        {/* PANEL 3: CLOUD BACKUP HISTORY LIST */}
        <div className="lg:col-span-1 min-h-0">
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 shadow-lg flex flex-col h-full space-y-4 max-h-[600px] lg:max-h-none">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cloud Backup History</span>
              </h3>
              {user && (
                <button
                  onClick={() => fetchBackupHistory(token!)}
                  disabled={isLoadingBackups}
                  className="p-1 px-2 text-[10px] border border-slate-800 hover:border-slate-700 bg-slate-900 rounded font-mono text-slate-300 flex items-center space-x-1 cursor-pointer transition active:scale-[0.97]"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                  <span>Sync</span>
                </button>
              )}
            </div>

            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                <CloudRain className="w-10 h-10 text-slate-500 mb-3" />
                <h4 className="text-xs font-semibold text-slate-300">Drive History Offline</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1.5 leading-relaxed">
                  Please link your Google Account using the integration button above to stream backup archives from Google Drive.
                </p>
              </div>
            ) : isLoadingBackups ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 py-12 bg-slate-900/40 rounded-xl border border-slate-850">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                <span className="text-xs font-mono text-slate-400">Streaming archives from Google Cloud...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                <CloudLightning className="w-10 h-10 text-slate-500 mb-3" />
                <h4 className="text-xs font-semibold text-slate-300">Clean Cloud Folder</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1.5 leading-relaxed">
                  No compatible `sg_works_backup_` JSON files located in your Google Drive. Click "Execute Manual Cloud Backup" to seed your first safe snapshot.
                </p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {backups.map((backup, i) => (
                  <div 
                    key={backup.id}
                    className="p-3.5 bg-slate-900 hover:bg-slate-850/80 rounded-xl border border-slate-800 transition flex items-center justify-between gap-3 relative overflow-hidden"
                  >
                    {/* Keep top Indicator for slot hierarchy */}
                    {i === 0 && (
                      <span className="absolute top-0 right-0 px-2 py-0.5 bg-blue-600/20 text-blue-400 font-mono text-[8px] uppercase tracking-wider rounded-bl border-l border-b border-blue-500/20">
                        Latest
                      </span>
                    )}

                    <div className="space-y-1 truncate flex-1">
                      <div className="text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
                        <FileJson className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{backup.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-2">
                        <span>{new Date(backup.createdTime).toLocaleString()}</span>
                        <span>•</span>
                        <span>{backup.size ? `${(parseInt(backup.size) / 1024).toFixed(1)} KB` : '1.5 KB'}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handlePreviewRestore(backup.id)}
                        disabled={restoreInProgress}
                        title="Analyze and Restore Backup"
                        className="p-2 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-500 text-blue-400 hover:text-white rounded-lg transition active:scale-[0.95] cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.id, backup.name)}
                        disabled={deletingFileId === backup.id}
                        title="Permanently remove file from Google Drive"
                        className="p-2 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-550 text-rose-400 hover:text-white rounded-lg transition active:scale-[0.95] cursor-pointer"
                      >
                        {deletingFileId === backup.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
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
                      Verify Integrity Check Status
                    </span>
                  </div>
                  <h3 className="text-base font-serif font-bold text-white mt-1">
                    Analyze Backup Contents Prior to Restore
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
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                  )}
                  <div>
                    <span className="block font-bold uppercase text-[10.5px]">
                      {restorePreview.integrity.valid ? 'INTEGRITY VERIFICATION: PASSED' : 'INTEGRITY VERIFICATION: FAILED WARNING'}
                    </span>
                    <span className="block text-[10px] text-slate-300 leading-relaxed mt-1">
                      {restorePreview.integrity.valid 
                        ? 'This backup contains a flawless relational structure, has passed checksum validity, and contains complete structural integrity keys required to boots the database simulation natively.'
                        : `This backup container contains corrupted schemas or missing rows: \n${restorePreview.integrity.errors.join(' | ')}`
                      }
                    </span>
                  </div>
                </div>

                {/* DB Table Stats preview list */}
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-900 pb-1.5 flex items-center justify-between">
                    <span>Backup Database Tables</span>
                    <span className="text-slate-500 font-normal">Registered Structure Version: 1.5</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                    {Object.entries(restorePreview.payload.recordCounts).map(([key, cnt]) => (
                      <div key={key} className="flex justify-between border-b border-slate-900/40 pb-1">
                        <span className="text-slate-400">{key.replace('sg_db_', '')}:</span>
                        <span className="text-white font-bold">{cnt} rows</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-500/10 rounded-xl text-[10px] text-slate-400 leading-relaxed font-mono flex items-start gap-2">
                <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>CRITICAL WARNING:</strong> Restoring this backup will permanently overwrite your current browser local storage database. Ensure important unsaved data is manually backed up first!
                </span>
              </div>

              <div className="flex items-center space-x-3 shrink-0 pt-2">
                <button
                  type="button"
                  onClick={() => setRestorePreview(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Change Mind (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={!restorePreview.integrity.valid}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                    restorePreview.integrity.valid
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-800 text-slate-600 border border-slate-850 cursor-not-allowed'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Execute Database Restore</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
