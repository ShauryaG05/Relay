"use client";

import React from "react";
import { Cpu, HardDrive, Database, Battery, BatteryCharging, Wifi, Clock } from "lucide-react";
import { SystemStatsPayload } from "@relay/protocol";

interface StatsCardProps {
  stats: SystemStatsPayload | null;
  loading?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function StatsCard({ stats, loading }: StatsCardProps) {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border p-4 rounded-xl animate-pulse h-28" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-card border border-border p-6 rounded-xl text-center text-muted-foreground text-sm">
        Live telemetry waiting for device connection...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* CPU */}
        <div className="bg-card border border-border p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">CPU</span>
            <Cpu className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">{stats.cpu.loadPercent}%</span>
            <span className="text-xs text-muted-foreground">{stats.cpu.cores} cores</span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                stats.cpu.loadPercent > 80
                  ? "bg-red-500"
                  : stats.cpu.loadPercent > 50
                  ? "bg-amber-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${stats.cpu.loadPercent}%` }}
            />
          </div>
        </div>

        {/* Memory */}
        <div className="bg-card border border-border p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Memory</span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">{stats.memory.usedPercent}%</span>
            <span className="text-xs text-muted-foreground">
              {formatBytes(stats.memory.usedBytes)} / {formatBytes(stats.memory.totalBytes)}
            </span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-500"
              style={{ width: `${stats.memory.usedPercent}%` }}
            />
          </div>
        </div>

        {/* Disk */}
        <div className="bg-card border border-border p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Disk</span>
            <HardDrive className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">{stats.disk.usedPercent}%</span>
            <span className="text-xs text-muted-foreground">{formatBytes(stats.disk.usedBytes)} used</span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${stats.disk.usedPercent}%` }}
            />
          </div>
        </div>

        {/* Battery / Uptime */}
        {stats.battery.hasBattery && stats.battery.percent !== null ? (
          <div className="bg-card border border-border p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Battery</span>
              {stats.battery.isCharging ? (
                <BatteryCharging className="w-4 h-4 text-green-500" />
              ) : (
                <Battery className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight">{stats.battery.percent}%</span>
              <span className="text-xs text-muted-foreground">
                {stats.battery.isCharging ? "Charging" : "Discharging"}
              </span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  stats.battery.percent < 20 ? "bg-red-500" : "bg-green-600"
                }`}
                style={{ width: `${stats.battery.percent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Uptime</span>
              <Clock className="w-4 h-4 text-sky-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight">
                {formatUptime(stats.uptimeSeconds)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-2.5 truncate">{stats.hostname}</div>
          </div>
        )}
      </div>
    </div>
  );
}
