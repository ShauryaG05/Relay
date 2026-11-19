import { Link } from 'react-router-dom';
import { IconZap } from './Icons';

export default function HomeFooter() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 text-zinc-400 text-xs">
      {/* Top Banner / System Status */}
      <div className="border-b border-zinc-900 bg-zinc-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-zinc-300 font-medium">Relay Control Mesh: Operational</span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-zinc-400 hidden sm:inline font-mono">TLS 1.3 / Sub-20ms Response Guarantee</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-zinc-400">Node Agent v2.4.0</span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-400">Darwin • Win32 • Linux</span>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 shadow-md shadow-cyan-950/40 flex items-center justify-center">
                <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                  <IconZap className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <span className="text-base font-bold tracking-tight text-white font-mono">
                RELAY<span className="text-cyan-400">.</span>CONTROL
              </span>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
              Headless, ultra-low latency command plane for modern workstations, homelabs, and developer rigs.
              Control power states, manage audio, monitor live telemetry, and execute shell diagnostics from any web browser.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link
                to="/dashboard"
                className="px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800/80 text-cyan-300 hover:text-cyan-200 text-xs font-mono font-medium hover:bg-cyan-900 transition-colors"
              >
                Launch Console →
              </Link>
              <a
                href="#install"
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono hover:bg-zinc-800 transition-colors"
              >
                Install Agent
              </a>
            </div>
          </div>

          {/* Features Col */}
          <div>
            <h4 className="text-zinc-200 font-mono font-semibold text-xs tracking-wider uppercase mb-3">
              Capabilities
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-cyan-400 transition-colors">Instant Device Lock</a></li>
              <li><a href="#features" className="hover:text-cyan-400 transition-colors">Power & Reboot Cycles</a></li>
              <li><a href="#features" className="hover:text-cyan-400 transition-colors">Hardware Vitals & Temp</a></li>
              <li><a href="#features" className="hover:text-cyan-400 transition-colors">Master Audio & Brightness</a></li>
              <li><a href="#features" className="hover:text-cyan-400 transition-colors">Remote Terminal Shell</a></li>
              <li><a href="#features" className="hover:text-cyan-400 transition-colors">Screen Frame Capture</a></li>
            </ul>
          </div>

          {/* Platforms Col */}
          <div>
            <h4 className="text-zinc-200 font-mono font-semibold text-xs tracking-wider uppercase mb-3">
              Supported OS
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>macOS (Apple Silicon & Intel)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>Windows 10 / 11 Pro</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>Ubuntu / Debian / Arch Linux</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>Docker Container Node</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>Raspberry Pi & SBCs</span>
              </li>
            </ul>
          </div>

          {/* Quick Access Col */}
          <div>
            <h4 className="text-zinc-200 font-mono font-semibold text-xs tracking-wider uppercase mb-3">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/dashboard" className="text-cyan-400 hover:underline">Open Control Center</Link></li>
              <li><a href="#simulator" className="hover:text-cyan-400 transition-colors">Interactive Demo</a></li>
              <li><a href="#architecture" className="hover:text-cyan-400 transition-colors">Daemon Architecture</a></li>
              <li><a href="#comparison" className="hover:text-cyan-400 transition-colors">Relay vs Remote Desktop</a></li>
              <li><a href="#faq" className="hover:text-cyan-400 transition-colors">Security & FAQ</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-zinc-900 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
          <p>© {new Date().getFullYear()} Relay Control Network. Built for high-speed systems control.</p>
          <div className="flex items-center gap-6">
            <span className="font-mono">Secure Token Verification</span>
            <span>•</span>
            <span className="font-mono">Zero Cloud Data Retention</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
