import React, { useState } from 'react';
import { IconCamera, IconX, IconRefreshCw, IconDownload, IconMonitor, IconSparkles } from './Icons';

export default function ScreenshotModal({ isOpen, onClose, device, onRefresh }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString());

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) await onRefresh();
    setTimeout(() => {
      setTimestamp(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <IconCamera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Remote Screen Capture</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Captured from {device?.name} ({device?.ip}) • {timestamp}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-200 flex items-center gap-2 transition"
            >
              <IconRefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Display Area */}
        <div className="relative flex-1 p-6 bg-zinc-950 flex items-center justify-center overflow-auto min-h-[380px]">
          {/* Mock Desktop Screen with Realistic Modern UI */}
          <div className="w-full max-w-3xl aspect-video rounded-xl border border-zinc-700 bg-gradient-to-br from-indigo-950 via-slate-900 to-zinc-900 p-4 shadow-2xl relative flex flex-col justify-between overflow-hidden">
            {/* Top OS menu bar simulation */}
            <div className="flex items-center justify-between text-[11px] text-zinc-300 border-b border-white/10 pb-2">
              <div className="flex items-center gap-3 font-medium">
                <span className="font-bold text-white"></span>
                <span>Code</span>
                <span>File</span>
                <span>Edit</span>
                <span>Terminal</span>
                <span>Help</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400 font-mono text-[10px]">
                <span>Wi-Fi: Connected</span>
                <span>94% [⚡]</span>
                <span>{timestamp}</span>
              </div>
            </div>

            {/* Desktop windows mockup */}
            <div className="flex-1 grid grid-cols-12 gap-3 py-3 items-center">
              <div className="col-span-8 h-full bg-zinc-900/90 rounded-lg border border-zinc-700/60 p-3 shadow-lg flex flex-col font-mono text-[11px]">
                <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-zinc-800 text-zinc-400 text-[10px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-zinc-300">server.js — Relay Project</span>
                </div>
                <div className="text-zinc-400 space-y-1">
                  <div><span className="text-purple-400">const</span> app = <span className="text-amber-300">require</span>(<span className="text-emerald-400">'./app'</span>);</div>
                  <div><span className="text-cyan-400">app</span>.<span className="text-amber-300">listen</span>(port, () =&gt; &#123;</div>
                  <div className="pl-4 text-zinc-300">console.log(<span className="text-emerald-400">`Agent connected to Relay Cloud`</span>);</div>
                  <div>&#125;);</div>
                </div>
              </div>

              <div className="col-span-4 h-full bg-zinc-900/70 rounded-lg border border-zinc-700/60 p-3 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-zinc-200">System Activity</div>
                  <div className="mt-2 space-y-1.5 text-[10px] text-zinc-400">
                    <div className="flex justify-between"><span>CPU Core #0</span><span className="text-cyan-400">22%</span></div>
                    <div className="flex justify-between"><span>Memory</span><span className="text-emerald-400">18.2 GB</span></div>
                    <div className="flex justify-between"><span>Active SSH</span><span className="text-amber-400">1 Client</span></div>
                  </div>
                </div>
                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-800/40 text-[9px] text-cyan-300">
                  Device status nominal
                </div>
              </div>
            </div>

            {/* Dock Simulation */}
            <div className="self-center flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-900/80 backdrop-blur border border-white/10 shadow-xl">
              <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px]">🌐</span>
              <span className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px]">💻</span>
              <span className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-[10px]">📁</span>
              <span className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center text-[10px]">🎵</span>
            </div>

            {/* Watermark */}
            <div className="absolute bottom-2 right-2 text-[9px] text-zinc-500 font-mono">
              RELAY-REMOTE-CAPTURE // 2560x1440
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-5 py-3 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Resolution: <strong>2560 × 1440 (Retina)</strong></span>
            <span>•</span>
            <span>Color Profile: <strong>sRGB Display P3</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Screenshot copied to clipboard!")}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
            >
              Copy Image
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

