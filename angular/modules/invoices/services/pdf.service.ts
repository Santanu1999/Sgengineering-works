import { Injectable } from '@angular/core';
import { IInvoiceWithDetails, ICompanySettings, IInvoice } from '../../../../data/models/invoice.interface';

// Foolproof pdfmake imports
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

try {
  (pdfMake as any).vfs = pdfFonts.pdfMake.vfs;
} catch (e) {
  console.warn('VFS Fonts registry alert:', e);
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  constructor() {}

  /**
   * Generates and downloads the Invoice PDF dynamically on the client-side
   */
  public generateAndDownloadInvoice(details: IInvoiceWithDetails): void {
    const docDefinition = this.buildInvoiceDefinition(details);
    const fileName = `Invoice_${details.invoice.invoice_number.replace(/\//g, '_')}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);
  }

  /**
   * Generates and prints the Invoice PDF dynamically
   */
  public generateAndPrintInvoice(details: IInvoiceWithDetails): void {
    const docDefinition = this.buildInvoiceDefinition(details);
    pdfMake.createPdf(docDefinition).print();
  }

  /**
   * Helper function to build pdfmake document definitions objects
   */
  private buildInvoiceDefinition(details: IInvoiceWithDetails): any {
    const { invoice, customer, order, items, company } = details;

    // Format money helper
    const fmt = (val: number) => {
      return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Table rows compiler
    const itemRows = items.map((item, idx) => {
      return [
        { text: (idx + 1).toString(), alignment: 'center', style: 'tableCell' },
        { text: item.item_name, style: 'tableCellBold' },
        { text: item.description || '---', style: 'tableCell' },
        { text: item.quantity.toString(), alignment: 'center', style: 'tableCell' },
        { text: fmt(item.unit_price), alignment: 'right', style: 'tableCell' },
        { text: fmt(item.final_cost), alignment: 'right', style: 'tableCell' },
        { text: fmt(item.quantity * item.final_cost), alignment: 'right', style: 'tableCellBold' }
      ];
    });

    return {
      content: [
        // 1. Corporate Header Segment
        {
          columns: [
            [
              { text: company.company_name, style: 'companyName' },
              { text: company.address, style: 'companyDetails', margin: [0, 4, 0, 2] },
              { text: `Phone: +91 ${company.mobile} ${company.alternate_mobile ? '/ ' + company.alternate_mobile : ''}`, style: 'companyDetails' },
              { text: `Email: ${company.email || '---'}`, style: 'companyDetails' },
              { text: company.gstin ? `GSTIN: ${company.gstin}` : 'GSTIN: UNREGISTERED', style: 'companyGstin', margin: [0, 3, 0, 0] }
            ],
            [
              { text: 'TAX INVOICE', style: 'docTitle', alignment: 'right' },
              {
                table: {
                  widths: [100, 100],
                  body: [
                    [
                      { text: 'Invoice No:', style: 'metaLabel' },
                      { text: invoice.invoice_number, style: 'metaValue' }
                    ],
                    [
                      { text: 'Invoice Date:', style: 'metaLabel' },
                      { text: new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), style: 'metaValue' }
                    ],
                    [
                      { text: 'Order booking No:', style: 'metaLabel' },
                      { text: order.order_number, style: 'metaValue' }
                    ]
                  ]
                },
                layout: 'noBorders',
                alignment: 'right',
                margin: [0, 10, 0, 0]
              }
            ]
          ]
        },

        { text: '', style: 'divider' },

        // 2. Client segment
        {
          columns: [
            [
              { text: 'BILL TO (CUSTOMER)', style: 'sectionHeader' },
              { text: customer.name, style: 'customerName', margin: [0, 4, 0, 2] },
              { text: customer.address || 'Address: N/A', style: 'customerDetails' },
              { text: `Contact: +91 ${customer.mobile}`, style: 'customerDetails' },
              { text: customer.gst_number ? `GSTIN: ${customer.gst_number}` : 'GSTIN: Unregistered Consumer', style: 'customerDetails', margin: [0, 2, 0, 0] }
            ],
            [
              { text: 'FABRICATION WORKS JOB DETAILS', style: 'sectionHeader', alignment: 'right' },
              { text: `Order Placement: ${new Date(order.order_date).toLocaleDateString('en-IN')}`, style: 'customerDetails', alignment: 'right', margin: [0, 4, 0, 2] },
              { text: `Fulfillment Stage: ${order.status}`, style: 'customerDetails', alignment: 'right' },
              { text: order.notes ? `Specs Notes: ${order.notes}` : '', style: 'customerDetails', alignment: 'right', margin: [0, 4, 0, 0] }
            ]
          ]
        },

        { text: '', style: 'divider' },

        // 3. Line Items Table
        { text: 'BILLING SPECIFICATIONS & MATERIALS ALLOCATED', style: 'tableHeaderTitle' },
        {
          table: {
            headerRows: 1,
            widths: [20, 140, '*', 30, 65, 65, 75],
            body: [
              [
                { text: '#', style: 'tableHeader', alignment: 'center' },
                { text: 'Item Name', style: 'tableHeader' },
                { text: 'Specifications', style: 'tableHeader' },
                { text: 'Qty', style: 'tableHeader', alignment: 'center' },
                { text: 'List Price', style: 'tableHeader', alignment: 'right' },
                { text: 'Contract Price', style: 'tableHeader', alignment: 'right' },
                { text: 'Line Valor', style: 'tableHeader', alignment: 'right' }
              ],
              ...itemRows
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#cbd5e1',
            vLineColor: () => '#cbd5e1',
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 6,
            paddingBottom: () => 6
          }
        },

        // 4. Summaries & Tax Splits Block
        {
          columns: [
            {
              // Left: Declarations / Bank accounts / Sign
              width: '55%',
              stack: [
                { text: 'Declaration Terms:', style: 'termsHeading', margin: [0, 15, 0, 3] },
                { text: '1. All goods fabricate under professional technical warranties.', style: 'termsText' },
                { text: '2. Payment credit must be processed within due timelines.', style: 'termsText' },
                { text: '3. Disputes, if any, subject to local jurisdiction only.', style: 'termsText' },

                company.gstin ? {
                  text: [
                    { text: '\nCertified GST Split Approved Invoice.', style: 'termsText', bold: true }
                  ]
                } : ''
              ]
            },
            {
              // Right: Double-entry calculation grid
              width: '45%',
              margin: [0, 15, 0, 0],
              table: {
                widths: ['*', 75],
                body: [
                  [
                    { text: 'Taxable Amount (Excl. Tax):', style: 'summaryLabel' },
                    { text: fmt(invoice.taxable_amount), style: 'summaryValue' }
                  ],
                  invoice.cgst > 0 ? [
                    { text: `Central GST (CGST @ ${invoice.gst_rate / 2}%):`, style: 'summaryLabel' },
                    { text: fmt(invoice.cgst), style: 'summaryValue' }
                  ] : [],
                  invoice.sgst > 0 ? [
                    { text: `State GST (SGST @ ${invoice.gst_rate / 2}%):`, style: 'summaryLabel' },
                    { text: fmt(invoice.sgst), style: 'summaryValue' }
                  ] : [],
                  invoice.igst > 0 ? [
                    { text: `Integrated GST (IGST @ ${invoice.gst_rate}%):`, style: 'summaryLabel' },
                    { text: fmt(invoice.igst), style: 'summaryValue' }
                  ] : [],
                  [
                    { text: 'Grand Total (Incl. Tax):', style: 'grandTotalLabel' },
                    { text: fmt(invoice.total_amount), style: 'grandTotalValue' }
                  ],
                  [
                    { text: 'Payments Received (Credit):', style: 'summaryLabelReceipt' },
                    { text: fmt(invoice.paid_amount), style: 'summaryValueReceipt' }
                  ],
                  [
                    { text: 'Outstanding Balance (Debt):', style: 'outstandingLabel' },
                    { text: fmt(invoice.due_amount), style: 'outstandingValue' }
                  ]
                ].filter(row => row.length > 0)
              },
              layout: 'noBorders'
            }
          ]
        },

        { text: '', margin: [0, 30, 0, 0] },

        // 5. Signature Block
        {
          columns: [
            [
              { text: 'Customer Signature', style: 'signatureTitle', alignment: 'left' },
              { text: '\n\n\n_________________________', alignment: 'left', color: '#94a3b8' }
            ],
            [
              { text: `For, ${company.company_name}`, style: 'signatureTitle', alignment: 'right' },
              { text: '\n\n\nAuthorized Signatory', style: 'signatureDetails', alignment: 'right' }
            ]
          ]
        }
      ],

      styles: {
        companyName: { fontSize: 16, bold: true, color: '#0f172a' },
        companyDetails: { fontSize: 8, color: '#475569' },
        companyGstin: { fontSize: 9, bold: true, color: '#1e293b' },
        docTitle: { fontSize: 18, bold: true, color: '#0284c7' },
        metaLabel: { fontSize: 9, color: '#475569', bold: true },
        metaValue: { fontSize: 9, color: '#0f172a', fontSecondary: true },
        divider: { margin: [0, 10, 0, 15], borderLineWidth: 0.5, lineColor: '#e2e8f0' },
        sectionHeader: { fontSize: 9, bold: true, color: '#0f172a', tracking: 1, uppercase: true },
        customerName: { fontSize: 11, bold: true, color: '#1e293b' },
        customerDetails: { fontSize: 8.5, color: '#475569' },
        tableHeaderTitle: { fontSize: 10, bold: true, color: '#0f172a', margin: [0, 0, 0, 6] },
        tableHeader: { fontSize: 9, bold: true, color: '#475569', fillHex: '#f8fafc' },
        tableCell: { fontSize: 8.5, color: '#334155' },
        tableCellBold: { fontSize: 8.5, bold: true, color: '#1e293b' },
        termsHeading: { fontSize: 9, bold: true, color: '#334155' },
        termsText: { fontSize: 7.5, color: '#64748b', margin: [0, 1, 0, 1] },
        summaryLabel: { fontSize: 9, color: '#475569', alignment: 'right', margin: [0, 4, 0, 4] },
        summaryValue: { fontSize: 9, color: '#1e293b', alignment: 'right', margin: [0, 4, 0, 4] },
        summaryLabelReceipt: { fontSize: 9, color: '#047857', alignment: 'right', margin: [0, 4, 0, 4], bold: true },
        summaryValueReceipt: { fontSize: 9, color: '#047857', alignment: 'right', margin: [0, 4, 0, 4], bold: true },
        grandTotalLabel: { fontSize: 10, bold: true, color: '#0f172a', alignment: 'right', margin: [0, 6, 0, 6] },
        grandTotalValue: { fontSize: 10, bold: true, color: '#0f172a', alignment: 'right', margin: [0, 6, 0, 6] },
        outstandingLabel: { fontSize: 11, bold: true, color: '#be123c', alignment: 'right', margin: [0, 6, 0, 6], fillHex: '#fff1f2' },
        outstandingValue: { fontSize: 11, bold: true, color: '#be123c', alignment: 'right', margin: [0, 6, 0, 6] },
        signatureTitle: { fontSize: 9, bold: true, color: '#334155' },
        signatureDetails: { fontSize: 8, color: '#64748b', italic: true }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };
  }
}
