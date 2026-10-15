// Builds receipt data + HTML for printing
export type ReceiptSale = {
  saleId: number;
  items: { id: number; name: string; price: number; qty: number }[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paid: number;
  change: number;
  date: string;
};

export function buildReceiptHTML(sale: ReceiptSale): string {
  const rows = sale.items
    .map(
      (it) => `
      <tr>
        <td>${it.name}</td>
        <td style="text-align:center">${it.qty}</td>
        <td style="text-align:right">${(it.price * it.qty).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { font-family: 'Courier New', monospace; }
        body { width: 280px; margin: 0 auto; padding: 8px; font-size: 12px; }
        h2 { text-align: center; margin: 0 0 4px; }
        .center { text-align: center; }
        .muted { color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th { text-align: left; border-bottom: 1px dashed #000; }
        td { padding: 2px 0; }
        .totals { margin-top: 6px; border-top: 1px dashed #000; padding-top: 6px; }
        .totals div { display: flex; justify-content: space-between; }
        .bold { font-weight: bold; font-size: 14px; }
        .thanks { text-align: center; margin-top: 10px; font-size: 11px; }
      </style>
    </head>
    <body>
      <h2>MV POS</h2>
      <div class="center muted">Thank you for shopping!</div>
      <div class="center muted" style="margin-bottom:6px">${sale.date}</div>
      <div class="muted">Sale #${sale.saleId}</div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Amt</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div><span>Subtotal</span><span>Rs ${sale.subtotal.toFixed(2)}</span></div>
        ${
          sale.discountAmount > 0
            ? `<div><span>Discount</span><span>- Rs ${sale.discountAmount.toFixed(
                2
              )}</span></div>`
            : ''
        }
        <div class="bold"><span>Total</span><span>Rs ${sale.total.toFixed(2)}</span></div>
        <div><span>Paid</span><span>Rs ${sale.paid.toFixed(2)}</span></div>
        <div><span>Change</span><span>Rs ${sale.change.toFixed(2)}</span></div>
      </div>
      <div class="thanks">Powered by MV POS</div>
    </body>
  </html>`;
}