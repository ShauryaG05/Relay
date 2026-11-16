import React from 'react';
import {
  IconVolume2,
  IconVolumeX,
  IconSun,
  IconMonitor,
  IconShield,
  IconZap,
  IconClipboard,
  IconBell,
  IconSliders
} from './Icons';

export default function MediaAndSystemPanel({
  device,
  volume,
  isMuted,
  brightness,
  isScreenBlank,
  isDnd,
  onVolumeChange,
  onToggleMute,
  onBrightnessChange,
  onToggleScreenBlank,
  onToggleDnd,
  onSendWakeOnLan,
  onSyncClipboard
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Audio & Media Deck */}
      <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {isMuted ? <IconVolumeX className="w-4 h-4" /> : <IconVolume2 className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Audio & Output</h4>
              <p className="text-[11px] text-zinc-400">Remote master sound engine</p>
            </div>
          </div>
          <button
            onClick={onToggleMute}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition flex items-center gap-1.5 ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
            }`}
          >
            <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
            <kbd className="text-[10px] bg-zinc-900/80 px-1 py-0.5 rounded border border-zinc-700">M</kbd>
          </button>
        </div>

        <div className="space-y-2 mt-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Volume Level</span>
            <span className="font-mono text-zinc-200 font-semibold">{isMuted ? 'Muted' : `${volume}%`}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Out: CoreAudio HD Built-in</span>
          <span className="text-emerald-400">48kHz / 24-bit</span>
        </div>
      </div>

      {/* 2. Display & Visual Controls */}
      <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <IconSun className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Display & Brightness</h4>
              <p className="text-[11px] text-zinc-400">Remote monitor power state</p>
            </div>
          </div>
          <button
            onClick={onToggleScreenBlank}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition flex items-center gap-1.5 ${
              isScreenBlank
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
            }`}
          >
            <span>{isScreenBlank ? 'WAKE' : 'BLANK'}</span>
            <kbd className="text-[10px] bg-zinc-900/80 px-1 py-0.5 rounded border border-zinc-700">D</kbd>
          </button>
        </div>

        <div className="space-y-2 mt-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Backlight Level</span>
            <span className="font-mono text-zinc-200 font-semibold">{isScreenBlank ? 'Blanked (0%)' : `${brightness}%`}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            disabled={isScreenBlank}
            value={isScreenBlank ? 0 : brightness}
            onChange={(e) => onBrightnessChange(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40"
          />
        </div>

        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Status: {isScreenBlank ? 'Display Sleeping' : 'Active 120Hz'}</span>
          <span className="text-amber-400">HDR Enabled</span>
        </div>
      </div>

      {/* 3. Remote Utilities & Network Wake */}
      <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl flex flex-col justify-between md:col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <IconSliders className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Remote Utilities</h4>
              <p className="text-[11px] text-zinc-400">Network & system switches</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={onSendWakeOnLan}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <IconZap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-mono text-zinc-500">WOL</span>
            </div>
            <div className="mt-1 text-xs font-semibold text-zinc-200">Wake on LAN</div>
            <div className="text-[10px] text-zinc-500">Broadcast packet</div>
          </button>

          <button
            onClick={onSyncClipboard}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <IconClipboard className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-mono text-zinc-500">SYNC</span>
            </div>
            <div className="mt-1 text-xs font-semibold text-zinc-200">Clipboard Sync</div>
            <div className="text-[10px] text-zinc-500">Push to host</div>
          </button>

          <button
            onClick={onToggleDnd}
            className={`p-2.5 rounded-xl border text-left transition group col-span-2 flex items-center justify-between ${
              isDnd
                ? 'bg-purple-950/40 border-purple-800/60 text-purple-200'
                : 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700/60 text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <IconBell className="w-3.5 h-3.5 text-purple-400" />
              <div>
                <div className="text-xs font-semibold">Do Not Disturb (DND)</div>
                <div className="text-[10px] text-zinc-500">Suppress remote banner notifications</div>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              isDnd ? 'bg-purple-500/30 text-purple-300' : 'bg-zinc-700 text-zinc-400'
            }`}>
              {isDnd ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Tunnel: WireGuard / TLS 1.3</span>
          <span className="text-emerald-400">Encrypted</span>
        </div>
      </div>
    </div>
  );
}

