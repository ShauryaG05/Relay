import React, { useEffect, useState } from 'react';
import { IconAlertTriangle, IconRotateCcw, IconPower, IconLogOut, IconX } from './Icons';

export default function ActionConfirmModal({ isOpen, action, device, onConfirm, onCancel }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      return;
    }

    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearInterval(interval);
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen || !action) return null;

  const isShutdown = action.id === 'shutdown';
  const isRestart = action.id === 'restart';

  const title = isShutdown
    ? 'Shut Down Remote System'
    : isRestart
    ? 'Restart Remote System'
    : `Confirm ${action.title}`;

  const desc = isShutdown
    ? `This will completely power off "${device.name}". You will lose remote access until someone physically powers the machine back on or triggers Wake-on-LAN.`
    : isRestart
    ? `This will gracefully reboot "${device.name}". Active terminal and background tasks will be terminated. Reconnection usually takes ~45 seconds.`
    : `Are you sure you want to trigger ${action.title} on ${device.name}?`;

  const accentColor = isShutdown ? 'rose' : isRestart ? 'amber' : 'sky';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-6 overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl shadow-rose-950/20 text-zinc-100">
        {/* Glow accent */}
        <div
          className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isShutdown ? 'bg-rose-500' : isRestart ? 'bg-amber-500' : 'bg-cyan-500'
          }`}
        />

        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          title="Cancel (Esc)"
        >
          <IconX className="w-5 h-5" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl border ${
              isShutdown
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : isRestart
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-zinc-800 border-zinc-700 text-cyan-400'
            }`}
          >
            {isShutdown ? (
              <IconPower className="w-6 h-6 animate-pulse" />
            ) : isRestart ? (
              <IconRotateCcw className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
            ) : (
              <IconAlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 pr-6">
            <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{desc}</p>
          </div>
        </div>

        {/* Target Details Badge */}
        <div className="mt-4 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-zinc-500">Target Device:</span>
            <span className="ml-1.5 font-medium text-zinc-200">{device.name}</span>
          </div>
          <span className="font-mono text-zinc-400">{device.ip}</span>
        </div>

        {/* Countdown Bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
            <span>Auto-executing in</span>
            <span className="font-mono font-semibold text-zinc-200">{countdown}s</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                isShutdown ? 'bg-rose-500' : isRestart ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 text-sm font-medium transition hover:border-zinc-600 focus:outline-none"
          >
            Cancel <kbd className="ml-1 text-[10px] text-zinc-400 px-1 py-0.5 bg-zinc-900 rounded border border-zinc-700">ESC</kbd>
          </button>

          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition flex items-center justify-center gap-2 focus:outline-none ${
              isShutdown
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                : isRestart
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40'
            }`}
          >
            Confirm Now
          </button>
        </div>
      </div>
    </div>
  );
}

