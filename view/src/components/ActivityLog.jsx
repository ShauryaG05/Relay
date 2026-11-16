import React from 'react';
import { IconActivity, IconCheck, IconRefreshCw, IconX } from './Icons';

export default function ActivityLog({ logs, onClear }) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <IconActivity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Live Relay Audit Log</h3>
            <p className="text-[11px] text-zinc-400">Real-time socket heartbeat & remote command dispatch stream</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            STREAMING
          </span>
          {logs.length > 0 && (
            <button
              onClick={onClear}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 font-mono transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-500 font-mono">
            No remote actions dispatched yet. Press any hotkey or action tile above.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/60 text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                  ✓
                </span>
                <div>
                  <div className="text-zinc-200 font-medium">
                    <span className="uppercase text-cyan-400 font-bold mr-1.5">{log.action}</span>
                    <span className="text-zinc-400">→ {log.target}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">{log.message}</div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-emerald-400 font-medium">
                  {log.latency}ms ack
                </span>
                <div className="text-[10px] text-zinc-500">{log.time}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

