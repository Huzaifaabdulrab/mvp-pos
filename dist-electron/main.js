import { BrowserWindow as e, app as t, ipcMain as n } from "electron";
import r from "node:path";
import { fileURLToPath as i } from "node:url";
import a from "node:fs";
import { createRequire as o } from "node:module";
import s from "electron-updater";
//#region electron/database.ts
var c = o(import.meta.url)("better-sqlite3"), l = t.getPath("userData"), u = r.join(l, "mvpos.db");
a.existsSync(l) || a.mkdirSync(l, { recursive: !0 });
var d = new c(u);
d.pragma("journal_mode = WAL"), d.exec("\n  CREATE TABLE IF NOT EXISTS users (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    username TEXT UNIQUE NOT NULL,\n    password TEXT NOT NULL,\n    role TEXT DEFAULT 'admin',\n    created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n  );\n\n  CREATE TABLE IF NOT EXISTS products (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    name TEXT NOT NULL,\n    category TEXT,\n    price REAL NOT NULL,\n    stock INTEGER DEFAULT 0,\n    barcode TEXT UNIQUE,\n    created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n  );\n\n  CREATE TABLE IF NOT EXISTS sales (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    total REAL NOT NULL,\n    discount REAL DEFAULT 0,\n    paid REAL DEFAULT 0,\n    items TEXT NOT NULL,\n    synced INTEGER DEFAULT 0,\n    created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n  );\n\n  CREATE TABLE IF NOT EXISTS settings (\n    key TEXT PRIMARY KEY,\n    value TEXT\n  );\n");
function f(e, t) {
	return d.prepare(`PRAGMA table_info(${e})`).all().some((e) => e.name === t);
}
if (f("users", "role") || (d.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'"), console.log("Migration: added role column to users")), f("users", "created_at") || d.exec("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"), f("products", "barcode") || d.exec("ALTER TABLE products ADD COLUMN barcode TEXT"), f("sales", "synced") || d.exec("ALTER TABLE sales ADD COLUMN synced INTEGER DEFAULT 0"), f("sales", "paid") || d.exec("ALTER TABLE sales ADD COLUMN paid REAL DEFAULT 0"), d.prepare("SELECT id FROM users WHERE username = ?").get("admin") || d.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "123456", "admin"), d.prepare("SELECT COUNT(*) as c FROM products").get().c === 0) {
	let e = d.prepare("INSERT INTO products (name, category, price, stock, barcode) VALUES (?, ?, ?, ?, ?)");
	[
		[
			"Coca Cola 500ml",
			"Drinks",
			100,
			50,
			"1001"
		],
		[
			"Pepsi 500ml",
			"Drinks",
			100,
			40,
			"1002"
		],
		[
			"Lays Chips",
			"Snacks",
			50,
			30,
			"1003"
		],
		[
			"Dairy Milk",
			"Chocolate",
			150,
			20,
			"1004"
		],
		[
			"Biscuit Pack",
			"Snacks",
			60,
			80,
			"1005"
		],
		[
			"Mineral Water",
			"Drinks",
			40,
			100,
			"1006"
		],
		[
			"Red Bull",
			"Drinks",
			350,
			15,
			"1007"
		],
		[
			"KitKat",
			"Chocolate",
			120,
			25,
			"1008"
		]
	].forEach((t) => e.run(...t));
}
console.log("DB ready:", u);
//#endregion
//#region electron/ipc.ts
function p() {
	n.handle("login", (e, t) => {
		let n = d.prepare("SELECT id, username, role FROM users WHERE username = ? AND password = ?").get(t.username, t.password);
		return n ? {
			success: !0,
			user: n
		} : {
			success: !1,
			message: "Invalid credentials"
		};
	}), n.handle("print-receipt", async (e, t) => {
		let { BrowserWindow: n } = await import("electron"), r = new n({
			show: !1,
			webPreferences: {
				nodeIntegration: !1,
				contextIsolation: !0
			}
		});
		return await r.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(t)), r.webContents.print({
			silent: !1,
			printBackground: !0,
			margins: { marginType: "none" }
		}, () => r.close()), { success: !0 };
	}), n.handle("register-user", (e, t) => {
		try {
			return {
				success: !0,
				id: d.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(t.username, t.password, t.role ?? "cashier").lastInsertRowid
			};
		} catch (e) {
			return {
				success: !1,
				message: e.message
			};
		}
	}), n.handle("get-products", () => d.prepare("SELECT * FROM products ORDER BY id DESC").all()), n.handle("add-product", (e, t) => {
		try {
			return {
				success: !0,
				id: d.prepare("INSERT INTO products (name, category, price, stock, barcode) VALUES (?, ?, ?, ?, ?)").run(t.name, t.category, t.price, t.stock, t.barcode ?? null).lastInsertRowid
			};
		} catch (e) {
			return {
				success: !1,
				message: e.message
			};
		}
	}), n.handle("update-product", (e, t) => {
		try {
			return d.prepare("UPDATE products SET name = ?, category = ?, price = ?, stock = ?, barcode = ? WHERE id = ?").run(t.name, t.category, t.price, t.stock, t.barcode ?? null, t.id), { success: !0 };
		} catch (e) {
			return {
				success: !1,
				message: e.message
			};
		}
	}), n.handle("delete-product", (e, t) => (d.prepare("DELETE FROM products WHERE id = ?").run(t), { success: !0 })), n.handle("create-sale", (e, t) => ({
		success: !0,
		id: d.transaction(() => {
			let e = d.prepare("INSERT INTO sales (total, discount, paid, items) VALUES (?, ?, ?, ?)").run(t.total, t.discount ?? 0, t.paid ?? t.total, JSON.stringify(t.items)), n = d.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
			for (let e of t.items) n.run(e.qty, e.id);
			return e.lastInsertRowid;
		})()
	})), n.handle("get-sales", () => d.prepare("SELECT * FROM sales ORDER BY id DESC LIMIT 100").all().map((e) => ({
		...e,
		items: JSON.parse(e.items)
	})));
}
//#endregion
//#region electron/updater.ts
var { autoUpdater: m } = s;
function h(e) {
	m.autoDownload = !0, m.autoInstallOnAppQuit = !0;
	let t = (t, n) => {
		e.isDestroyed() || e.webContents.send(t, n);
	};
	m.on("checking-for-update", () => {
		t("update-status", { state: "checking" });
	}), m.on("update-available", (e) => {
		t("update-status", {
			state: "available",
			info: e
		});
	}), m.on("update-not-available", () => {
		t("update-status", { state: "not-available" });
	}), m.on("download-progress", (e) => {
		t("update-status", {
			state: "downloading",
			percent: Math.round(e.percent)
		});
	}), m.on("update-downloaded", (e) => {
		t("update-status", {
			state: "downloaded",
			info: e
		});
	}), m.on("error", (e) => {
		t("update-status", {
			state: "error",
			message: e.message
		});
	}), n.handle("install-update", () => (m.quitAndInstall(), { success: !0 })), n.handle("check-for-updates", async () => {
		try {
			return {
				success: !0,
				version: (await m.checkForUpdates())?.updateInfo?.version
			};
		} catch (e) {
			return {
				success: !1,
				message: e.message
			};
		}
	}), setTimeout(() => {
		m.checkForUpdates().catch(() => {});
	}, 3e3);
}
//#endregion
//#region electron/main.ts
var g = i(import.meta.url), _ = r.dirname(g);
process.env.APP_ROOT = r.join(_, "..");
var v = process.env.VITE_DEV_SERVER_URL, y = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = v ? r.join(process.env.APP_ROOT, "public") : y;
var b = null;
function x() {
	b = new e({
		width: 1280,
		height: 800,
		icon: r.join(process.env.VITE_PUBLIC || y, "vite.svg"),
		webPreferences: {
			preload: r.join(_, "preload.mjs"),
			contextIsolation: !0,
			nodeIntegration: !1
		}
	}), v ? b.loadURL(v) : b.loadFile(r.join(y, "index.html")), v || h(b);
}
t.whenReady().then(() => {
	p(), x();
}), t.on("window-all-closed", () => {
	process.platform !== "darwin" && (t.quit(), b = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && x();
});
//#endregion
export { y as RENDERER_DIST, v as VITE_DEV_SERVER_URL };
