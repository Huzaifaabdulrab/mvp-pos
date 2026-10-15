import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Package, ShoppingCart, History, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

const links = [
    { to: '/pos', label: 'POS', icon: ShoppingCart },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/history', label: 'History', icon: History },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function Layout() {
    const { logout, user } = useAuth();
    const nav = useNavigate();
    const [online, setOnline] = useState(navigator.onLine);
    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
        };
    }, []);
    return (
        <div className="flex h-screen bg-slate-100">
            <aside className="w-56 bg-slate-900 text-white flex flex-col">
                <div className="p-5 border-b border-slate-700">
                    <h1 className="text-xl font-bold">MV POS</h1>
                    <p className="text-xs text-slate-400 mt-1">{user?.username}</p>
                </div>
                <nav className="flex-1 p-3 space-y-1">
                    {links.map((l) => (
                        <NavLink
                            key={l.to}
                            to={l.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 p-3 rounded-lg transition ${isActive ? 'bg-blue-600' : 'hover:bg-slate-800'
                                }`
                            }
                        >
                            <l.icon size={18} />
                            {l.label}
                        </NavLink>
                    ))}
                </nav>
                <button
                    onClick={() => {
                        logout();
                        nav('/login');
                    }}
                    className="m-3 p-3 rounded-lg bg-red-600 hover:bg-red-700 flex items-center gap-3"
                >
                    <LogOut size={18} /> Logout
                </button>
            </aside>
            <main className="flex-1 overflow-auto relative">
                <Outlet />

                {/* Sync Status Badge */}
                <div className="fixed bottom-4 right-4 z-40">
                    <div
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 ${online
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-red-100 text-red-700 border border-red-300'
                            }`}
                    >
                        <span
                            className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'
                                }`}
                        ></span>
                        {online ? 'Sync: Ready' : 'Sync: Offline'}
                    </div>
                </div>
            </main>
        </div>
    );
}