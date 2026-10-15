// electron/updater.ts
import electronUpdater from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const { autoUpdater } = electronUpdater;

export function setupAutoUpdater(win: BrowserWindow) {
  // Only run in packaged app (not in dev, not in --dir build)
  if (!app.isPackaged) {
    return;
  }

  // Check if app-update.yml exists (only present in real installer build)
  const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
  if (!fs.existsSync(updateConfigPath)) {
    console.log('Skipping auto-updater: app-update.yml not found');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (channel: string, data?: any) => {
    if (!win.isDestroyed()) win.webContents.send(channel, data);
  };

  autoUpdater.on('checking-for-update', () => {
    send('update-status', { state: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    send('update-status', { state: 'available', info });
  });

  autoUpdater.on('update-not-available', () => {
    send('update-status', { state: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    send('update-status', {
      state: 'downloading',
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    send('update-status', { state: 'downloaded', info });
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err.message);
    // Don't show error to user — just log
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
    return { success: true };
  });

  ipcMain.handle('check-for-updates', async () => {
    try {
      const res = await autoUpdater.checkForUpdates();
      return { success: true, version: res?.updateInfo?.version };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  });

  // Initial check after 3 seconds
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // silently ignore
    });
  }, 3000);
}

