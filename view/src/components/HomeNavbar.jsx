import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconZap,
  IconArrowRight,
  IconMenu,
  IconX,
  IconMonitor
} from './Icons';

export default function HomeNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Live Simulator', href: '#simulator' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Quick Install', href: '#install' },
    { label: 'Comparison', href: '#comparison' },
    { label: 'Fleet', href: '#fleet' },
    { label: 'FAQ', href: '#faq' }
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-950/50 flex items-center justify-center transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <IconZap className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white font-mono">
                  RELAY<span className="text-cyan-400">.</span>CONTROL
                </span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-800/60">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 tracking-wide font-mono hidden sm:block">
                Ultra-Low Latency Remote Plane
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Action & Status */}
          <div className="hidden md:flex items-center gap-4">
            {/* Live Daemon Status Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Agents Active (12ms)</span>
            </div>

            {/* Launch Console CTA Button */}
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-zinc-950 text-xs font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <IconMonitor className="w-3.5 h-3.5" />
              <span>Launch Console</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/dashboard"
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-semibold"
            >
              Console
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-300 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Relay Agents Active • 12ms avg</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-cyan-400 hover:bg-zinc-900 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="pt-2">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-zinc-950 text-xs font-bold shadow-lg shadow-cyan-500/20"
            >
              <IconMonitor className="w-4 h-4" />
              <span>Launch Control Console</span>
              <IconArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
