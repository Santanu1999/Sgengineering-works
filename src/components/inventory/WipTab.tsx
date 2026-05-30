import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  MapPin, 
  Calendar, 
  History, 
  Activity, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Info
} from 'lucide-react';
import { inventoryAPI } from '../../data/inventory-database';
import { IWipJob, WipStage, IFinishedGood, IWipStageMilestone } from '../../types/inventory.interface';

interface WipTabProps {
  finishedGoods: IFinishedGood[];
  onRefresh: () => void;
}

const STAGES: WipStage[] = [
  'Material Procurement',
  'Cutting',
  'Welding',
  'Assembly',
  'Painting',
  'Testing',
  'Ready'
];

export default function WipTab({ finishedGoods, onRefresh }: WipTabProps) {
  const [wipJobs, setWipJobs] = useState<IWipJob[]>(() => inventoryAPI.getWipJobs());
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Forms visual states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  // Job creation fields
  const [createProductId, setCreateProductId] = useState('');
  const [createQty, setCreateQty] = useState(1);
  const [createEstDays, setCreateEstDays] = useState(15);
  const [createOrderNo, setCreateOrderNo] = useState('');
  const [createNotes, setCreateNotes] = useState('');

  // Progression fields
  const [nextStage, setNextStage] = useState<WipStage>('Material Procurement');
  const [progressNotes, setProgressNotes] = useState('');

  const refreshList = () => {
    setWipJobs(inventoryAPI.getWipJobs());
    onRefresh();
  };

  const activeJob = useMemo(() => {
    return wipJobs.find(w => w.id === selectedJobId) || null;
  }, [wipJobs, selectedJobId]);

  // Handle new WIP fabrication job starting
  const handleStartProductionJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createProductId) return;

    const targetFG = finishedGoods.find(fg => fg.id === createProductId);
    if (!targetFG) return;

    const estCompDate = new Date();
    estCompDate.setDate(estCompDate.getDate() + Number(createEstDays));
    const estDateStr = estCompDate.toISOString().split('T')[0];

    try {
      // Trigger API start workflow (this auto deductible BOM materials if configured!)
      inventoryAPI.triggerProductionStart({
        productId: targetFG.id,
        quantity: Number(createQty),
        estimatedCompletion: estDateStr,
        orderId: null,
        orderNo: createOrderNo || `M-MANUAL-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        notes: createNotes || 'Manually authorized shopfloor run'
      });

      setIsCreateOpen(false);
      refreshList();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Setup progress phase modal
  const handleOpenProgress = (job: IWipJob) => {
    const currentIdx = STAGES.indexOf(job.current_stage);
    const defaultsNext = STAGES[Math.min(STAGES.length - 1, currentIdx + 1)];
    setNextStage(defaultsNext);
    setProgressNotes('');
    setIsProgressOpen(true);
  };

  // Process advance stage
  const handleSaveProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) return;

    inventoryAPI.triggerWipStageChange(selectedJobId, nextStage, progressNotes || `Phase transition: ${nextStage}`);
    setIsProgressOpen(false);
    refreshList();
  };

  // Days Elapsed & Delay indicator calculation
  const getDaysElapsedInfo = (startDateStr: string, estDateStr: string) => {
    const start = new Date(startDateStr);
    const today = new Date();
    const est = new Date(estDateStr);

    const elapsedMs = today.getTime() - start.getTime();
    const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));

    const remainingMs = est.getTime() - today.getTime();
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    const isOverdue = remainingDays < 0;

    return {
      elapsedDays,
      remainingDays: Math.abs(remainingDays),
      isOverdue
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[calc(100vh-175px)] lg:h-[620px] font-sans">
      
      {/* 4 COLS: SHURT ACTIVE MANUFACTURE RUNS DIRECTORY */}
      <div className="lg:col-span-4 bg-[#111625] border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden max-lg:h-[300px]">
        <div className="p-4 border-b border-slate-850 flex items-center justify-between bg-slate-950/20">
          <h4 className="text-xs font-serif font-black tracking-wide text-white flex items-center gap-1.5 uppercase">
            <Wrench className="w-4 h-4 text-violet-400 animate-pulse" />
            <span>FABRICATION SCHEDULER (WIP)</span>
          </h4>
          <button
            onClick={() => {
              setCreateProductId(finishedGoods[0]?.id || '');
              setCreateQty(1);
              setCreateEstDays(14);
              setCreateOrderNo('');
              setCreateNotes('');
              setIsCreateOpen(true);
            }}
            className="p-1 px-3 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-bold font-mono text-[9px] cursor-pointer"
          >
            + TRIGGER JOB
          </button>
        </div>

        {/* List of active jobs */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-850 custom-scrollbar">
          {wipJobs.map((w) => {
            const isSelected = w.id === selectedJobId;
            const elapsedInfo = getDaysElapsedInfo(w.start_date, w.estimated_completion_date);
            const isCompleted = w.current_stage === 'Ready';

            return (
              <div
                key={w.id}
                onClick={() => setSelectedJobId(w.id)}
                className={`p-3.5 text-xs transition cursor-pointer space-y-1.5 select-none ${
                  isSelected ? 'bg-violet-505/10 bg-violet-600/10 border-r-2 border-violet-500' : 'hover:bg-slate-900/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h5 className="font-bold text-slate-100">{w.product_name}</h5>
                  <span className={`text-[8.5px] font-mono leading-none font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ml-1 ${
                    isCompleted 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-violet-500/10 text-violet-400'
                  }`}>
                    {w.current_stage}
                  </span>
                </div>

                <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                  <span>Batch: <strong className="text-slate-300 font-bold">{w.quantity} counts</strong></span>
                  <span>Order: <strong className="text-blue-400">{w.order_number || 'N/A'}</strong></span>
                </div>

                {/* delay indicator warning */}
                {!isCompleted && elapsedInfo.isOverdue && (
                  <p className="text-[9px] text-red-400 font-mono flex items-center space-x-1 animate-pulse bg-red-500/10 p-1 rounded border border-red-500/10">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>OVERDUE BY {elapsedInfo.remainingDays} DAYS</span>
                  </p>
                )}
              </div>
            );
          })}

          {wipJobs.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-8">No active manufacturing runs started</p>
          )}
        </div>
      </div>

      {/* 8 COLS: ACTIVE WIP WORKSPACE & LIVE STAGES TRACKER */}
      <div className="lg:col-span-8 bg-[#111625] border border-slate-800 rounded-2xl h-full flex flex-col overflow-hidden">
        {activeJob ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Spec Header */}
            <div className="p-4 border-b border-slate-850 bg-slate-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500">Fabrications Process Tracking Control</span>
                <h3 className="text-base font-serif font-black text-white">{activeJob.product_name}</h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  Batch Quantity: <strong className="text-slate-300">{activeJob.quantity} Machinery units</strong> | Order Reference: {activeJob.order_number}
                </p>
              </div>

              {activeJob.current_stage !== 'Ready' && (
                <button
                  onClick={() => handleOpenProgress(activeJob)}
                  className="p-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-mono font-bold rounded-xl text-xs active:scale-95 transition cursor-pointer flex items-center space-x-1.5 shrink-0"
                >
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  <span>Advance Fabrication Stage</span>
                </button>
              )}
            </div>

            {/* Stages Grid Indicator Progress Bar (Interactive timeline) */}
            <div className="p-5 border-b border-slate-850 bg-slate-950/20 grid grid-cols-2 sm:grid-cols-7 gap-2 text-center text-[10px] uppercase font-mono tracking-wider text-slate-400 shrink-0">
              {STAGES.map((s, idx) => {
                const currentIdx = STAGES.indexOf(activeJob.current_stage);
                const isActive = activeJob.current_stage === s;
                const isPassed = currentIdx > idx;
                
                return (
                  <div 
                    key={s} 
                    className={`p-2 py-3 rounded-lg border flex flex-col items-center justify-between min-h-[60px] ${
                      isActive 
                        ? 'bg-violet-600/10 border-violet-500 text-violet-400 font-bold' 
                        : isPassed 
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                          : 'bg-slate-900 border-slate-850 text-slate-500'
                    }`}
                  >
                    <span className="text-[8.5px] leading-relaxed line-clamp-2">{s}</span>
                    <div className="mt-1.5">
                      {isPassed ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isActive ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping"></div>
                      ) : (
                        <span className="text-slate-700 text-3xs font-mono">{idx + 1}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Downward splitting columns: Milestones chronological logs (Left) vs Technical Remarks (Right) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-y-auto">
              
              {/* Box A: Historic milestones transitions */}
              <div className="p-5 border-r border-slate-850/60 flex flex-col h-full space-y-4">
                <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <History className="w-4 h-4 text-violet-400" />
                  <span>Fabrication timeline chronicles:</span>
                </h4>

                <div className="space-y-4 relative pl-3 border-l border-slate-850">
                  {activeJob.milestones.map((ms, idx) => (
                    <div key={idx} className="relative space-y-1">
                      {/* marker dot */}
                      <span className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-violet-500 z-10" />
                      
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <strong className="text-violet-400 font-bold uppercase">{ms.stage}</strong>
                        <span>{new Date(ms.timestamp).toLocaleTimeString()} ({new Date(ms.timestamp).toISOString().split('T')[0]})</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-normal bg-slate-900/30 p-2.5 border border-slate-850 rounded-lg">
                        {ms.notes}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box B: Tech metadata instructions */}
              <div className="p-5 bg-slate-950/20 text-xs flex flex-col space-y-4 h-full">
                <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold block">
                  Shop-floor fabrication remarks:
                </h4>

                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850/60 space-y-3 font-sans leading-relaxed text-slate-300">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4.5 h-4.5 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs italic">“{activeJob.notes || 'No general notes compiled at launching time'}”</p>
                  </div>

                  <div className="pt-2 border-t border-slate-850 text-[10px] font-mono text-slate-400 space-y-1">
                    <p>Manufacturing Launch date: <strong className="text-slate-200">{activeJob.start_date}</strong></p>
                    <p>Target delivery schedule date: <strong className="text-blue-400">{activeJob.estimated_completion_date}</strong></p>
                  </div>
                </div>

                {/* delay diagnostic logs */}
                {activeJob.current_stage !== 'Ready' && (
                  <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850/60 text-[11px] font-mono text-slate-400">
                    <p className="font-bold text-slate-300 mb-2 uppercase tracking-wide">Manufacturing performance diagnostics:</p>
                    {(() => {
                      const elapsed = getDaysElapsedInfo(activeJob.start_date, activeJob.estimated_completion_date);
                      return (
                        <div className="space-y-1 text-xs">
                          <p>Days active on tools: <strong className="text-slate-200">{elapsed.elapsedDays} workdays</strong></p>
                          <p>
                            {elapsed.isOverdue ? (
                              <span className="text-red-400">Overdue SLA limit: {elapsed.remainingDays} days behind</span>
                            ) : (
                              <span className="text-emerald-400">Est. buffer safely: {elapsed.remainingDays} calendar days remaining</span>
                            )}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

              </div>

            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 p-12 text-center h-full">
            <Wrench className="w-12 h-12 text-slate-700 animate-pulse" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-300">Shopfloor Control Dormant</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-normal">
                Choose an active fabrication job schedule from the left directory column to inspect Kanban stage status, milestones diaries, and delay diagnostics.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* --- VOID START NEW JOB DIALOG --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 font-sans">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Plus className="w-5 h-5 text-violet-400 animate-ping" />
              <span>Launch Production WIP run</span>
            </h3>

            <form onSubmit={handleStartProductionJob} className="space-y-4.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Target Machinery Finished Product *</label>
                <select
                  required
                  value={createProductId}
                  onChange={(e) => setCreateProductId(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 outline-none"
                >
                  <option value="" disabled>Choose machinery output</option>
                  {finishedGoods.map(fg => (
                    <option key={fg.id} value={fg.id}>{fg.name} (Code: {fg.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Batch Size (Units)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createQty}
                    onChange={(e) => setCreateQty(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Estimated Days SLA</label>
                  <input
                    type="number"
                    min="2"
                    required
                    value={createEstDays}
                    onChange={(e) => setCreateEstDays(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Linked sales order / custom token</label>
                <input
                  type="text"
                  value={createOrderNo}
                  onChange={(e) => setCreateOrderNo(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 placeholder-slate-500 font-mono outline-none"
                  placeholder="e.g. ORD-2026-009"
                />
              </div>

              <div className="space-y-1 bg-slate-950/40 p-2.5 rounded text-[10px] text-slate-500 leading-normal">
                ℹ️ <span className="text-slate-400 font-semibold text-violet-400">Inventory automation trigger:</span> Confirming this job will immediately deploy the BOM blueprint (if configured) and **deplete raw material stock** accordingly so the shopfloor has component allocations.
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Manufacturing Specifications Notes</label>
                <input
                  type="text"
                  required
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 outline-none"
                  placeholder="Thickness tolerances, high temp elements configs..."
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-lg font-mono text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  Confirm & Start Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADVANCE MANUFACTURE STAGES DIALOG --- */}
      {isProgressOpen && activeJob && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-400 animate-pulse" />
              <span>Shift Fabrication Stage</span>
            </h3>
            <p className="text-xs text-slate-400">
              For machinery batch: <strong className="text-slate-200">{activeJob.product_name}</strong>
            </p>

            <form onSubmit={handleSaveProgress} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Advanced to:</label>
                <select
                  value={nextStage}
                  onChange={(e: any) => setNextStage(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-300 font-bold outline-none cursor-pointer"
                >
                  {STAGES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Add Stage Completion Diary Note *</label>
                <textarea
                  required
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 h-20 resize-none outline-none"
                  placeholder="e.g. TIG Welding completed double checks passed. Passing to assembly..."
                />
              </div>

              {nextStage === 'Ready' && (
                <div className="space-y-1 bg-emerald-500/10 p-2 border border-emerald-500/20 rounded text-[10px] text-emerald-400 leading-normal">
                  🚀 <span className="font-semibold text-white">Production complete trigger:</span> Shifting stage to <strong>'Ready'</strong> will automatically stock-in <strong>+{activeJob.quantity} Machinery Units</strong> under Finished Goods inventory registers.
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsProgressOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded lg font-mono text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  Confirm progression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
