import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IOrderWIP } from '../../../../data/models/order.interface';

@Component({
  selector: 'app-production-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="production-timeline-container p-5 bg-slate-950/40 border border-slate-850 rounded-xl space-y-4">
      <h3 class="text-xs uppercase font-mono text-slate-500 font-bold tracking-tight">
        Manufacturing WIP Lifecycle Log
      </h3>
      
      <div class="relative pl-6 border-l-2 border-slate-800 space-y-6">
        <!-- Loop timeline logs -->
        <div *ngFor="let step of timeline; let idx = index; let isLast = last" class="relative group">
          <!-- Small outer bubble indicator -->
          <div [ngClass]="getTimelineIndicatorClasses(step)" class="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 bg-slate-900 flex items-center justify-center transition">
            <span class="w-1.5 h-1.5 rounded-full" [ngClass]="step.completion_date ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'"></span>
          </div>

          <!-- Content and metadata -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-200 uppercase tracking-tight">{{ step.stage }}</span>
              <span class="text-[10px] font-mono text-slate-500">{{ step.start_date | date:'dd MMM yyyy' }}</span>
            </div>
            
            <p class="text-xs text-slate-400 font-sans leading-relaxed">
              {{ step.remarks || 'No fabrication instructions or completion logs reported.' }}
            </p>

            <!-- Completed badge and dates -->
            <div class="flex items-center space-x-2 font-mono text-[9px] mt-1 text-slate-500" *ngIf="step.completion_date">
              <span class="text-emerald-400">✔️ CONFIRMED</span>
              <span>&bull;</span>
              <span>COMPLETED ON: {{ step.completion_date | date:'dd MMM yyyy' }}</span>
            </div>
            
            <div class="flex items-center space-x-2 font-mono text-[9px] mt-1 text-amber-500" *ngIf="!step.completion_date">
              <span class="animate-pulse">&bull; ACTIVE WORKSTATION PHASE</span>
            </div>
          </div>
        </div>

        <div *ngIf="timeline.length === 0" class="text-center font-sans py-4 text-xs text-slate-600">
          No manufacturing timeline stages recorded in SQLite database.
        </div>
      </div>
    </div>
  `
})
export class ProductionTimelineComponent {
  @Input() timeline: IOrderWIP[] = [];

  getTimelineIndicatorClasses(step: IOrderWIP): string {
    if (step.completion_date) {
      return 'border-emerald-500 shadow-lg shadow-emerald-500/10';
    }
    return 'border-amber-500 shadow-lg shadow-amber-500/10';
  }
}
