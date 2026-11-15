"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Laptop, PlusCircle, Radio, Clock, ShieldCheck, ChevronRight, Loader2 } from "lucide-react";
import { api, Device } from "@/lib/api";

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "Never";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 15) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = () => {
    api
      .getDevices()
      .then((res) => {
        setDevices(res.devices);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDevices();
    // Poll devices every 10s
    const timer = setInterval(fetchDevices, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">My Devices</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage and remotely control your connected Macs
          </p>
        </div>

        <Link
          href="/pair"
          className="flex items-center gap-1.5 py-2 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-xl shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Pair Mac</span>
        </Link>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
          <p className="text-xs">Loading devices...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-4">
            <Laptop className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-foreground mb-1">No paired Macs yet</h3>
          <p className="text-xs text-muted-foreground mb-6 max-w-sm">
            Install the Relay agent on your Mac to lock, sleep, browse files, and inspect live system stats remotely.
          </p>
          <Link
            href="/pair"
            className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-sm transition-colors inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Pairing Code</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {devices.map((device) => (
            <Link
              key={device.id}
              href={`/devices/${device.id}`}
              className="bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-blue-500/50 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground group-hover:text-blue-600 transition-colors">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm sm:text-base text-foreground group-hover:text-blue-600 transition-colors">
                      {device.name}
                    </h2>
                    <p className="text-[11px] font-mono text-muted-foreground">{device.hostname}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      device.isOnline ? "bg-green-500 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  <span className={device.isOnline ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                    {device.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground border-t border-border pt-3 mt-3">
                <div>
                  <span className="block font-medium text-foreground">macOS {device.osVersion}</span>
                  <span>{device.chip}</span>
                </div>
                <div className="text-right">
                  <span className="block font-medium text-foreground">
                    {device.isOnline ? "Active now" : formatRelativeTime(device.lastSeenAt)}
                  </span>
                  <span>v{device.agentVersion}</span>
                </div>
              </div>

              <div className="flex items-center justify-end text-xs text-blue-600 dark:text-blue-400 font-medium mt-3 pt-2 border-t border-border/50 gap-1">
                <span>Open Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
