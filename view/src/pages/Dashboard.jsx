import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import HotkeyCard from '../components/HotkeyCard';
import ActionConfirmModal from '../components/ActionConfirmModal';
import TerminalDrawer from '../components/TerminalDrawer';
import ScreenshotModal from '../components/ScreenshotModal';
import HotkeyHelpModal from '../components/HotkeyHelpModal';
import MediaAndSystemPanel from '../components/MediaAndSystemPanel';
import ActivityLog from '../components/ActivityLog';
import Toast from '../components/Toast';
import {
  IconLock,
  IconRotateCcw,
  IconPower,
  IconMoon,
  IconLogOut,
  IconShieldAlert,
  IconCpu,
  IconHardDrive,
  IconWifi,
  IconZap,
  IconMonitor,
  IconActivity,
  IconKeyboard
} from '../components/Icons';
import { mockDevices, sendRemoteAction } from '../services/api';

export default function Dashboard() {
  const [devices, setDevices] = useState(mockDevices);
  const [selectedDevice, setSelectedDevice] = useState(mockDevices[0]);
  const [activeModal, setActiveModal] = useState(null); // { id: 'restart'|'shutdown', title: string }
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);
  const [isHotkeyHelpOpen, setIsHotkeyHelpOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [logs, setLogs] = useState([
    {
      id: 1,
      action: 'HEARTBEAT',
      target: mockDevices[0].name,
      message: 'Agent socket channel established (TLS 1.3)',
      time: new Date(Date.now() - 1000 * 60 * 3).toLocaleTimeString(),
      latency: 11
    },
    {
      id: 2,
      action: 'SYSTEM_SYNC',
      target: mockDevices[0].name,
      message: 'Hardware metrics & thermal sensors synced',
      time: new Date(Date.now() - 1000 * 60 * 1).toLocaleTimeString(),
      latency: 14
    }
  ]);

  // Audio & Display states for current device
  const [volume, setVolume] = useState(selectedDevice?.audio?.volume ?? 65);
  const [isMuted, setIsMuted] = useState(selectedDevice?.audio?.muted ?? false);
  const [brightness, setBrightness] = useState(selectedDevice?.screen?.brightness ?? 80);
  const [isScreenBlank, setIsScreenBlank] = useState(selectedDevice?.screen?.blank ?? false);
  const [isDnd, setIsDnd] = useState(false);

  // Synchronize when selected device changes
  useEffect(() => {
    if (selectedDevice) {
      setVolume(selectedDevice.audio?.volume ?? 65);
      setIsMuted(selectedDevice.audio?.muted ?? false);
      setBrightness(selectedDevice.screen?.brightness ?? 80);
      setIsScreenBlank(selectedDevice.screen?.blank ?? false);
    }
  }, [selectedDevice]);

  // Execute remote action
  const handleAction = useCallback(
    async (actionId, options = {}) => {
      setLoadingAction(actionId);
      const res = await sendRemoteAction(actionId, selectedDevice.id, options);
      setLoadingAction(null);

      const actionNames = {
        lock: 'Device Locked',
        restart: 'System Reboot Triggered',
        shutdown: 'Shutdown Sequence Initiated',
        sleep: 'System Put to Sleep',
        logout: 'User Session Terminated',
        killswitch: 'Emergency Killswitch Engaged',
        mute: isMuted ? 'Audio Unmuted' : 'Audio Muted',
        screen_blank: isScreenBlank ? 'Display Restored' : 'Display Blanked',
        wol: 'Magic Packet Dispatched',
        clipboard: 'Clipboard Synchronized',
        dnd: !isDnd ? 'Do Not Disturb Enabled' : 'Do Not Disturb Disabled'
      };

      const title = actionNames[actionId] || `Action: ${actionId.toUpperCase()}`;

      // Toast notification
      setToast({
        id: Date.now(),
        type: 'success',
        title,
        message: `${res.message} (Ack: ${res.latency}ms)`
      });

      // Append to audit log
      setLogs((prev) => [
        {
          id: Date.now(),
          action: actionId.toUpperCase(),
          target: selectedDevice.name,
          message: res.message,
          time: new Date().toLocaleTimeString(),
          latency: res.latency
        },
        ...prev
      ]);

      // If destructive modal is active, close it
      setActiveModal(null);
    },
    [selectedDevice, isMuted, isScreenBlank, isDnd]
  );

  // Destructive triggers with safety modal
  const triggerRestart = useCallback(() => {
    setActiveModal({ id: 'restart', title: 'System Restart' });
  }, []);

  const triggerShutdown = useCallback(() => {
    setActiveModal({ id: 'shutdown', title: 'System Shutdown' });
  }, []);

  // Audio toggles
  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    handleAction('mute', { muted: nextMuted });
  }, [isMuted, handleAction]);

  const handleVolumeChange = useCallback(
    (newVal) => {
      setVolume(newVal);
      if (isMuted && newVal > 0) setIsMuted(false);
      handleAction('volume', { volume: newVal });
    },
    [isMuted, handleAction]
  );

  // Display toggles
  const handleToggleScreenBlank = useCallback(() => {
    const nextBlank = !isScreenBlank;
    setIsScreenBlank(nextBlank);
    handleAction('screen_blank', { blank: nextBlank });
  }, [isScreenBlank, handleAction]);

  const handleBrightnessChange = useCallback(
    (newVal) => {
      setBrightness(newVal);
      handleAction('brightness', { brightness: newVal });
    },
    [handleAction]
  );

  const handleToggleDnd = useCallback(() => {
    const nextDnd = !isDnd;
    setIsDnd(nextDnd);
    handleAction('dnd', { dnd: nextDnd });
  }, [isDnd, handleAction]);

  const handleWakeOnLan = useCallback(() => {
    handleAction('wol', { mac: '3C:22:FB:91:A4:E2' });
  }, [handleAction]);

  const handleSyncClipboard = useCallback(() => {
    handleAction('clipboard', { mode: 'push' });
  }, [handleAction]);

  // Global Keyboard Hotkey Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when user is typing in form inputs, textareas or terminal
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      // Check key
      const key = e.key;

      if (key === 'l' || key === 'L') {
        e.preventDefault();
        handleAction('lock');
      } else if (key === 'r' || key === 'R') {
        e.preventDefault();
        triggerRestart();
      } else if (key === 's' || key === 'S') {
        e.preventDefault();
        triggerShutdown();
      } else if (key === 'z' || key === 'Z') {
        e.preventDefault();
        handleAction('sleep');
      } else if (key === 'o' || key === 'O') {
        e.preventDefault();
        handleAction('logout');
      } else if (key === 'm' || key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if (key === 'd' || key === 'D') {
        e.preventDefault();
        handleToggleScreenBlank();
      } else if (key === 't' || key === 'T') {
        e.preventDefault();
        setIsTerminalOpen((prev) => !prev);
      } else if (key === 'p' || key === 'P') {
        e.preventDefault();
        setIsScreenshotOpen(true);
      } else if (key === '?') {
        e.preventDefault();
        setIsHotkeyHelpOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleAction,
    triggerRestart,
    triggerShutdown,
    handleToggleMute,
    handleToggleScreenBlank
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header & Telemetry Bar */}
      <Header
        devices={devices}
        selectedDevice={selectedDevice}
        onSelectDevice={setSelectedDevice}
        onOpenTerminal={() => setIsTerminalOpen(true)}
        onOpenScreenshot={() => setIsScreenshotOpen(true)}
        onOpenHotkeyHelp={() => setIsHotkeyHelpOpen(true)}
      />

      {/* Main Control Center Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Info & Hotkey Hint */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 backdrop-blur-xl">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Active Control Session: {selectedDevice.name}
                </h2>
              </div>
              <p className="mt-1 text-xs text-zinc-400 max-w-2xl">
                Direct remote interface connected to Relay Agent daemon. Press any mapped hotkey on your keyboard or click the quick action tiles below to control this machine in real-time.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsHotkeyHelpOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center gap-2 transition"
              >
                <IconKeyboard className="w-4 h-4" />
                <span>Hotkey Reference</span>
                <kbd className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 font-mono text-[10px]">
                  ?
                </kbd>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 1: PRIMARY HOTKEY ACTION DECK */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-cyan-500 rounded-sm" />
                Primary Hotkey Quick Actions
              </h3>
              <p className="text-xs text-zinc-400">
                Core power, session security, and state controls
              </p>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              Single-key triggers enabled
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. LOCK DEVICE */}
            <HotkeyCard
              title="Lock Device"
              subtitle="Secure lock screen immediately. Password required to resume."
              hotkey="L"
              icon={IconLock}
              color="emerald"
              isLoading={loadingAction === 'lock'}
              onClick={() => handleAction('lock')}
            />

            {/* 2. RESTART DEVICE */}
            <HotkeyCard
              title="Restart Device"
              subtitle="Gracefully restart the operating system with 5s cancel buffer."
              hotkey="R"
              icon={IconRotateCcw}
              color="cyan"
              isLoading={loadingAction === 'restart'}
              onClick={triggerRestart}
            />

            {/* 3. SHUTDOWN DEVICE */}
            <HotkeyCard
              title="Shut Down Device"
              subtitle="Safely power off machine completely. Power switch or WoL needed."
              hotkey="S"
              icon={IconPower}
              color="rose"
              danger={true}
              isLoading={loadingAction === 'shutdown'}
              onClick={triggerShutdown}
            />

            {/* 4. SLEEP / SUSPEND */}
            <HotkeyCard
              title="Sleep / Suspend"
              subtitle="Low-power standby state preserving memory and background processes."
              hotkey="Z"
              icon={IconMoon}
              color="purple"
              isLoading={loadingAction === 'sleep'}
              onClick={() => handleAction('sleep')}
            />

            {/* 5. LOG OUT USER */}
            <HotkeyCard
              title="Log Out Session"
              subtitle="Terminate active user session and return to OS login window."
              hotkey="O"
              icon={IconLogOut}
              color="amber"
              isLoading={loadingAction === 'logout'}
              onClick={() => handleAction('logout')}
            />

            {/* 6. EMERGENCY KILLSWITCH */}
            <HotkeyCard
              title="Emergency Killswitch"
              subtitle="Instantly sever all remote tunnels, lock session and blank display."
              hotkey="K"
              icon={IconShieldAlert}
              color="rose"
              danger={true}
              isLoading={loadingAction === 'killswitch'}
              onClick={() => handleAction('killswitch')}
            />
          </div>
        </div>

        {/* SECTION 2: AUDIO, DISPLAY & SYSTEM UTILITIES */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-amber-500 rounded-sm" />
                Remote System & Output Controls
              </h3>
              <p className="text-xs text-zinc-400">
                Manage audio levels, display power, privacy shield, and remote sync
              </p>
            </div>
          </div>

          <MediaAndSystemPanel
            device={selectedDevice}
            volume={volume}
            isMuted={isMuted}
            brightness={brightness}
            isScreenBlank={isScreenBlank}
            isDnd={isDnd}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onBrightnessChange={handleBrightnessChange}
            onToggleScreenBlank={handleToggleScreenBlank}
            onToggleDnd={handleToggleDnd}
            onSendWakeOnLan={handleWakeOnLan}
            onSyncClipboard={handleSyncClipboard}
          />
        </div>

        {/* SECTION 3: SYSTEM SPECS & HARDWARE HEALTH */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hardware Telemetry Card */}
          <div className="lg:col-span-1 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <IconCpu className="w-4 h-4 text-cyan-400" />
                  Hardware Specifications
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {selectedDevice.type.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Host OS</span>
                  <span className="font-medium text-zinc-200">{selectedDevice.os}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Processor</span>
                  <span className="font-medium text-zinc-200">{selectedDevice.arch}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-400">IP Address</span>
                  <span className="font-mono text-cyan-400">{selectedDevice.ip}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-400">System Uptime</span>
                  <span className="font-mono text-zinc-200">{selectedDevice.uptime}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-400">Storage Used</span>
                  <span className="font-mono text-emerald-400">
                    {selectedDevice.disk.used} / {selectedDevice.disk.total} {selectedDevice.disk.unit}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <button
                onClick={() => setIsTerminalOpen(true)}
                className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center justify-center gap-2"
              >
                <IconMonitor className="w-3.5 h-3.5" />
                Launch Terminal Console
              </button>
            </div>
          </div>

          {/* Activity Audit Stream Card */}
          <div className="lg:col-span-2">
            <ActivityLog logs={logs} onClear={() => setLogs([])} />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950/80 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Relay Secure Remote Node Orchestrator</span>
            <span>•</span>
            <span className="text-zinc-400">Encrypted via TLS 1.3</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsHotkeyHelpOpen(true)}
              className="hover:text-zinc-200 transition"
            >
              Hotkeys (?)
            </button>
            <button
              onClick={() => setIsTerminalOpen(true)}
              className="hover:text-zinc-200 transition"
            >
              Shell (T)
            </button>
            <button
              onClick={() => setIsScreenshotOpen(true)}
              className="hover:text-zinc-200 transition"
            >
              Screen (P)
            </button>
          </div>
        </div>
      </footer>

      {/* OVERLAY MODALS */}
      {/* 1. Destructive Action Confirmation Modal */}
      <ActionConfirmModal
        isOpen={!!activeModal}
        action={activeModal}
        device={selectedDevice}
        onConfirm={() => activeModal && handleAction(activeModal.id)}
        onCancel={() => setActiveModal(null)}
      />

      {/* 2. Interactive Terminal Drawer */}
      <TerminalDrawer
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        device={selectedDevice}
      />

      {/* 3. Screen Capture / Preview Modal */}
      <ScreenshotModal
        isOpen={isScreenshotOpen}
        onClose={() => setIsScreenshotOpen(false)}
        device={selectedDevice}
        onRefresh={() => handleAction('screenshot')}
      />

      {/* 4. Hotkey Cheat Sheet Modal */}
      <HotkeyHelpModal
        isOpen={isHotkeyHelpOpen}
        onClose={() => setIsHotkeyHelpOpen(false)}
      />

      {/* 5. Toast Feedback */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
