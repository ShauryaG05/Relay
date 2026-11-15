"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  Laptop,
  Lock,
  Moon,
  RotateCcw,
  Power,
  Folder,
  Sliders,
  History,
  Volume2,
  VolumeX,
  Bell,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Activity,
} from "lucide-react";
import { api, Device, AuditEntry } from "@/lib/api";
import { StatsCard } from "@/components/StatsCard";
import { FileBrowser } from "@/components/FileBrowser";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import {
  SystemStatsPayload,
  createEnvelope,
  MessageType,
  EnvelopeSchema,
} from "@relay/protocol";

export default function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const deviceId = resolvedParams.id;
  const router = useRouter();

  const [device, setDevice] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "files" | "controls" | "audit">("overview");
  const [stats, setStats] = useState<SystemStatsPayload | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Destructive Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: string;
    actionTitle: string;
    description: string;
    params?: Record<string, unknown>;
  }>({
    isOpen: false,
    action: "",
    actionTitle: "",
    description: "",
  });

  // Controls state
  const [volume, setVolume] = useState<number>(50);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [processes, setProcesses] = useState<Array<{ pid: number; cpuPercent: number; memPercent: number; command: string }>>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(false);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Load device info
  const loadDevice = () => {
    api
      .getDevice(deviceId)
      .then((res) => setDevice(res.device))
      .catch((err) => {
        console.error(err);
        setActionMessage({ type: "error", text: "Device not found or access denied" });
      });
  };

  useEffect(() => {
    loadDevice();
  }, [deviceId]);

  // WebSocket for Live Telemetry
  useEffect(() => {
    let isSubscribed = true;

    async function initWs() {
      try {
        const ticket = await api.getWsTicket();
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host; // proxied or direct
        const wsUrl = `${protocol}//127.0.0.1:4000/ws/web?ticket=${encodeURIComponent(ticket)}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) return;
          console.log("[WebWS] Connected to live gateway stream");

          // Subscribe to live stats
          const env = createEnvelope(MessageType.WEB_STATS_SUBSCRIBE, deviceId, {});
          ws.send(JSON.stringify(env));
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            const env = EnvelopeSchema.parse(raw);

            if (env.type === MessageType.DEVICE_STATS && env.deviceId === deviceId) {
              setStats(env.payload as SystemStatsPayload);
            } else if (env.type === MessageType.DEVICE_STATUS && env.deviceId === deviceId) {
              const statusPayload = env.payload as any;
              setDevice((prev) => (prev ? { ...prev, isOnline: statusPayload.status === "online" } : null));
            }
          } catch (e) {
            // ignore
          }
        };

        ws.onclose = () => {
          console.log("[WebWS] Live stream disconnected");
        };
      } catch (err) {
        console.warn("[WebWS] Could not establish WebSocket for live stats, falling back");
      }
    }

    initWs();

    return () => {
      isSubscribed = false;
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          const env = createEnvelope(MessageType.WEB_STATS_UNSUBSCRIBE, deviceId, {});
          wsRef.current.send(JSON.stringify(env));
        }
        wsRef.current.close();
      }
    };
  }, [deviceId]);

  // Load audit logs when tab selected
  useEffect(() => {
    if (activeTab === "audit") {
      setLoadingAudit(true);
      api
        .getAuditLogs({ deviceId, limit: 30 })
        .then((res) => {
          setAuditLogs(res.entries);
          setLoadingAudit(false);
        })
        .catch(() => setLoadingAudit(false));
    } else if (activeTab === "controls") {
      loadProcesses();
    }
  }, [activeTab, deviceId]);

  const loadProcesses = () => {
    setLoadingProcesses(true);
    api
      .executeCommand(deviceId, "process.list")
      .then((res) => {
        if (res.data?.processes) {
          setProcesses(res.data.processes);
        }
        setLoadingProcesses(false);
      })
      .catch(() => setLoadingProcesses(false));
  };

  // Quick Action execution (Lock, Sleep)
  const handleQuickAction = async (action: string, title: string) => {
    setActionLoading(action);
    setActionMessage(null);
    try {
      await api.executeCommand(deviceId, action);
      setActionMessage({ type: "success", text: `${title} command accepted and executed.` });
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || `Failed to execute ${title}` });
    } finally {
      setActionLoading(null);
    }
  };

  // Destructive Actions (Restart, Shutdown)
  const openConfirmModal = (action: string, title: string, desc: string, params: Record<string, unknown> = {}) => {
    setConfirmModal({
      isOpen: true,
      action,
      actionTitle: title,
      description: desc,
      params,
    });
  };

  // Revoke Device
  const handleRevokeDevice = async () => {
    if (!confirm("Are you sure you want to revoke this device? The agent connection will be disconnected permanently.")) {
      return;
    }
    try {
      await api.revokeDevice(deviceId);
      router.push("/devices");
    } catch (err: any) {
      alert(`Failed to revoke device: ${err.message}`);
    }
  };

  // Controls Handlers
  const handleSetVolume = async (val: number) => {
    setVolume(val);
    try {
      await api.executeCommand(deviceId, "audio.setVolume", { volume: val });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleMute = async () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    try {
      await api.executeCommand(deviceId, "audio.setMute", { muted: nextMute });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyMessage) return;
    setActionLoading("notify");
    try {
      await api.executeCommand(deviceId, "notify.show", {
        title: notifyTitle || "Relay Remote",
        message: notifyMessage,
      });
      setNotifyTitle("");
      setNotifyMessage("");
      setActionMessage({ type: "success", text: "Notification delivered to Mac." });
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  if (!device) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
        <p className="text-xs">Loading device dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Device Header */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-foreground">{device.name}</h1>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    device.isOnline
                      ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${device.isOnline ? "bg-green-500 animate-pulse" : "bg-slate-400"}`} />
                  {device.isOnline ? "Online" : "Offline"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                macOS {device.osVersion} • {device.chip} • {device.hostname}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleRevokeDevice}
              className="py-1.5 px-3 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Revoke</span>
            </button>
          </div>
        </div>

        {/* Action Status Notification */}
        {actionMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              actionMessage.type === "success"
                ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300"
                : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
            }`}
          >
            {actionMessage.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-border text-xs sm:text-sm font-medium gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`py-2 px-3 sm:px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("files")}
          className={`py-2 px-3 sm:px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "files"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Files</span>
        </button>

        <button
          onClick={() => setActiveTab("controls")}
          className={`py-2 px-3 sm:px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "controls"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Controls</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`py-2 px-3 sm:px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "audit"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Log</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Actions (2-tap reachable) */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Power Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => handleQuickAction("power.lock", "Lock Screen")}
                disabled={!device.isOnline || actionLoading !== null}
                className="p-3 bg-card border border-border hover:border-blue-500/50 rounded-xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                  {actionLoading === "power.lock" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                </div>
                <span className="text-xs font-semibold text-foreground">Lock Screen</span>
              </button>

              <button
                onClick={() => handleQuickAction("power.sleep", "Sleep")}
                disabled={!device.isOnline || actionLoading !== null}
                className="p-3 bg-card border border-border hover:border-purple-500/50 rounded-xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                  {actionLoading === "power.sleep" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Moon className="w-4 h-4" />}
                </div>
                <span className="text-xs font-semibold text-foreground">Sleep</span>
              </button>

              <button
                onClick={() =>
                  openConfirmModal(
                    "power.restart",
                    "Restart Mac",
                    "This will reboot your Mac. Any unsaved work in open applications may be lost."
                  )
                }
                disabled={!device.isOnline || actionLoading !== null}
                className="p-3 bg-card border border-border hover:border-amber-500/50 rounded-xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-foreground">Restart...</span>
              </button>

              <button
                onClick={() =>
                  openConfirmModal(
                    "power.shutdown",
                    "Shut Down Mac",
                    "This will completely power down your Mac. You will not be able to reconnect until someone turns it on."
                  )
                }
                disabled={!device.isOnline || actionLoading !== null}
                className="p-3 bg-card border border-border hover:border-red-500/50 rounded-xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
                  <Power className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-foreground">Shut Down...</span>
              </button>
            </div>
          </div>

          {/* System Telemetry */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Telemetry</h2>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                Live 2s stream
              </span>
            </div>
            <StatsCard stats={stats} />
          </div>
        </div>
      )}

      {/* TAB 2: FILES */}
      {activeTab === "files" && (
        <div className="space-y-3">
          <FileBrowser deviceId={deviceId} />
        </div>
      )}

      {/* TAB 3: CONTROLS */}
      {activeTab === "controls" && (
        <div className="space-y-6">
          {/* Audio & Media */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground">Volume & Audio</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={handleToggleMute}
                className={`p-2.5 rounded-xl border transition-colors ${
                  isMuted ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950 dark:border-red-900" : "bg-muted border-border text-foreground"
                }`}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Output Volume</span>
                  <span>{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => handleSetVolume(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Send Notification */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <span>Show macOS Notification</span>
            </h3>
            <form onSubmit={handleSendNotification} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Notification Title (optional)"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <textarea
                  required
                  rows={2}
                  placeholder="Type message to display on the Mac screen..."
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading === "notify" || !notifyMessage}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading === "notify" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Notification</span>
              </button>
            </form>
          </div>

          {/* Process List */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Top Running Processes</h3>
              <button
                onClick={loadProcesses}
                disabled={loadingProcesses}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {loadingProcesses ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {loadingProcesses ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading processes...</div>
            ) : processes.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">No processes available</div>
            ) : (
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {processes.slice(0, 15).map((p) => (
                  <div key={p.pid} className="py-2 flex items-center justify-between text-xs gap-2">
                    <div className="truncate flex-1">
                      <span className="font-medium text-foreground">{p.command.split("/").pop()}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 font-mono">PID {p.pid}</span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-muted-foreground">{p.cpuPercent.toFixed(1)}% CPU</span>
                      <button
                        onClick={() =>
                          openConfirmModal(
                            "process.kill",
                            `Kill Process ${p.command.split("/").pop()} (PID ${p.pid})`,
                            `Are you sure you want to terminate PID ${p.pid}?`,
                            { pid: p.pid }
                          )
                        }
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                        title="Kill process"
                      >
                        <Power className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT */}
      {activeTab === "audit" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Device Audit Trail</h3>
            <span className="text-xs text-muted-foreground">{auditLogs.length} events</span>
          </div>

          {loadingAudit ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading audit log...</div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">No audit entries recorded for this device.</div>
          ) : (
            <div className="divide-y divide-border">
              {auditLogs.map((entry) => (
                <div key={entry.id} className="p-3 sm:p-4 text-xs flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-foreground">{entry.action}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          entry.result === "success"
                            ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                            : entry.result === "pending"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                            : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                        }`}
                      >
                        {entry.result}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      IP: {entry.ip} • Duration: {entry.durationMs ? `${entry.durationMs}ms` : "-"}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground flex-shrink-0">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Destructive Action Confirmation Modal */}
      <ConfirmationDialog
        isOpen={confirmModal.isOpen}
        deviceId={deviceId}
        deviceName={device.name}
        action={confirmModal.action}
        actionTitle={confirmModal.actionTitle}
        description={confirmModal.description}
        params={confirmModal.params}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          setActionMessage({
            type: "success",
            text: `Destructive action "${confirmModal.actionTitle}" successfully executed.`,
          });
          if (activeTab === "controls") loadProcesses();
        }}
      />
    </div>
  );
}
