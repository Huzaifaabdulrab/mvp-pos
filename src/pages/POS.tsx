import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { buildReceiptHTML } from '../utils/receipts';

type Product = {
    id: number;
    name: string;
    category: string;
    price: number;
    stock: number;
    barcode: string | null;
};

type CartItem = {
    id: number;
    name: string;
    price: number;
    qty: number;
    stock: number;
};

export default function POS() {
    // ===== State =====
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [barcode, setBarcode] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discount, setDiscount] = useState(0);
    const [paid, setPaid] = useState(0);
    const [checkoutDone, setCheckoutDone] = useState<any>(null);
    const barcodeRef = useRef<HTMLInputElement>(null);

    // ===== Load products =====
    const load = async () => {
        const data = await window.electronAPI.getProducts();
        setProducts(data);
    };

    useEffect(() => {
        load();
        barcodeRef.current?.focus();
    }, []);

    // ===== Filtered products (search) =====
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.category ?? '').toLowerCase().includes(q)
        );
    }, [products, search]);

    // ===== Cart helpers =====
    const addToCart = (p: Product) => {
        if (p.stock <= 0) {
            alert(`${p.name} is out of stock`);
            return;
        }
        setCart((prev) => {
            const existing = prev.find((c) => c.id === p.id);
            if (existing) {
                if (existing.qty >= p.stock) {
                    alert(`Only ${p.stock} in stock`);
                    return prev;
                }
                return prev.map((c) =>
                    c.id === p.id ? { ...c, qty: c.qty + 1 } : c
                );
            }
            return [
                ...prev,
                { id: p.id, name: p.name, price: p.price, qty: 1, stock: p.stock },
            ];
        });
    };

    const incQty = (id: number) => {
        setCart((prev) =>
            prev.map((c) => {
                if (c.id !== id) return c;
                if (c.qty >= c.stock) {
                    alert(`Only ${c.stock} in stock`);
                    return c;
                }
                return { ...c, qty: c.qty + 1 };
            })
        );
    };

    const decQty = (id: number) => {
        setCart((prev) =>
            prev
                .map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c))
                .filter((c) => c.qty > 0)
        );
    };

    const removeItem = (id: number) => {
        setCart((prev) => prev.filter((c) => c.id !== id));
    };

    // ===== Barcode scan/type + Enter =====
    const handleBarcode = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        const code = barcode.trim();
        if (!code) return;
        const product = products.find((p) => p.barcode === code);
        if (!product) {
            alert(`No product found for barcode: ${code}`);
            setBarcode('');
            return;
        }
        addToCart(product);
        setBarcode('');
    };

    // ===== Totals =====
    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal - discountAmount;
    const change = paid > total ? paid - total : 0;

    // ===== Checkout =====
    const handleCheckout = async () => {
        if (cart.length === 0) {
            alert('Cart is empty');
            return;
        }
        const res = await window.electronAPI.createSale({
            total,
            discount: discountAmount,
            paid: paid || total,
            items: cart.map((c) => ({
                id: c.id,
                name: c.name,
                price: c.price,
                qty: c.qty,
            })),
        });

        if (res.success) {
            // Save receipt data for preview / print (next step)
            setCheckoutDone({
                saleId: res.id,
                items: [...cart],
                subtotal,
                discountAmount,
                total,
                paid: paid || total,
                change,
                date: new Date().toLocaleString(),
            });

            // Reset cart
            setCart([]);
            setDiscount(0);
            setPaid(0);
            load(); // reload stock
        } else {
            alert('Checkout failed: ' + res.message);
        }
    };

    return (
        <div className="flex h-full">
            {/* ============ LEFT: PRODUCTS ============ */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                {/* Search bar */}
                <div className="relative mb-3">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Barcode input */}
                <div className="mb-3">
                    <input
                        ref={barcodeRef}
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyDown={handleBarcode}
                        placeholder="Scan barcode and press Enter..."
                        className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg bg-blue-50 outline-none focus:border-blue-500 font-mono"
                    />
                </div>

                {/* Product grid */}
                <div className="flex-1 overflow-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filtered.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => addToCart(p)}
                                disabled={p.stock <= 0}
                                className="text-left p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="font-semibold text-slate-800 text-sm truncate">
                                    {p.name}
                                </div>
                                <div className="text-xs text-slate-500 mb-2">
                                    {p.category || 'Uncategorized'}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-blue-600 font-bold">
                                        Rs {p.price}
                                    </span>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded ${p.stock < 5
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-green-100 text-green-700'
                                            }`}
                                    >
                                        {p.stock}
                                    </span>
                                </div>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div className="col-span-full text-center py-12 text-slate-400">
                                No products found
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ============ RIGHT: CART ============ */}
            <div className="w-[380px] bg-slate-900 text-white flex flex-col">
                <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                    <ShoppingCart size={20} />
                    <h2 className="font-bold text-lg">Cart ({cart.length})</h2>
                </div>

                {/* Cart items */}
                <div className="flex-1 overflow-auto p-3 space-y-2">
                    {cart.length === 0 && (
                        <div className="text-center text-slate-500 py-12 text-sm">
                            Cart is empty. Click a product to add.
                        </div>
                    )}
                    {cart.map((c) => (
                        <div
                            key={c.id}
                            className="bg-slate-800 rounded-lg p-3 flex items-center justify-between gap-2"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{c.name}</div>
                                <div className="text-xs text-slate-400">
                                    Rs {c.price} × {c.qty} = Rs {(c.price * c.qty).toFixed(2)}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => decQty(c.id)}
                                    className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="w-8 text-center font-semibold">{c.qty}</span>
                                <button
                                    onClick={() => incQty(c.id)}
                                    className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
                                >
                                    <Plus size={14} />
                                </button>
                                <button
                                    onClick={() => removeItem(c.id)}
                                    className="w-7 h-7 ml-1 rounded bg-red-900/50 hover:bg-red-700 flex items-center justify-center text-red-300"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals + checkout */}
                <div className="border-t border-slate-700 p-4 space-y-2 bg-slate-950">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Subtotal</span>
                        <span>Rs {subtotal.toFixed(2)}</span>
                    </div>

                    {/* Discount input */}
                    <div className="flex items-center justify-between text-sm gap-2">
                        <span className="text-slate-400">Discount %</span>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={discount}
                            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                            className="w-20 px-2 py-1 rounded bg-slate-800 text-right outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {discount > 0 && (
                        <div className="flex justify-between text-sm text-yellow-400">
                            <span>Discount</span>
                            <span>- Rs {discountAmount.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-700">
                        <span>Total</span>
                        <span className="text-green-400">Rs {total.toFixed(2)}</span>
                    </div>

                    {/* Paid input */}
                    <div className="flex items-center justify-between text-sm gap-2">
                        <span className="text-slate-400">Paid</span>
                        <input
                            type="number"
                            value={paid}
                            onChange={(e) => setPaid(Number(e.target.value) || 0)}
                            className="w-28 px-2 py-1 rounded bg-slate-800 text-right outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {paid > 0 && (
                        <div className="flex justify-between text-sm text-blue-400">
                            <span>Change</span>
                            <span>Rs {change.toFixed(2)}</span>
                        </div>
                    )}

                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className="w-full mt-3 py-3 rounded-lg bg-green-600 hover:bg-green-700 font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Checkout
                    </button>
                </div>
            </div>

            {/* ============ Receipt modal placeholder (Step 6) ============ */}
            {checkoutDone && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-[380px] text-slate-800">
                        <h3 className="text-xl font-bold mb-2">Sale Completed ✅</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Sale ID: #{checkoutDone.saleId}
                        </p>
                        <div className="text-sm space-y-1 border-t border-b border-dashed py-3 mb-3">
                            {checkoutDone.items.map((it: any) => (
                                <div key={it.id} className="flex justify-between">
                                    <span>
                                        {it.name} × {it.qty}
                                    </span>
                                    <span>Rs {(it.price * it.qty).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>Rs {checkoutDone.subtotal.toFixed(2)}</span>
                            </div>
                            {checkoutDone.discountAmount > 0 && (
                                <div className="flex justify-between text-yellow-600">
                                    <span>Discount</span>
                                    <span>- Rs {checkoutDone.discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>Rs {checkoutDone.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Paid</span>
                                <span>Rs {checkoutDone.paid.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-blue-600">
                                <span>Change</span>
                                <span>Rs {checkoutDone.change.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={() => {
                                    const html = buildReceiptHTML(checkoutDone);
                                    window.electronAPI.printReceipt(html);
                                }}
                                className="flex-1 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900"
                            >
                                Print Receipt
                            </button>
                            <button
                                onClick={() => setCheckoutDone(null)}
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