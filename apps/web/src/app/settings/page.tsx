"use client";

import React, { useState, useEffect } from "react";
import { Settings, User, Shield, FolderPlus, Trash2, Check, AlertCircle, Loader2 } from "lucide-react";
import { api, User as UserType, Device } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [newFolder, setNewFolder] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([api.getMe(), api.getDevices()])
      .then(([userRes, devicesRes]) => {
        setUser(userRes.user);
        setDevices(devicesRes.devices);
        if (devicesRes.devices.length > 0) {
          setSelectedDeviceId(devicesRes.devices[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !newFolder.trim()) return;

    const trimmed = newFolder.trim();
    if (selectedDevice.allowedFolders.includes(trimmed)) {
      setMessage({ type: "error", text: "Folder is already allowlisted" });
      return;
    }

    const updated = [...selectedDevice.allowedFolders, trimmed];
    try {
      await api.updateDeviceAllowlist(selectedDevice.id, updated);
      setDevices((prev) =>
        prev.map((d) => (d.id === selectedDevice.id ? { ...d, allowedFolders: updated } : d))
      );
      setNewFolder("");
      setMessage({ type: "success", text: "Allowlist updated. Changes pushed to Mac." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update allowlist" });
    }
  };

  const handleRemoveFolder = async (folderToRemove: string) => {
    if (!selectedDevice) return;
    const updated = selectedDevice.allowedFolders.filter((f) => f !== folderToRemove);
    try {
      await api.updateDeviceAllowlist(selectedDevice.id, updated);
      setDevices((prev) =>
        prev.map((d) => (d.id === selectedDevice.id ? { ...d, allowedFolders: updated } : d))
      );
      setMessage({ type: "success", text: "Folder removed from allowlist." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update allowlist" });
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
        <p className="text-xs">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Manage your account, device permissions, and security
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300"
              : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
          }`}
        >
          {message.type === "success" ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Account Info */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <User className="w-4 h-4 text-blue-600" />
          <span>Account Profile</span>
        </h2>

        {user && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">{user.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium text-foreground capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-muted-foreground text-[11px] truncate max-w-xs">{user.id}</span>
            </div>
          </div>
        )}
      </div>

      {/* Folder Allowlists (REQ-6) */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Folder Allowlist Security</span>
          </h2>

          {devices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          The agent only exposes folders on this allowlist. Any access outside these paths (including via <code>..</code> or symlinks) is strictly blocked on the Mac.
        </p>

        {selectedDevice ? (
          <div className="space-y-4">
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
              {selectedDevice.allowedFolders.map((folder) => (
                <div key={folder} className="p-3 text-xs flex items-center justify-between gap-2 hover:bg-muted/30">
                  <span className="font-mono text-foreground truncate">{folder}</span>
                  <button
                    onClick={() => handleRemoveFolder(folder)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                    title="Remove folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddFolder} className="flex gap-2">
              <input
                type="text"
                placeholder="/Users/username/Projects"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
              <button
                type="submit"
                disabled={!newFolder.trim()}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add Folder</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No devices paired yet.
          </div>
        )}
      </div>
    </div>
  );
}
