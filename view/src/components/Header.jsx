import React from 'react';
import { Link } from 'react-router-dom';
import {
  IconCpu,
  IconHardDrive,
  IconWifi,
  IconTerminal,
  IconCamera,
  IconHelpCircle,
  IconKeyboard,
  IconZap,
  IconActivity
} from './Icons';

export default function Header({
  devices,
  selectedDevice,
  onSelectDevice,
  onOpenTerminal,
  onOpenScreenshot,
  onOpenHotkeyHelp
}) {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Brand & Target Device Selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <Link to="/" className="flex items-center gap-2.5 group hover:opacity-95 transition-opacity" title="Go to Relay Home">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-950/40 flex items-center justify-center transition-transform group-hover:scale-105">
                <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                  <IconZap className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-white font-mono">
                    RELAY<span className="text-cyan-400">.</span>CONTROL
                  </h1>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                    v2.4
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">Remote Device Automation & Telemetry</p>
              </div>
            </Link>

            <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

            {/* Device Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono hidden sm:inline">TARGET:</span>
              <div className="relative">
                <select
                  value={selectedDevice?.id}
                  onChange={(e) => {
                    const dev = devices.find((d) => d.id === e.target.value);
                    if (dev) onSelectDevice(dev);
                  }}
                  className="bg-zinc-900 border border-zinc-700/80 hover:border-zinc-600 rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 pr-8 appearance-none cursor-pointer"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.os.split(' ')[0]})
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">
                  ▼
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">Online</span>
                <span className="text-zinc-500 text-[10px]">({selectedDevice?.ping || 12}ms)</span>
              </div>
            </div>
          </div>

          {/* Right: Telemetry chips & Quick Action Bar */}
          <div className="flex items-center gap-3 flex-wrap justify-between lg:justify-end">
            {/* Live Metrics Chips */}
            <div className="flex items-center gap-2 bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-800/80 text-xs font-mono">
              {/* CPU Load */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-950/60 text-zinc-300">
                <IconCpu className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-zinc-400">CPU</span>
                <span className="font-semibold text-cyan-300">{selectedDevice?.cpu?.load || 24}%</span>
              </div>

              {/* Memory */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-950/60 text-zinc-300">
                <IconActivity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-zinc-400">RAM</span>
                <span className="font-semibold text-emerald-300">
                  {selectedDevice?.memory?.used || 18.2}GB
                </span>
              </div>

              {/* Temperature */}
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-950/60 text-zinc-300">
                <span className="text-amber-400 text-xs">🌡</span>
                <span className="font-semibold text-amber-300">{selectedDevice?.cpu?.temp || 42}°C</span>
              </div>
            </div>

            {/* Quick action utility buttons */}
            <div className="flex items-center gap-2">
              {/* Back to Home Page */}
              <Link
                to="/"
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition hover:border-zinc-600 focus:outline-none"
                title="Return to Home Page"
              >
                <span>Home</span>
              </Link>

              {/* Remote Terminal Trigger */}
              <button
                onClick={onOpenTerminal}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition hover:border-zinc-600 focus:outline-none"
                title="Remote Shell (T)"
              >
                <IconTerminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Terminal</span>
                <kbd className="text-[10px] font-mono bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800 text-zinc-400">
                  T
                </kbd>
              </button>

              {/* Screen capture trigger */}
              <button
                onClick={onOpenScreenshot}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition hover:border-zinc-600 focus:outline-none"
                title="Remote Screen Capture (P)"
              >
                <IconCamera className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Capture</span>
                <kbd className="text-[10px] font-mono bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800 text-zinc-400">
                  P
                </kbd>
              </button>

              {/* Hotkey help trigger */}
              <button
                onClick={onOpenHotkeyHelp}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-cyan-400 transition"
                title="Hotkey Cheatsheet (?)"
              >
                <IconHelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

