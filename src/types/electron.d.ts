export { };

declare global {
    interface Window {
        electronAPI: {
            login: (creds: { username: string; password: string }) => Promise<any>;
            registerUser: (user: any) => Promise<any>;
            getProducts: () => Promise<any[]>;
            addProduct: (p: any) => Promise<any>;
            updateProduct: (p: any) => Promise<any>;
            deleteProduct: (id: number) => Promise<any>;
            createSale: (sale: any) => Promise<any>;
            getSales: () => Promise<any[]>;
            printReceipt: (html: string) => Promise<{ success: boolean }>;
            checkForUpdates: () => Promise<{ success: boolean; version?: string; message?: string }>;
            installUpdate: () => Promise<{ success: boolean }>;
            onUpdateStatus: (cb: (data: any) => void) => () => void;
        };
    }
}