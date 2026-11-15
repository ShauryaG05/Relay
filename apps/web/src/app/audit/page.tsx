"use client";

import React, { useState, useEffect } from "react";
import { History, Shield, Filter, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { api, AuditEntry } from "@/lib/api";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>("");

  const loadAuditLogs = () => {
    setLoading(true);
    api
      .getAuditLogs({
        action: filterAction || undefined,
        limit: 50,
      })
      .then((res) => {
        setLogs(res.entries);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAuditLogs();
  }, [filterAction]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Audit Log</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Append-only record of all actions, logins, pairings, and commands
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Actions</option>
            <option value="power.lock">power.lock</option>
            <option value="power.sleep">power.sleep</option>
            <option value="power.restart">power.restart</option>
            <option value="power.shutdown">power.shutdown</option>
            <option value="files.list">files.list</option>
            <option value="files.download">files.download</option>
            <option value="files.upload">files.upload</option>
            <option value="notify.show">notify.show</option>
            <option value="audio.setVolume">audio.setVolume</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
            <p className="text-xs">Loading audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            No audit records found matching your criteria.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((entry) => (
              <div key={entry.id} className="p-4 flex items-start justify-between gap-4 text-xs hover:bg-muted/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground text-sm">{entry.action}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        entry.result === "success"
                          ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                          : entry.result === "pending"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                      }`}
                    >
                      {entry.result === "success" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : entry.result === "failure" ? (
                        <XCircle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>{entry.result}</span>
                    </span>
                  </div>

                  {entry.errorMessage && (
                    <p className="text-red-600 dark:text-red-400 font-mono text-[11px]">
                      {entry.errorCode ? `[${entry.errorCode}] ` : ""}
                      {entry.errorMessage}
                    </p>
                  )}

                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 pt-1">
                    <span>IP: {entry.ip}</span>
                    {entry.durationMs !== undefined && <span>Duration: {entry.durationMs}ms</span>}
                    {entry.deviceId && <span className="font-mono truncate max-w-xs">Device: {entry.deviceId}</span>}
                  </div>
                </div>

                <div className="text-right text-[11px] text-muted-foreground whitespace-nowrap">
                  <div>
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div>
                    {new Date(entry.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
