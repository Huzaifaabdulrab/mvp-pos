import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

export default function UpdateBanner() {
  const [status, setStatus] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onUpdateStatus((data) => {
      setStatus(data);
      setDismissed(false);
    });
    return unsubscribe;
  }, []);

  if (!status || dismissed) return null;
  if (status.state === 'not-available' || status.state === 'checking') return null;

  // Downloading
  if (status.state === 'downloading') {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 text-sm">
        <RefreshCw size={16} className="animate-spin" />
        Downloading update... {status.percent}%
      </div>
    );
  }

  // Downloaded — ask to install
  if (status.state === 'downloaded') {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 text-sm">
        <Download size={16} />
        Update ready (v{status.info?.version})
        <button
          onClick={() => window.electronAPI.installUpdate()}
          className="px-3 py-1 bg-white text-green-700 rounded font-semibold hover:bg-green-50"
        >
          Restart & Install
        </button>
        <button onClick={() => setDismissed(true)}>
          <X size={14} />
        </button>
      </div>
    );
  }

  // Error
  if (status.state === 'error') {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 text-sm">
        Update check failed: {status.message}
        <button onClick={() => setDismissed(true)}>
          <X size={14} />
        </button>
      </div>
    );
  }

  return null;
}