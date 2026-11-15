"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Laptop, Clock, Copy, Check, Terminal, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

export default function PairPage() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(600);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.createPairingCode();
      setCode(res.code);
      const exp = new Date(res.expiresAt);
      setExpiresAt(exp);
      const diffSec = Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000));
      setSecondsLeft(diffSec);
    } catch (err: any) {
      setError(err.message || "Failed to generate pairing code");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateCode();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!expiresAt || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      const diffSec = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(diffSec);
      if (diffSec <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, secondsLeft]);

  const cliCommand = code
    ? `npx @relay/agent pair ${code} --gateway http://localhost:4000`
    : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Pair a New Mac</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Link your Mac to your Relay account with a secure one-time pairing code
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
            <p className="text-xs">Generating secure one-time code...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-center space-y-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto" />
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={generateCode}
              className="py-1.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium"
            >
              Try Again
            </button>
          </div>
        ) : code ? (
          <>
            {/* Pairing Code Display */}
            <div className="flex flex-col items-center text-center p-6 bg-muted/40 border border-border rounded-xl">
              <span className="text-xs font-medium text-muted-foreground mb-1">YOUR ONE-TIME PAIRING CODE</span>
              <div className="text-3xl sm:text-4xl font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400 my-2">
                {code}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Expires in{" "}
                  <strong className={secondsLeft < 60 ? "text-red-500 font-semibold" : "text-foreground font-semibold"}>
                    {formatTimer(secondsLeft)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Terminal Instructions */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-blue-600" />
                <span>Run in Terminal on your Mac</span>
              </h2>

              <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs flex items-center justify-between gap-2 overflow-x-auto">
                <span className="truncate">{cliCommand}</span>
                <button
                  onClick={() => copyToClipboard(cliCommand)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex-shrink-0 transition-colors"
                  title="Copy command"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Steps Guide */}
            <div className="space-y-3 text-xs text-muted-foreground border-t border-border pt-4">
              <h3 className="font-semibold text-foreground">Next steps:</h3>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                <li>Copy and paste the command above into Terminal on your Mac.</li>
                <li>The agent will register your Mac, store a secure token, and connect.</li>
                <li>
                  To keep the agent running in the background at login, run:
                  <code className="block my-1 p-2 bg-muted rounded font-mono text-[11px] text-foreground">
                    relay-agent service install
                  </code>
                </li>
              </ol>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={generateCode}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Generate a new code
              </button>

              <Link
                href="/devices"
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium inline-flex items-center gap-1.5"
              >
                <span>View Devices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
