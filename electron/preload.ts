import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  login: (credentials: any) => ipcRenderer.invoke('login', credentials),
  registerUser: (user: any) => ipcRenderer.invoke('register-user', user),
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product: any) => ipcRenderer.invoke('add-product', product),
  updateProduct: (product: any) => ipcRenderer.invoke('update-product', product),
  deleteProduct: (id: number) => ipcRenderer.invoke('delete-product', id),
  createSale: (sale: any) => ipcRenderer.invoke('create-sale', sale),
  getSales: () => ipcRenderer.invoke('get-sales'),
  printReceipt: (html: string) => ipcRenderer.invoke('print-receipt', html),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (cb: (data: any) => void) => {
    ipcRenderer.on('update-status', (_e, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('update-status');
  },
});