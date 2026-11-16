import React, { useEffect } from 'react';
import { IconCheck, IconAlertTriangle, IconX } from './Icons';

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl text-zinc-100 max-w-md animate-slideUp">
      <div
        className={`p-2 rounded-xl flex items-center justify-center ${
          isSuccess
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
        }`}
      >
        {isSuccess ? <IconCheck className="w-4 h-4" /> : <IconAlertTriangle className="w-4 h-4" />}
      </div>

      <div className="flex-1 pr-2">
        <div className="text-xs font-semibold text-white">{toast.title}</div>
        <div className="text-[11px] text-zinc-400 mt-0.5">{toast.message}</div>
      </div>

      <button
        onClick={onDismiss}
        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
      >
        <IconX className="w-4 h-4" />
      </button>
    </div>
  );
}

