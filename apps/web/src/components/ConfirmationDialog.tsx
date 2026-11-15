"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface ConfirmationDialogProps {
  isOpen: boolean;
  deviceId: string;
  deviceName: string;
  action: string;
  actionTitle: string;
  description: string;
  params?: Record<string, unknown>;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConfirmationDialog({
  isOpen,
  deviceId,
  deviceName,
  action,
  actionTitle,
  description,
  params = {},
  onClose,
  onSuccess,
}: ConfirmationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setConfirmationId(null);
      setSecondsLeft(30);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // Request confirmation record from server
    api
      .createConfirmation(deviceId, action, params)
      .then((res) => {
        if (!isMounted) return;
        setConfirmationId(res.confirmationId);
        setSecondsLeft(30);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to initialize confirmation");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, deviceId, action]);

  // 30s countdown timer
  useEffect(() => {
    if (!isOpen || !confirmationId || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, confirmationId, secondsLeft]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!confirmationId || secondsLeft <= 0) return;

    setLoading(true);
    setError(null);

    try {
      await api.executeCommand(deviceId, action, params, confirmationId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Action execution failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center gap-3 text-red-500 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Confirm Destructive Action</h3>
            <p className="text-xs text-muted-foreground">{deviceName}</p>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-sm font-medium text-red-800 dark:text-red-300">
            {actionTitle}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between py-2 border-t border-border mb-6">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Confirmation window:
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              secondsLeft > 10
                ? "bg-muted text-foreground"
                : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 animate-pulse"
            }`}
          >
            {secondsLeft}s remaining
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-border font-medium text-sm text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || secondsLeft <= 0 || !confirmationId}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Action"}
          </button>
        </div>
      </div>
    </div>
  );
}
