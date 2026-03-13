"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'error' | 'success' | 'warning';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 4s
    const exitTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    return () => { clearTimeout(enterTimer); clearTimeout(exitTimer); };
  }, [toast.id, onDismiss]);

  const colorMap = {
    error: 'border-neon-red/50 bg-red-950/90 text-red-200',
    success: 'border-neon-green/50 bg-green-950/90 text-green-200',
    warning: 'border-amber-500/50 bg-amber-950/90 text-amber-200',
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border 
        shadow-[0_0_30px_rgba(255,7,58,0.2)] backdrop-blur-md max-w-sm
        transition-all duration-300 ease-out
        ${colorMap[toast.type]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <AlertTriangle size={16} className="shrink-0" />
      <span className="text-sm font-mono tracking-wide flex-1">{toast.message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        className="opacity-60 hover:opacity-100 transition-opacity shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
