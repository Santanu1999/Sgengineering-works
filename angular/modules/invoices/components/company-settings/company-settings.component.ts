import { Component, OnInit, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceService } from '../../services/invoice.service';
import { ICompanySettings } from '../../../../data/models/invoice.interface';

@Component({
  selector: 'app-company-settings-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-settings-panel p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-2xl mx-auto space-y-6 font-sans">
      
      <!-- Panel Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <button
            (click)="triggerBack()"
            class="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none"
          >
            <span>← Return to billing lists</span>
          </button>
          <h2 class="text-lg font-bold font-serif tracking-tight text-white mt-2">GSTIN & Corporate Billing Settings</h2>
          <p class="text-xs text-slate-400 mt-0.5">Define company coordinates displayed in printed PDF headers.</p>
        </div>
      </div>

      <!-- Settings Formulation fields -->
      <div class="space-y-4" *ngIf="settingsForm()">
        
        <div>
          <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Company Legal Name</label>
          <input
            type="text"
            [(ngModel)]="settingsForm().company_name"
            placeholder="e.g. SG Engineering Works"
            class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 rounded-xl px-4 py-2 text-xs transition outline-none"
          />
        </div>

        <div>
          <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Registered Billing address</label>
          <textarea
            [(ngModel)]="settingsForm().address"
            rows="3"
            placeholder="Standard industrial area plots and country..."
            class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 rounded-xl px-4 py-2 text-xs transition outline-none resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Mobile Contact Primary</label>
            <input
              type="text"
              [(ngModel)]="settingsForm().mobile"
              placeholder="e.g. 9876543210"
              class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 rounded-xl px-4 py-2 text-xs transition outline-none"
            />
          </div>

          <div>
            <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Alternate Contact (Optional)</label>
            <input
              type="text"
              [(ngModel)]="settingsForm().alternate_mobile"
              placeholder="e.g. 911223344"
              class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 rounded-xl px-4 py-2 text-xs transition outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Corporate Email Address</label>
            <input
              type="email"
              [(ngModel)]="settingsForm().email"
              placeholder="e.g. billing@sgworks.in"
              class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 rounded-xl px-4 py-2 text-xs transition outline-none"
            />
          </div>

          <div>
            <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Government GSTIN Code</label>
            <input
              type="text"
              [(ngModel)]="settingsForm().gstin"
              placeholder="e.g. 24AAAAA0000A1Z5"
              class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 rounded-xl px-4 py-2 text-xs font-mono transition uppercase outline-none"
            />
            <p class="text-[9px] text-slate-550 font-mono mt-1">Leave empty if unregistered.</p>
          </div>
        </div>

        <!-- Submit trigger panel -->
        <div class="flex gap-2 pt-4 border-t border-slate-800/80">
          <button
            (click)="triggerSaveSettings()"
            class="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition active:scale-95 cursor-pointer"
          >
            Save Default Configurations
          </button>
          
          <button
            (click)="triggerBack()"
            class="px-4 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>

    </div>
  `
})
export class CompanySettingsComponent implements OnInit {
  @Output() back = new EventEmitter<void>();

  settingsForm = signal<ICompanySettings | null>(null);

  constructor(private invoiceService: InvoiceService) {}

  ngOnInit(): void {
    this.invoiceService.loadCompanySettings().subscribe({
      next: (settings) => {
        // Deep copy of signals data values to avoid inline mutating
        this.settingsForm.set({ ...settings });
      }
    });
  }

  triggerBack(): void {
    this.back.emit();
  }

  triggerSaveSettings(): void {
    const form = this.settingsForm();
    if (!form) return;

    if (!form.company_name || form.company_name.trim() === '') {
      alert('Kindly declare a valid company name to submit.');
      return;
    }

    if (!form.mobile || form.mobile.trim() === '') {
      alert('Primary mobile coordinate is required.');
      return;
    }

    this.invoiceService.saveCompanySettings(form).subscribe({
      next: () => {
        alert('✅ SUCCESS: Gst & Company profile updated successfully.');
        this.back.emit();
      },
      error: (err) => {
        console.error(err);
        alert('❌ FAILED: Database write error occurred whilst saving profile settings.');
      }
    });
  }
}
