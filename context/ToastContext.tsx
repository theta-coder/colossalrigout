'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import Link from 'next/link';

export type ToastType = 'success' | 'error' | 'info' | 'cart';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface ToastContextType {
  showToast: (
    title: string,
    options?: { type?: ToastType; message?: string; actionUrl?: string; actionLabel?: string; duration?: number }
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      title: string,
      options?: { type?: ToastType; message?: string; actionUrl?: string; actionLabel?: string; duration?: number }
    ) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
      const type = options?.type || 'success';
      const duration = options?.duration || 3500;

      const newToast: ToastMessage = {
        id,
        type,
        title,
        message: options?.message,
        actionUrl: options?.actionUrl,
        actionLabel: options?.actionLabel,
      };

      setToasts((prev) => [...prev.slice(-2), newToast]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* FLOATING TOAST NOTIFICATION CONTAINER */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 bg-neutral-950/95 text-white p-3.5 rounded-xl shadow-2xl border border-neutral-800 backdrop-blur-md transition-all duration-300 animate-slide-up"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                {toast.type === 'cart' || toast.type === 'success' ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : toast.type === 'error' ? (
                  <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Info className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{toast.title}</p>
                {toast.message && (
                  <p className="text-[11px] text-neutral-400 mt-0.5 font-light leading-tight truncate">{toast.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {toast.actionUrl && (
                <Link
                  href={toast.actionUrl}
                  onClick={() => removeToast(toast.id)}
                  className="text-[11px] font-bold bg-white text-black px-2.5 py-1 rounded-md hover:bg-neutral-200 transition"
                >
                  {toast.actionLabel || 'View'}
                </Link>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                className="text-neutral-400 hover:text-white p-1 rounded-md transition"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
