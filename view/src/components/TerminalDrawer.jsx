import React, { useState, useEffect, useRef } from 'react';
import { IconTerminal, IconX, IconRefreshCw, IconMaximize2, IconMinimize2 } from './Icons';
import { executeRemoteCommand } from '../services/api';

export default function TerminalDrawer({ isOpen, onClose, device }) {
  const [history, setHistory] = useState([
    {
      id: 1,
      type: 'system',
      text: `Relay Agent Terminal v2.4.0 Connected to [${device?.name || 'Local Target'}] via Secure Shell Session`
    },
    {
      id: 2,
      type: 'system',
      text: `Target: ${device?.os || 'System'} (${device?.arch || 'x64'}) | IP: ${device?.ip || '127.0.0.1'}`
    },
    {
      id: 3,
      type: 'system',
      text: `Type 'help' or click presets below to trigger remote tasks.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (!isOpen) return null;

  const handleCommand = async (commandToRun) => {
    const cmd = commandToRun || input;
    if (!cmd.trim() || isExecuting) return;

    const trimmed = cmd.trim();
    setInput('');
    setCmdHistory((prev) => [trimmed, ...prev]);
    setHistoryIdx(-1);

    // Append user input to terminal history
    setHistory((prev) => [
      ...prev,
      { id: Date.now(), type: 'input', text: trimmed }
    ]);

    if (trimmed.toLowerCase() === 'clear') {
      setHistory([]);
      return;
    }

    if (trimmed.toLowerCase() === 'help') {
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'output',
          text: `Available Quick Commands:
  uptime           - Show target system uptime and load
  ps aux / top     - List top consuming CPU/RAM processes
  whoami           - Check active logged-in user privileges
  ping 1.1.1.1     - Test network roundtrip latency
  flushdns         - Flush and rebuild DNS caches
  clear            - Clear terminal display buffer`
        }
      ]);
      return;
    }

    setIsExecuting(true);
    const res = await executeRemoteCommand(trimmed, device?.id || 'default');
    setIsExecuting(false);

    setHistory((prev) => [
      ...prev,
      { id: Date.now() + 1, type: 'output', text: res.output }
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0 && historyIdx + 1 < cmdHistory.length) {
        const nextIdx = historyIdx + 1;
        setHistoryIdx(nextIdx);
        setInput(cmdHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInput(cmdHistory[nextIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const presets = [
    { label: 'Uptime', cmd: 'uptime' },
    { label: 'Top Procs', cmd: 'top' },
    { label: 'Ping Test', cmd: 'ping 1.1.1.1' },
    { label: 'Flush DNS', cmd: 'flushdns' },
    { label: 'WhoAmI', cmd: 'whoami' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 transition-all duration-300 ${
          isExpanded
            ? 'h-[92vh] max-w-5xl'
            : 'h-[580px] max-w-3xl'
        }`}
      >
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 cursor-pointer hover:bg-rose-500" onClick={onClose} />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-2">
              <IconTerminal className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-xs font-semibold text-zinc-200">
                relay-shell@{device?.id || 'target'}: ~
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                ELEVATED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
              title={isExpanded ? 'Minimize' : 'Maximize'}
            >
              {isExpanded ? (
                <IconMinimize2 className="w-4 h-4" />
              ) : (
                <IconMaximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Command Bar */}
        <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-zinc-500 text-[11px] font-mono shrink-0">Presets:</span>
          {presets.map((preset) => (
            <button
              key={preset.cmd}
              onClick={() => handleCommand(preset.cmd)}
              className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-cyan-300 border border-zinc-700/60 font-mono text-[11px] transition shrink-0"
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setHistory([])}
            className="ml-auto px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 font-mono shrink-0"
          >
            Clear
          </button>
        </div>

        {/* Terminal Output Body */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2.5 bg-black/60 selection:bg-cyan-500/30 selection:text-cyan-200">
          {history.map((item) => (
            <div key={item.id} className="leading-relaxed">
              {item.type === 'system' && (
                <div className="text-zinc-500 italic border-l-2 border-zinc-700 pl-2.5 py-0.5">
                  {item.text}
                </div>
              )}
              {item.type === 'input' && (
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <span className="text-emerald-400">root@{device?.id || 'target'}:~$</span>
                  <span>{item.text}</span>
                </div>
              )}
              {item.type === 'output' && (
                <pre className="text-zinc-300 whitespace-pre-wrap pl-4 font-mono text-[12px] bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/50">
                  {item.text}
                </pre>
              )}
            </div>
          ))}

          {isExecuting && (
            <div className="flex items-center gap-2 text-zinc-400 pl-4 py-1">
              <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Executing on remote node...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Terminal Command Input */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
          <span className="font-mono text-xs text-emerald-400 shrink-0 font-bold">
            $&gt;
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            placeholder="Type shell command (e.g. ps, uptime, ping) and press Enter..."
            className="flex-1 bg-transparent border-none text-zinc-100 placeholder-zinc-500 font-mono text-xs focus:outline-none"
          />
          <button
            onClick={() => handleCommand()}
            disabled={!input.trim() || isExecuting}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white font-mono text-xs transition"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
