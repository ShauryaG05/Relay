import React, { useEffect } from 'react';
import { IconKeyboard, IconX } from './Icons';

export default function HotkeyHelpModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hotkeysList = [
    {
      category: 'Power & Security Hotkeys',
      items: [
        { key: 'L', label: 'Lock Device', desc: 'Instantly lock target screen and enforce password challenge' },
        { key: 'R', label: 'Restart Device', desc: 'Gracefully reboot operating system with safety countdown' },
        { key: 'S', label: 'Shutdown System', desc: 'Power down target machine (requires WoL to power back on)' },
        { key: 'Z', label: 'Sleep / Suspend', desc: 'Trigger low-power standby mode preserving active RAM' },
        { key: 'O', label: 'Log Out Session', desc: 'End current graphical user session to return to login screen' }
      ]
    },
    {
      category: 'Media & Device Control',
      items: [
        { key: 'M', label: 'Toggle Mute', desc: 'Instantly silence or unmute target audio output' },
        { key: 'D', label: 'Blank Screen', desc: 'Toggle display power/blackout for privacy while keeping OS running' },
        { key: 'P', label: 'Remote Screenshot', desc: 'Capture high-res preview of remote display view' }
      ]
    },
    {
      category: 'Shell & Interface',
      items: [
        { key: 'T', label: 'Terminal / Shell', desc: 'Open interactive elevated remote command shell' },
        { key: '?', label: 'Hotkey Guide', desc: 'Open / close this keyboard shortcuts cheat-sheet' },
        { key: 'ESC', label: 'Cancel / Close', desc: 'Abort active countdowns or dismiss open overlays' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <IconKeyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Relay Hotkey Quick Reference</h3>
              <p className="text-xs text-zinc-400">
                Press any single key on your keyboard to instantly trigger remote device actions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {hotkeysList.map((section) => (
            <div key={section.category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                {section.category}
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {section.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition"
                  >
                    <div className="flex-1 pr-4">
                      <div className="text-sm font-medium text-zinc-200">{item.label}</div>
                      <div className="text-xs text-zinc-400">{item.desc}</div>
                    </div>
                    <kbd className="inline-flex items-center justify-center min-w-8 h-8 px-2.5 rounded-lg bg-zinc-800 border border-zinc-700 font-mono text-xs font-bold text-cyan-300 shadow-inner">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Tip: Hotkeys are automatically disabled while typing in terminal or text inputs.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}

