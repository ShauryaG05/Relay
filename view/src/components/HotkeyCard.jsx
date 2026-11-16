import React from 'react';

const colorThemes = {
  emerald: {
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30 hover:border-emerald-500/50',
    iconBg: 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30',
    badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    glow: 'from-emerald-500/10 via-transparent to-transparent',
    text: 'text-emerald-400',
    accentBorder: 'group-hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.3)]'
  },
  cyan: {
    bg: 'bg-cyan-500/10 hover:bg-cyan-500/15 border-cyan-500/30 hover:border-cyan-500/50',
    iconBg: 'bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30',
    badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
    glow: 'from-cyan-500/10 via-transparent to-transparent',
    text: 'text-cyan-400',
    accentBorder: 'group-hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.3)]'
  },
  rose: {
    bg: 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/30 hover:border-rose-500/50',
    iconBg: 'bg-rose-500/20 text-rose-400 group-hover:bg-rose-500/30',
    badge: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
    glow: 'from-rose-500/10 via-transparent to-transparent',
    text: 'text-rose-400',
    accentBorder: 'group-hover:shadow-[0_0_25px_-5px_rgba(244,63,94,0.3)]'
  },
  purple: {
    bg: 'bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/30 hover:border-purple-500/50',
    iconBg: 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30',
    badge: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
    glow: 'from-purple-500/10 via-transparent to-transparent',
    text: 'text-purple-400',
    accentBorder: 'group-hover:shadow-[0_0_25px_-5px_rgba(168,85,247,0.3)]'
  },
  amber: {
    bg: 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30 hover:border-amber-500/50',
    iconBg: 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30',
    badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    glow: 'from-amber-500/10 via-transparent to-transparent',
    text: 'text-amber-400',
    accentBorder: 'group-hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.3)]'
  },
  indigo: {
    bg: 'bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/30 hover:border-indigo-500/50',
    iconBg: 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30',
    badge: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    glow: 'from-indigo-500/10 via-transparent to-transparent',
    text: 'text-indigo-400',
    accentBorder: 'group-hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.3)]'
  }
};

export default function HotkeyCard({
  title,
  subtitle,
  hotkey,
  icon: Icon,
  color = 'cyan',
  isLoading = false,
  onClick,
  danger = false
}) {
  const theme = colorThemes[color] || colorThemes.cyan;

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`group relative text-left w-full p-4 rounded-2xl border transition-all duration-200 backdrop-blur-xl flex flex-col justify-between overflow-hidden cursor-pointer active:scale-[0.98] focus:outline-none ${theme.bg} ${theme.accentBorder}`}
    >
      {/* Background radial gradient glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.glow} opacity-40 pointer-events-none group-hover:opacity-75 transition-opacity`} />

      {/* Top row: Icon & Hotkey Badge */}
      <div className="relative z-10 flex items-center justify-between w-full mb-3">
        <div className={`p-2.5 rounded-xl border border-white/5 transition-transform duration-300 group-hover:scale-105 ${theme.iconBg}`}>
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon className="w-5 h-5" />
          )}
        </div>

        {/* Hotkey tag */}
        <div className="flex items-center gap-1.5">
          {hotkey && (
            <span className={`inline-flex items-center justify-center font-mono text-[11px] font-semibold px-2 py-1 rounded-md border shadow-xs transition-colors ${theme.badge}`}>
              <span className="text-[10px] text-zinc-400 mr-1">KEY</span>
              {hotkey}
            </span>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold tracking-tight text-white group-hover:text-white transition-colors">
            {title}
          </h4>
          {danger && (
            <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Destructive
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Bottom Subtle Bar */}
      <div className="relative z-10 mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="group-hover:text-zinc-200 transition-colors">Click or press hotkey</span>
        <span className={`font-mono text-[10px] font-medium transition-transform group-hover:translate-x-0.5 ${theme.text}`}>
          EXECUTE →
        </span>
      </div>
    </button>
  );
}

