import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceListComponent } from './invoice-list/invoice-list.component';
import { InvoiceFormComponent } from './invoice-form/invoice-form.component';
import { CompanySettingsComponent } from './company-settings/company-settings.component';
import { InvoiceService } from '../services/invoice.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    CommonModule,
    InvoiceListComponent,
    InvoiceFormComponent,
    CompanySettingsComponent
  ],
  template: `
    <div class="invoices-module-wrapper bg-[#0b0f19] text-slate-100 min-h-screen font-sans flex flex-col justify-between">
      
      <!-- Module Navigation Header -->
      <header class="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur border-b border-slate-800 py-4 px-6 shadow-md shadow-slate-950/25">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          
          <div class="flex items-center gap-3">
            <span class="text-2xl">📋</span>
            <div>
              <h1 class="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>SG Works Manager</span>
                <span class="text-[9px] font-mono font-normal uppercase bg-cyan-950/40 border border-cyan-800/80 px-2 py-0.5 rounded text-cyan-400">Offline-Core</span>
              </h1>
              <p class="text-[10px] text-slate-400 font-mono">Module :: Certified Tax-Billing, Invoices & Accounts Receivable</p>
            </div>
          </div>

          <!-- Chronos Engine Tracking -->
          <div class="flex items-center gap-3">
            <div class="hidden sm:flex flex-col text-right font-mono text-[9px] text-slate-500">
              <span class="tracking-wider text-[8px] uppercase">CHRONOS SYNC</span>
              <span class="text-slate-400">May 30, 2026 - 12:56 UTC</span>
            </div>
          </div>

        </div>
      </header>

      <!-- Active Content Flows Viewport -->
      <main class="py-6 px-4 sm:px-6 flex-1">
        <div class="max-w-7xl mx-auto">
          
          <div class="views-flow-renderer" [ngSwitch]="currentView()">
            <!-- View 1: History Listing Database search -->
            <app-invoice-list
              *ngSwitchCase="'list'"
              (createInvoice)="navigateToCreateForm()"
              (configureCompany)="navigateToSettings()"
            ></app-invoice-list>

            <!-- View 2: Formulator invoice registration -->
            <app-invoice-form
              *ngSwitchCase="'form'"
              (invoiceSaved)="resetToListView()"
              (cancel)="resetToListView()"
            ></app-invoice-form>

            <!-- View 3: Company profile settings configuration -->
            <app-company-settings-panel
              *ngSwitchCase="'settings'"
              (back)="resetToListView()"
            ></app-company-settings-panel>
          </div>

        </div>
      </main>

      <!-- Standard Footer -->
      <footer class="border-t border-slate-950 bg-slate-950/20 py-5 text-center text-[10px] text-slate-600 font-mono">
        SG Engineering Works Manager &copy; 2026. Certified Invoicing WAL Mode Active.
      </footer>
    </div>
  `
})
export class InvoicesModuleComponent implements OnInit {
  // Current visible component switch
  currentView = signal<'list' | 'form' | 'settings'>('list');

  constructor(private invoiceService: InvoiceService) {}

  ngOnInit(): void {
    // Scroll window to top upon launch
    window.scrollTo({ top: 0 });
  }

  navigateToCreateForm(): void {
    this.currentView.set('form');
  }

  navigateToSettings(): void {
    this.currentView.set('settings');
  }

  resetToListView(): void {
    this.currentView.set('list');
  }
}
