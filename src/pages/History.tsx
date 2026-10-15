import { useEffect, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { buildReceiptHTML, type ReceiptSale } from '../utils/receipts';

type Sale = {
  id: number;
  total: number;
  discount: number;
  paid: number;
  items: { id: number; name: string; price: number; qty: number }[];
  synced: number;
  created_at: string;
};

export default function History() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [preview, setPreview] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);

  // ===== Load sales from DB =====
  const load = async () => {
    setLoading(true);
    const data = await window.electronAPI.getSales();
    setSales(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // ===== Aggregates for today =====
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter((s) => s.created_at?.startsWith(today));
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

  // ===== Print a past sale =====
  const printSale = (s: Sale) => {
    const receipt: ReceiptSale = {
      saleId: s.id,
      items: s.items,
      subtotal: s.total + s.discount,
      discountAmount: s.discount,
      total: s.total,
      paid: s.paid,
      change: s.paid - s.total,
      date: s.created_at,
    };
    window.electronAPI.printReceipt(buildReceiptHTML(receipt));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales History</h1>
          <p className="text-sm text-slate-500 mt-1">
            Today: <span className="font-semibold text-slate-700">{todaySales.length}</span> sales,
            Rs <span className="font-semibold text-green-600">{todayTotal.toFixed(2)}</span>
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3">Sale #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-center">Items</th>
              <th className="px-4 py-3 text-right">Discount</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Sync</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  No sales yet
                </td>
              </tr>
            )}
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-slate-700">#{s.id}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {s.created_at}
                </td>
                <td className="px-4 py-3 text-center text-slate-600">
                  {s.items.length}
                </td>
                <td className="px-4 py-3 text-right text-yellow-600">
                  {s.discount > 0 ? `- Rs ${s.discount.toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">
                  Rs {s.total.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  {s.synced ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                      Synced
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs">
                      Local
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setPreview(s)}
                      className="p-2 rounded-lg hover:bg-blue-100 text-blue-600"
                      title="Preview"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[400px] text-slate-800 max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-bold mb-1">Sale #{preview.id}</h3>
            <p className="text-xs text-slate-500 mb-4">{preview.created_at}</p>

            <div className="text-sm space-y-1 border-t border-b border-dashed py-3 mb-3">
              {preview.items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>
                    {it.name} × {it.qty}
                  </span>
                  <span>Rs {(it.price * it.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>Rs {(preview.total + preview.discount).toFixed(2)}</span>
              </div>
              {preview.discount > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span>Discount</span>
                  <span>- Rs {preview.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>Rs {preview.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Paid</span>
                <span>Rs {preview.paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-blue-600">
                <span>Change</span>
                <span>Rs {(preview.paid - preview.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => printSale(preview)}
                className="flex-1 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900"
              >
                Print
              </button>
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}