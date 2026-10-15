import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  barcode: string | null;
};

type Sale = {
  id: number;
  total: number;
  discount: number;
  paid: number;
  items: { id: number; name: string; price: number; qty: number }[];
  synced: number;
  created_at: string;
};

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // ===== Load everything =====
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, s] = await Promise.all([
        window.electronAPI.getProducts(),
        window.electronAPI.getSales(),
      ]);
      setProducts(p);
      setSales(s);
      setLoading(false);
    })();
  }, []);

  // ===== KPI calculations =====
  const today = new Date().toISOString().slice(0, 10);

  const todaySales = useMemo(
    () => sales.filter((s) => s.created_at?.startsWith(today)),
    [sales, today]
  );

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalItemsSold = sales.reduce(
    (sum, s) => sum + s.items.reduce((a, it) => a + it.qty, 0),
    0
  );
  const lowStockProducts = products.filter((p) => p.stock < 5);
  const totalStockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  // ===== Top selling products (all time) =====
  const topProducts = useMemo(() => {
    const map = new Map<number, { name: string; qty: number; revenue: number }>();
    for (const s of sales) {
      for (const it of s.items) {
        const prev = map.get(it.id) ?? { name: it.name, qty: 0, revenue: 0 };
        prev.qty += it.qty;
        prev.revenue += it.qty * it.price;
        map.set(it.id, prev);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [sales]);

  // ===== Last 7 days trend (for mini bar chart) =====
  const last7 = useMemo(() => {
    const days: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en', { weekday: 'short' });
      const total = sales
        .filter((s) => s.created_at?.startsWith(key))
        .reduce((a, s) => a + s.total, 0);
      days.push({ label, total });
    }
    return days;
  }, [sales]);

  const maxDay = Math.max(...last7.map((d) => d.total), 1);

  // ===== Loading state =====
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      {/* ===== KPI Cards ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Today's Revenue"
          value={`Rs ${todayRevenue.toFixed(0)}`}
          sub={`${todaySales.length} sales today`}
          icon={DollarSign}
          color="green"
        />
        <KpiCard
          title="Total Revenue"
          value={`Rs ${totalRevenue.toFixed(0)}`}
          sub={`${sales.length} lifetime sales`}
          icon={TrendingUp}
          color="blue"
        />
        <KpiCard
          title="Items Sold"
          value={String(totalItemsSold)}
          sub={`${products.length} products in catalog`}
          icon={ShoppingCart}
          color="purple"
        />
        <KpiCard
          title="Low Stock Alerts"
          value={String(lowStockProducts.length)}
          sub={`Stock value: Rs ${totalStockValue.toFixed(0)}`}
          icon={AlertTriangle}
          color={lowStockProducts.length > 0 ? 'red' : 'slate'}
        />
      </div>

      {/* ===== Middle row: Sales Trend + Low Stock ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales trend (last 7 days) */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4">Last 7 Days Sales</h2>
          <div className="flex items-end justify-between gap-2 h-40">
            {last7.map((d, i) => {
              const h = (d.total / maxDay) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <span className="text-xs text-slate-500 font-medium">
                    {d.total > 0 ? `Rs ${d.total.toFixed(0)}` : ''}
                  </span>
                  <div
                    className="w-full bg-blue-500 rounded-t-md transition-all hover:bg-blue-600"
                    style={{ height: `${Math.max(h, 2)}%` }}
                    title={`Rs ${d.total.toFixed(2)}`}
                  />
                  <span className="text-xs text-slate-600">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low stock list */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Low Stock Products
            </h2>
            <span className="text-xs text-slate-500">
              Stock &lt; 5
            </span>
          </div>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              🎉 All products are well stocked.
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-auto">
              {lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-100"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.category || 'Uncategorized'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded font-bold">
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Bottom row: Top Products + Recent Sales ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top selling */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package size={18} className="text-blue-500" />
            Top Selling Products
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              No sales data yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="pb-2">#</th>
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-center">Qty Sold</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((t, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-2 text-slate-400">{i + 1}</td>
                    <td className="py-2 font-medium text-slate-700">
                      {t.name}
                    </td>
                    <td className="py-2 text-center text-slate-600">{t.qty}</td>
                    <td className="py-2 text-right font-semibold text-green-600">
                      Rs {t.revenue.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent sales */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4">Recent Sales</h2>
          {sales.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              No sales yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {sales.slice(0, 8).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Sale #{s.id}
                    </p>
                    <p className="text-xs text-slate-500">{s.created_at}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">
                      Rs {s.total.toFixed(0)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.items.length} items
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Reusable KPI Card component ===== */
function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  sub: string;
  icon: any;
  color: 'green' | 'blue' | 'purple' | 'red' | 'slate';
}) {
  const colorMap = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}