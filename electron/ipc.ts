// electron/ipc.ts
import { ipcMain } from 'electron';
import { db } from './database';

export function registerIpcHandlers() {
    // ===== AUTH =====
    ipcMain.handle('login', (_e, creds: { username: string; password: string }) => {
        const user = db
            .prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?')
            .get(creds.username, creds.password);
        if (!user) return { success: false, message: 'Invalid credentials' };
        return { success: true, user };
    });
    
    // ===== PRINT RECEIPT =====
    // Simple print: send receipt HTML to a hidden window and trigger print
    ipcMain.handle('print-receipt', async (_e, html: string) => {
        const { BrowserWindow } = await import('electron');
        const printWin = new BrowserWindow({
            show: false,
            webPreferences: { nodeIntegration: false, contextIsolation: true },
        });
        await printWin.loadURL(
            'data:text/html;charset=utf-8,' + encodeURIComponent(html)
        );
        printWin.webContents.print(
            { silent: false, printBackground: true, margins: { marginType: 'none' } },
            () => printWin.close()
        );
        return { success: true };
    });

    ipcMain.handle('register-user', (_e, user: { username: string; password: string; role?: string }) => {
        try {
            const info = db
                .prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
                .run(user.username, user.password, user.role ?? 'cashier');
            return { success: true, id: info.lastInsertRowid };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    });

    // ===== PRODUCTS =====
    ipcMain.handle('get-products', () => {
        return db.prepare('SELECT * FROM products ORDER BY id DESC').all();
    });

    ipcMain.handle('add-product', (_e, p: any) => {
        try {
            const info = db
                .prepare('INSERT INTO products (name, category, price, stock, barcode) VALUES (?, ?, ?, ?, ?)')
                .run(p.name, p.category, p.price, p.stock, p.barcode ?? null);
            return { success: true, id: info.lastInsertRowid };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    });

    ipcMain.handle('update-product', (_e, p: any) => {
        try {
            db.prepare(
                'UPDATE products SET name = ?, category = ?, price = ?, stock = ?, barcode = ? WHERE id = ?'
            ).run(p.name, p.category, p.price, p.stock, p.barcode ?? null, p.id);
            return { success: true };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    });

    ipcMain.handle('delete-product', (_e, id: number) => {
        db.prepare('DELETE FROM products WHERE id = ?').run(id);
        return { success: true };
    });

    // ===== SALES =====
    ipcMain.handle('create-sale', (_e, sale: any) => {
        const tx = db.transaction(() => {
            const info = db
                .prepare('INSERT INTO sales (total, discount, paid, items) VALUES (?, ?, ?, ?)')
                .run(sale.total, sale.discount ?? 0, sale.paid ?? sale.total, JSON.stringify(sale.items));

            // Update stock for each product sold
            const upd = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
            for (const item of sale.items) {
                upd.run(item.qty, item.id);
            }
            return info.lastInsertRowid;
        });
        const id = tx();
        return { success: true, id };
    });

    ipcMain.handle('get-sales', () => {
        const rows = db.prepare('SELECT * FROM sales ORDER BY id DESC LIMIT 100').all() as any[];
        return rows.map((r) => ({ ...r, items: JSON.parse(r.items) }));
    });
}