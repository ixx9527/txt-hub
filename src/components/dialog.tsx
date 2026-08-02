import { useState, useCallback, createContext, useContext, ReactNode } from 'react';

interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'success' | 'error' | 'warning' | 'confirm';
}

interface DialogContextType {
  alert: (options: DialogOptions | string) => Promise<void>;
  confirm: (options: DialogOptions | string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<{
    open: boolean;
    options: DialogOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: { message: '' },
    resolve: null,
  });

  const showDialog = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ open: true, options, resolve });
    });
  }, []);

  const alert = useCallback(async (options: DialogOptions | string) => {
    const opts = typeof options === 'string' ? { message: options, type: 'info' as const } : options;
    await showDialog({ ...opts, cancelText: '' });
  }, [showDialog]);

  const confirm = useCallback(async (options: DialogOptions | string) => {
    const opts = typeof options === 'string' ? { message: options, type: 'confirm' as const } : options;
    return showDialog(opts);
  }, [showDialog]);

  const handleConfirm = () => {
    dialog.resolve?.(true);
    setDialog((prev) => ({ ...prev, open: false, resolve: null }));
  };

  const handleCancel = () => {
    dialog.resolve?.(false);
    setDialog((prev) => ({ ...prev, open: false, resolve: null }));
  };

  const typeStyles = {
    info: { icon: '💬', bg: 'bg-blue-50', border: 'border-blue-200', btnBg: 'bg-blue-600' },
    success: { icon: '✓', bg: 'bg-green-50', border: 'border-green-200', btnBg: 'bg-green-600' },
    error: { icon: '✕', bg: 'bg-red-50', border: 'border-red-200', btnBg: 'bg-red-600' },
    warning: { icon: '⚠', bg: 'bg-yellow-50', border: 'border-yellow-200', btnBg: 'bg-yellow-600' },
    confirm: { icon: '?', bg: 'bg-gray-50', border: 'border-gray-200', btnBg: 'bg-blue-600' },
  };

  const type = dialog.options.type || 'info';
  const style = typeStyles[type];

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} />
          <div className={`relative ${style.bg} border-2 ${style.border} rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full ${style.btnBg} text-white flex items-center justify-center text-lg font-bold shrink-0`}>
                {style.icon}
              </div>
              <div className="flex-1 min-w-0">
                {dialog.options.title && (
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{dialog.options.title}</h3>
                )}
                <p className="text-sm text-gray-600 leading-relaxed">{dialog.options.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              {dialog.options.cancelText !== '' && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {dialog.options.cancelText || '取消'}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium text-white ${style.btnBg} rounded-lg hover:opacity-90 transition-opacity`}
              >
                {dialog.options.confirmText || '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
