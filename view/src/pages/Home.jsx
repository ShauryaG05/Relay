import { useState } from 'react';
import { Link } from 'react-router-dom';
import HomeNavbar from '../components/HomeNavbar';
import HomeFooter from '../components/HomeFooter';
import heroImg from '../assets/hero.png';
import {
  IconZap,
  IconLock,
  IconMoon,
  IconTerminal,
  IconCamera,
  IconActivity,
  IconVolume2,
  IconVolumeX,
  IconSun,
  IconKeyboard,
  IconShield,
  IconCheck,
  IconCopy,
  IconChevronDown,
  IconArrowRight,
  IconServer,
  IconLaptop,
  IconMonitor,
  IconSparkles,
  IconGauge,
  IconSliders,
  IconCode,
  IconLayers
} from '../components/Icons';

export default function Home() {
  // Simulator State
  const [activeDevice, setActiveDevice] = useState('mac'); // 'mac' | 'pc'
  const [isLocked, setIsLocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(65);
  const [screenBlank, setScreenBlank] = useState(false);
  const [simLogs, setSimLogs] = useState([
    {
      id: 1,
      action: 'HEARTBEAT',
      msg: 'Agent daemon handshake established via TLS 1.3',
      latency: 11,
      time: 'Just now'
    },
    {
      id: 2,
      action: 'METRICS_SYNC',
      msg: 'Hardware sensors synced (CPU 24%, 42°C, RAM 18.2GB)',
      latency: 9,
      time: '1m ago'
    }
  ]);
  const [simCommandOutput, setSimCommandOutput] = useState('');
  const [simTerminalCommand, setSimTerminalCommand] = useState('uptime');
  const [isTerminalRunning, setIsTerminalRunning] = useState(false);

  // Quick Install Snippet state
  const [installTab, setInstallTab] = useState('mac'); // 'mac' | 'linux' | 'win' | 'node'
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // FAQ open/close state
  const [openFaq, setOpenFaq] = useState(0);

  // Install Snippets
  const snippets = {
    mac: `# Install & start Relay Agent on macOS (Apple Silicon & Intel)
curl -fsSL https://get.relay.run/mac | bash
relay agent start --token="rl_live_839fbc21"`,
    linux: `# Install systemd daemon on Ubuntu / Debian / Arch
curl -fsSL https://get.relay.run/linux | sudo bash
sudo systemctl enable --now relay-daemon`,
    win: `# Run in Windows PowerShell (Admin)
irm https://get.relay.run/win | iex
Start-RelayAgent -Token "rl_live_839fbc21" -Autostart`,
    node: `# Run directly from local Node.js environment
git clone https://github.com/shaurya/relay.git
cd relay/agent && node agent.js`
  };

  const copyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2200);
  };

  // Dispatch simulated action
  const triggerSimAction = (actionType, customMsg) => {
    const lat = Math.floor(Math.random() * 8) + 8;
    const now = new Date().toLocaleTimeString();

    if (actionType === 'LOCK') {
      setIsLocked((prev) => !prev);
    } else if (actionType === 'MUTE') {
      setIsMuted((prev) => !prev);
    } else if (actionType === 'SCREEN_BLANK') {
      setScreenBlank((prev) => !prev);
    }

    const newLog = {
      id: Date.now(),
      action: actionType,
      msg: customMsg,
      latency: lat,
      time: now
    };

    setSimLogs((prev) => [newLog, ...prev.slice(0, 4)]);
  };

  const runSimCommand = () => {
    setIsTerminalRunning(true);
    setSimCommandOutput('Executing remote binary on host...');

    setTimeout(() => {
      setIsTerminalRunning(false);
      const cmd = simTerminalCommand.trim().toLowerCase();
      let res;
      if (cmd === 'uptime') {
        res = 'up 4 days, 18:32, 2 users, load average: 1.45, 1.22, 1.05';
      } else if (cmd.startsWith('ping')) {
        res = '64 bytes from 1.1.1.1: icmp_seq=0 ttl=57 time=11.4 ms\n64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=11.9 ms\n2 packets transmitted, 0% loss';
      } else if (cmd === 'whoami') {
        res = 'root@relay-node-01 (elevated daemon session)';
      } else if (cmd.startsWith('pmset') || cmd.includes('sleep')) {
        res = 'Display sleep / low power state engaged successfully.';
      } else {
        res = `[Relay Agent on ${activeDevice === 'mac' ? 'MacBook-Pro-M3' : 'Studio-Workstation'}]\n$ ${cmd}\nCommand completed with exit code 0.`;
      }
      setSimCommandOutput(res);

      triggerSimAction(
        'EXEC_SHELL',
        `Command '${simTerminalCommand}' executed in remote daemon.`
      );
    }, 450);
  };

  const faqs = [
    {
      q: 'How does Relay communicate with host workstations without port forwarding?',
      a: 'The Relay agent daemon connects outbound to the secure Relay WebSocket control plane using TLS 1.3. Because the connection is outbound from the host machine, no public IP, port forwarding, or firewall alterations are required. You can command your workstation from anywhere in the world.'
    },
    {
      q: 'How fast is command dispatch compared to TeamViewer or AnyDesk?',
      a: 'Traditional remote desktop tools stream a compressed 60FPS video feed, consuming 5–15 Mbps bandwidth and suffering from 350ms to 1 second of interaction lag. Relay uses headless, event-driven JSON payloads that travel across the wire in under 15ms. Commands like Lock, Sleep, and Reboot execute instantaneously.'
    },
    {
      q: 'Does Relay require root or elevated administrator privileges?',
      a: 'Basic features like Screen Lock, Mute, Volume, and Device Telemetry run in user space without root. System-wide actions like Reboot, Shutdown, or S3 Standby use native system commands (like osascript / pmset on macOS, shutdown on Windows, systemctl on Linux) and can run either with standard permissions or an elevated daemon.'
    },
    {
      q: 'Can I control my workstation from my mobile phone or iPad?',
      a: 'Yes! The Relay Control Hub is a fully responsive Progressive Web App. You can open it in Safari on iPhone, Chrome on Android, or any mobile browser to lock your desktop, check running tasks, or trigger reboot sequences on the go.'
    },
    {
      q: 'Is my remote data encrypted and private?',
      a: 'Every connection is authenticated with granular device tokens and encrypted end-to-end via TLS 1.3. Relay never records or uploads your screen activity to any third-party cloud. Telemetry and commands flow directly between your authorized controller and your daemon.'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <HomeNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Glow backdrop backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] pointer-events-none opacity-40">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px]"></div>
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-[140px]"></div>
        </div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Announcement Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-xs font-mono text-cyan-300 shadow-lg shadow-cyan-950/40">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Relay v2.4 Active</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">Headless Workstation Control</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              Control Any Machine.{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                From Anywhere. In Milliseconds.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed font-normal max-w-2xl mx-auto">
              The ultra-low latency command plane for developers, builders, and homelabbers.
              Execute instant lockouts, power cycles, telemetry checks, master audio adjustments,
              and remote shell commands — with zero heavy screen-streaming overhead.
            </p>

            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-zinc-950 font-bold text-sm shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/35 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <IconZap className="w-4 h-4 text-zinc-950" />
                <span>Launch Control Hub</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#simulator"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-semibold text-sm transition-colors hover:border-zinc-600"
              >
                <span>Try Live Simulator</span>
                <IconChevronDown className="w-4 h-4 text-zinc-400" />
              </a>
            </div>

            {/* One-click quick install copy command */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-300 max-w-full overflow-hidden shadow-inner">
                <span className="text-cyan-400 select-none">$</span>
                <span className="truncate">curl -fsSL https://get.relay.run | bash</span>
                <button
                  onClick={() => copyCode('curl -fsSL https://get.relay.run | bash')}
                  className="ml-2 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  title="Copy command"
                >
                  {copiedSnippet ? (
                    <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <IconCopy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {copiedSnippet && (
                <p className="text-[11px] font-mono text-emerald-400 mt-1.5 animate-fadeIn">
                  ✓ Copied install command to clipboard
                </p>
              )}
            </div>

            {/* Daemon Node Visual Badge */}
            <div className="flex items-center justify-center pt-4 pb-2">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 opacity-40 blur-lg group-hover:opacity-60 transition duration-500"></div>
                <div className="relative rounded-2xl bg-zinc-950/90 border border-zinc-800/80 p-2.5 sm:p-3 shadow-2xl flex items-center gap-3.5 max-w-md mx-auto text-left">
                  <img
                    src={heroImg}
                    alt="Relay Agent Daemon"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-zinc-900/80 p-1 border border-zinc-800 flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">Relay Agent Node</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        v2.4 Daemon
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                      Headless background service for macOS, Windows & Linux with native system bindings.
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-cyan-400">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                        12ms Dispatch
                      </span>
                      <span className="text-zinc-700">|</span>
                      <span>0.0% Idle CPU</span>
                      <span className="text-zinc-700">|</span>
                      <span>TLS 1.3</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Trust & Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-zinc-800/60 max-w-3xl mx-auto">
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/50">
                <div className="text-xl sm:text-2xl font-bold font-mono text-white">
                  &lt; 12<span className="text-cyan-400 text-base">ms</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">Dispatch Latency</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/50">
                <div className="text-xl sm:text-2xl font-bold font-mono text-white">
                  0.0<span className="text-emerald-400 text-base">%</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">Idle CPU Overhead</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/50">
                <div className="text-xl sm:text-2xl font-bold font-mono text-white">
                  TLS <span className="text-cyan-400 text-base">1.3</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">End-to-End Pipe</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/50">
                <div className="text-xl sm:text-2xl font-bold font-mono text-white">
                  3 <span className="text-emerald-400 text-base">OSes</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">macOS • Win • Linux</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Simulator Section */}
      <section id="simulator" className="py-16 bg-zinc-900/40 border-y border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-[11px] font-mono text-cyan-400 mb-2">
              <IconSparkles className="w-3.5 h-3.5" />
              <span>Interactive Simulator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Test Relay Right in Your Browser
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Click the remote action triggers below to experience real-time dispatch, state management,
              and latency responses before setting up your own agent daemon.
            </p>
          </div>

          {/* Simulator Console Card */}
          <div className="max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Top Bar with Device Switcher */}
            <div className="border-b border-zinc-800/80 bg-zinc-900/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                </div>
                <span className="text-xs font-mono text-zinc-400 ml-2">relay-agent://simulator</span>
              </div>

              {/* Device Selector Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveDevice('mac');
                    triggerSimAction('SWITCH_DEVICE', "Switched target to Shaurya's MacBook Pro");
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 ${
                    activeDevice === 'mac'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <IconLaptop className="w-3.5 h-3.5" />
                  <span>MacBook Pro (M3 Max)</span>
                </button>

                <button
                  onClick={() => {
                    setActiveDevice('pc');
                    triggerSimAction('SWITCH_DEVICE', 'Switched target to Studio Workstation PC');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 ${
                    activeDevice === 'pc'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <IconServer className="w-3.5 h-3.5" />
                  <span>Studio Workstation (RTX 4090)</span>
                </button>
              </div>
            </div>

            {/* Target Machine Status Row */}
            <div className="p-5 border-b border-zinc-800/80 bg-zinc-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600/30 to-emerald-600/30 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  {activeDevice === 'mac' ? (
                    <IconLaptop className="w-6 h-6 text-cyan-400" />
                  ) : (
                    <IconServer className="w-6 h-6 text-emerald-400" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-mono">
                      {activeDevice === 'mac' ? "Shaurya's MacBook Pro" : 'Studio Workstation PC'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                      ONLINE
                    </span>
                    {isLocked && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-800/60 flex items-center gap-1">
                        <IconLock className="w-3 h-3" /> LOCKED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    {activeDevice === 'mac'
                      ? 'macOS Sequoia 15.2 • Apple M3 Max • 192.168.1.142'
                      : 'Windows 11 Pro • Intel Core i9-14900K / RTX 4090 • 192.168.1.108'}
                  </p>
                </div>
              </div>

              {/* Vitals pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
                  <span className="text-zinc-500 mr-1.5">PING</span>
                  <span className="text-cyan-400 font-semibold">{activeDevice === 'mac' ? '12ms' : '18ms'}</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
                  <span className="text-zinc-500 mr-1.5">CPU</span>
                  <span className="text-emerald-400 font-semibold">{activeDevice === 'mac' ? '24%' : '58%'}</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
                  <span className="text-zinc-500 mr-1.5">TEMP</span>
                  <span className="text-amber-400 font-semibold">{activeDevice === 'mac' ? '42°C' : '64°C'}</span>
                </div>
              </div>
            </div>

            {/* Action Simulator Grid */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Quick Remote Action Buttons */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                    Interactive Controls
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">Click to test latency</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Lock Trigger */}
                  <button
                    onClick={() =>
                      triggerSimAction(
                        'LOCK',
                        isLocked
                          ? 'Workstation unlocked via remote authorization.'
                          : 'Lock screen engaged via pmset displaysleepnow.'
                      )
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isLocked
                        ? 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                        : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <IconLock className={`w-4 h-4 ${isLocked ? 'text-amber-400' : 'text-cyan-400'}`} />
                      <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-zinc-950 text-zinc-400">
                        KEY: L
                      </span>
                    </div>
                    <div className="text-xs font-semibold">{isLocked ? 'Unlock Screen' : 'Lock Screen'}</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {isLocked ? 'State: LOCKED' : 'Instant display lock'}
                    </div>
                  </button>

                  {/* Audio Mute Trigger */}
                  <button
                    onClick={() =>
                      triggerSimAction(
                        'MUTE',
                        isMuted
                          ? 'Master audio unmuted on remote host.'
                          : 'Master audio muted instantly.'
                      )
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isMuted
                        ? 'bg-red-950/40 border-red-800/60 text-red-200'
                        : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      {isMuted ? (
                        <IconVolumeX className="w-4 h-4 text-red-400" />
                      ) : (
                        <IconVolume2 className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-zinc-950 text-zinc-400">
                        KEY: M
                      </span>
                    </div>
                    <div className="text-xs font-semibold">{isMuted ? 'Unmute Audio' : 'Mute Audio'}</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {isMuted ? 'Audio: MUTED' : `Volume: ${volume}%`}
                    </div>
                  </button>

                  {/* Sleep Mode Trigger */}
                  <button
                    onClick={() =>
                      triggerSimAction(
                        'SLEEP',
                        'Low-power S3 sleep signal transmitted (pmset sleepnow)'
                      )
                    }
                    className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-left transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <IconMoon className="w-4 h-4 text-purple-400" />
                      <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-zinc-950 text-zinc-400">
                        KEY: S
                      </span>
                    </div>
                    <div className="text-xs font-semibold">Sleep Host</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Low-power S3 standby</div>
                  </button>

                  {/* Blank Display Trigger */}
                  <button
                    onClick={() =>
                      triggerSimAction(
                        'SCREEN_BLANK',
                        screenBlank
                          ? 'Display backlight restored.'
                          : 'Display output blanked to save power.'
                      )
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      screenBlank
                        ? 'bg-zinc-800 border-zinc-600 text-zinc-300'
                        : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <IconSun className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-zinc-950 text-zinc-400">
                        KEY: B
                      </span>
                    </div>
                    <div className="text-xs font-semibold">{screenBlank ? 'Wake Screen' : 'Blank Screen'}</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {screenBlank ? 'Display blanked' : 'Backlight at 80%'}
                    </div>
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <IconVolume2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Remote Volume Level</span>
                    </span>
                    <span className="font-bold text-cyan-400">{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setVolume(v);
                      triggerSimAction('VOLUME', `Master audio volume adjusted to ${v}%`);
                    }}
                    className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Right Column: Mini Interactive Remote Terminal */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <IconTerminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Remote Headless Shell</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Daemon sandbox</span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 select-none">$</span>
                    <input
                      type="text"
                      value={simTerminalCommand}
                      onChange={(e) => setSimTerminalCommand(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && runSimCommand()}
                      placeholder="uptime, whoami, ping 1.1.1.1"
                      className="bg-transparent border-none text-zinc-200 text-xs font-mono focus:outline-none w-full"
                    />
                    <button
                      onClick={runSimCommand}
                      disabled={isTerminalRunning}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-zinc-950 text-[11px] font-bold transition-colors disabled:opacity-50"
                    >
                      {isTerminalRunning ? '...' : 'Exec'}
                    </button>
                  </div>

                  {/* Terminal Output Window */}
                  <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800/80 min-h-[90px] text-[11px] text-zinc-400 whitespace-pre-line leading-relaxed">
                    {simCommandOutput ||
                      `Try typing:\n• uptime\n• ping 1.1.1.1\n• whoami\n• pmset displaysleepnow`}
                  </div>
                </div>

                {/* Quick Command Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-zinc-500">Quick:</span>
                  {['uptime', 'ping 1.1.1.1', 'whoami'].map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => {
                        setSimTerminalCommand(cmd);
                      }}
                      className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-zinc-300 transition-colors"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Activity & Dispatch Log Stream */}
            <div className="border-t border-zinc-800/80 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                  <IconActivity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real-time Dispatch Log</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Socket TLS 1.3</span>
              </div>

              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {simLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-[11px] font-mono bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-semibold">{log.action}</span>
                      <span className="text-zinc-400 truncate max-w-xs sm:max-w-md">{log.msg}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 flex-shrink-0">
                      <span className="text-emerald-400 font-semibold">{log.latency}ms</span>
                      <span className="hidden sm:inline">{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Card CTA */}
              <div className="mt-4 pt-3 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-zinc-400">
                  Ready to deploy on your real machines?
                </span>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition-colors"
                >
                  <span>Open Full Control Hub</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities & Features Grid */}
      <section id="features" className="py-20 lg:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-[11px] font-mono text-cyan-400 mb-2">
              <IconZap className="w-3.5 h-3.5" />
              <span>Engineered For Speed</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything You Need for Remote Machine Command
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base mt-3">
              Built from scratch to eliminate the bloated bandwidth and lagging input of traditional
              VNC and screen-sharing clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-cyan-500/40 transition-all hover:bg-zinc-900/60 group">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center mb-4 text-cyan-400 group-hover:scale-105 transition-transform">
                <IconLock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Instant Power & Session Locks</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Trigger screen lockouts, S3 sleep suspension, system reboots, and clean shutdowns.
                Includes an emergency killswitch to instantly sever network sessions and engage display protection.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400">
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">pmset</span>
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">LockWorkStation</span>
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">loginctl</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-emerald-500/40 transition-all hover:bg-zinc-900/60 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-105 transition-transform">
                <IconActivity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Real-Time Hardware Telemetry</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Stream live hardware metrics including per-core CPU utilization, thermal sensor temperatures,
                RAM allocation, NVMe storage usage, and battery charging health.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">Thermal Throttling</span>
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">RAM Pressure</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-purple-500/40 transition-all hover:bg-zinc-900/60 group">
              <div className="w-10 h-10 rounded-xl bg-purple-950/70 border border-purple-800/60 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-105 transition-transform">
                <IconTerminal className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Headless Remote Shell</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Execute diagnostic scripts, inspect process tables (<code className="text-purple-300">top</code>, <code className="text-purple-300">ps</code>),
                flush DNS resolvers, and ping endpoints directly inside the web browser without wrestling with SSH keys.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-mono text-purple-400">
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">Non-blocking Execution</span>
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">Exit Status 0</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-amber-500/40 transition-all hover:bg-zinc-900/60 group">
              <div className="w-10 h-10 rounded-xl bg-amber-950/70 border border-amber-800/60 flex items-center justify-center mb-4 text-amber-400 group-hover:scale-105 transition-transform">
                <IconSliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Media & Hardware Sliders</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Fine-tune remote master audio levels from 0 to 100%, toggle instant mute,
                adjust display backlights, and blank monitors to save energy when running remote workloads.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-mono text-amber-400">
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">CoreAudio</span>
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">ALSA / Pulse</span>
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">WScript.Shell</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-cyan-500/40 transition-all hover:bg-zinc-900/60 group">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center mb-4 text-cyan-400 group-hover:scale-105 transition-transform">
                <IconCamera className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Remote Frame Verification</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Capture instant, high-definition desktop snapshots to visually verify that long-running 3D renders,
                model trainings, or code builds have succeeded without streaming constant video.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400">
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">High-Res Capture</span>
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">Zero Idle Stream</span>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-teal-500/40 transition-all hover:bg-zinc-900/60 group">
              <div className="w-10 h-10 rounded-xl bg-teal-950/70 border border-teal-800/60 flex items-center justify-center mb-4 text-teal-400 group-hover:scale-105 transition-transform">
                <IconKeyboard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Universal Hotkey Engine</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Keyboard-first workflow for power users. Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300">L</kbd> to lock,
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300">S</kbd> to sleep,
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300">T</kbd> for terminal, and
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300">?</kbd> for shortcuts.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-mono text-teal-400">
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">Zero-Click Dispatch</span>
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">Vim-Grade Speed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture & How It Works */}
      <section id="architecture" className="py-20 bg-zinc-900/30 border-y border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-[11px] font-mono text-cyan-400 mb-2">
              <IconLayers className="w-3.5 h-3.5" />
              <span>Simple, Robust Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How Relay Operates
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base mt-3">
              Lightweight daemons on your physical machines connect through a secured communication channel
              directly to your responsive browser interface.
            </p>
          </div>

          {/* 3 Step Visual Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 relative z-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-1 rounded bg-cyan-950/80 border border-cyan-800/60">
                    STEP 01
                  </span>
                  <IconLaptop className="w-5 h-5 text-zinc-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Deploy Host Daemon</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Run the single-file lightweight agent on your Mac, Windows workstation, or Linux server.
                  It consumes zero idle CPU and listens for authenticated commands.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                <span className="text-cyan-400">$</span> relay agent start
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 relative z-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-1 rounded bg-emerald-950/80 border border-emerald-800/60">
                    STEP 02
                  </span>
                  <IconShield className="w-5 h-5 text-zinc-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Encrypted TLS Mesh</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  The daemon establishes an outbound encrypted TLS 1.3 socket pipe.
                  No ports need to be opened in your router, and communication remains strictly confidential.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                <span className="text-emerald-400">✓</span> TLS 1.3 Handshake (12ms)
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 relative z-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-purple-400 px-2 py-1 rounded bg-purple-950/80 border border-purple-800/60">
                    STEP 03
                  </span>
                  <IconMonitor className="w-5 h-5 text-zinc-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Command from Any Screen</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Open the Relay Control Center in any browser — on your iPhone, iPad, laptop, or secondary PC.
                  Execute commands with instant tactile feedback.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                <span className="text-purple-400">⚡</span> Lock • Reboot • Telemetry • Shell
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison: Relay vs Heavy Remote Desktop */}
      <section id="comparison" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-[11px] font-mono text-cyan-400 mb-2">
              <IconGauge className="w-3.5 h-3.5" />
              <span>Why Relay Wins</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Relay vs Traditional Remote Desktop
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base mt-3">
              Why run a heavy 15 Mbps video encoder just to lock a screen or reboot a machine?
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-3 bg-zinc-900/90 border-b border-zinc-800 px-6 py-4 font-mono text-xs font-semibold text-zinc-300">
              <div>Metric / Capability</div>
              <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                <IconZap className="w-4 h-4" />
                <span>RELAY CONTROL</span>
              </div>
              <div className="text-zinc-400">TeamViewer / AnyDesk / VNC</div>
            </div>

            <div className="divide-y divide-zinc-800/60 text-xs font-mono">
              <div className="grid grid-cols-3 px-6 py-3.5 items-center bg-zinc-950/40">
                <div className="text-zinc-300 font-medium">Command Dispatch Latency</div>
                <div className="text-emerald-400 font-bold">&lt; 15 ms (Instantaneous)</div>
                <div className="text-zinc-400">350 ms – 900 ms (Video stream lag)</div>
              </div>

              <div className="grid grid-cols-3 px-6 py-3.5 items-center bg-zinc-950">
                <div className="text-zinc-300 font-medium">Host CPU & Memory Footprint</div>
                <div className="text-emerald-400 font-bold">0.0% CPU • ~12MB RAM</div>
                <div className="text-zinc-400">10% – 25% CPU • 250MB+ RAM</div>
              </div>

              <div className="grid grid-cols-3 px-6 py-3.5 items-center bg-zinc-950/40">
                <div className="text-zinc-300 font-medium">Bandwidth Usage (Idle / Active)</div>
                <div className="text-emerald-400 font-bold">0 KB idle • Event JSON only</div>
                <div className="text-zinc-400">5 – 15 Mbps continuous stream</div>
              </div>

              <div className="grid grid-cols-3 px-6 py-3.5 items-center bg-zinc-950">
                <div className="text-zinc-300 font-medium">Smartphone & Mobile Control</div>
                <div className="text-emerald-400 font-bold">Native tactile 1-tap buttons</div>
                <div className="text-zinc-400">Pinch-zooming a 4K desktop display</div>
              </div>

              <div className="grid grid-cols-3 px-6 py-3.5 items-center bg-zinc-950/40">
                <div className="text-zinc-300 font-medium">Headless Remote Shell</div>
                <div className="text-emerald-400 font-bold">Direct browser terminal drawer</div>
                <div className="text-zinc-400">Requires opening physical terminal app</div>
              </div>

              <div className="grid grid-cols-3 px-6 py-3.5 items-center bg-zinc-950">
                <div className="text-zinc-300 font-medium">Global Keyboard Hotkeys</div>
                <div className="text-emerald-400 font-bold">L, S, R, T instant key triggers</div>
                <div className="text-zinc-400">Conflicts with host OS modifiers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Install Section */}
      <section id="install" className="py-20 bg-zinc-900/40 border-y border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-[11px] font-mono text-cyan-400 mb-2">
              <IconCode className="w-3.5 h-3.5" />
              <span>60-Second Setup</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Install the Agent in Seconds
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base mt-2">
              Choose your platform, copy the one-line installer, and start commanding your machine.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Platform Switcher Tabs */}
            <div className="flex border-b border-zinc-800/80 bg-zinc-900/60 overflow-x-auto">
              {[
                { id: 'mac', label: 'macOS (Darwin)' },
                { id: 'linux', label: 'Linux (systemd)' },
                { id: 'win', label: 'Windows (PowerShell)' },
                { id: 'node', label: 'Node.js (Self-Host)' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setInstallTab(tab.id)}
                  className={`px-5 py-3 text-xs font-mono font-medium transition-colors border-b-2 whitespace-nowrap ${
                    installTab === tab.id
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Code Block with Copy Action */}
            <div className="p-6 relative">
              <div className="flex items-center justify-between mb-3 text-xs font-mono text-zinc-400">
                <span>Terminal Install Command:</span>
                <button
                  onClick={() => copyCode(snippets[installTab])}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-mono transition-colors"
                >
                  {copiedSnippet ? (
                    <>
                      <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <IconCopy className="w-3.5 h-3.5" />
                      <span>Copy snippet</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-xs text-cyan-300 leading-relaxed overflow-x-auto whitespace-pre">
                {snippets[installTab]}
              </pre>

              <div className="mt-4 pt-4 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Zero dependencies required</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Autostarts on boot</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Device Fleet Showcase */}
      <section id="fleet" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-[11px] font-mono text-cyan-400 mb-2">
              <IconLaptop className="w-3.5 h-3.5" />
              <span>Multi-Device Fleet</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Manage Your Entire Fleet From One Unified View
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base mt-2">
              Switch effortlessly between laptops, studio rigs, and rackmount servers without logging out.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Device 1 Card */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/40 transition-all shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                      <IconLaptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-mono">Shaurya's MacBook Pro</h3>
                      <p className="text-xs text-zinc-400 font-mono">Apple M3 Max • macOS Sequoia 15.2</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    ONLINE (12ms)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 my-4">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center font-mono">
                    <div className="text-[10px] text-zinc-400">CPU LOAD</div>
                    <div className="text-sm font-bold text-cyan-400 mt-0.5">24%</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center font-mono">
                    <div className="text-[10px] text-zinc-400">TEMP</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">42°C</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center font-mono">
                    <div className="text-[10px] text-zinc-400">RAM USED</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">18.2 GB</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-mono">Uptime: 4d 18h 32m</span>
                <Link
                  to="/dashboard"
                  className="text-xs font-mono font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <span>Control node</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Device 2 Card */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/40 transition-all shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                      <IconServer className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-mono">Studio Workstation PC</h3>
                      <p className="text-xs text-zinc-400 font-mono">Intel i9-14900K / RTX 4090 • Win 11</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    ONLINE (18ms)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 my-4">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center font-mono">
                    <div className="text-[10px] text-zinc-400">CPU LOAD</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">58%</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center font-mono">
                    <div className="text-[10px] text-zinc-400">TEMP</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">64°C</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center font-mono">
                    <div className="text-[10px] text-zinc-400">RAM USED</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">38.6 GB</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-mono">Uptime: 11d 04h 10m</span>
                <Link
                  to="/dashboard"
                  className="text-xs font-mono font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <span>Control node</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="py-20 bg-zinc-900/30 border-y border-zinc-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-[11px] font-mono text-cyan-400 mb-2">
              <IconShield className="w-3.5 h-3.5" />
              <span>Security & Clarity</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 focus:outline-none"
                  >
                    <span className="text-sm font-semibold text-zinc-200">{faq.q}</span>
                    <IconChevronDown
                      className={`w-4 h-4 text-zinc-400 transition-transform ${
                        isOpen ? 'rotate-180 text-cyan-400' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-850 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl relative overflow-hidden">
            {/* Background glow in card */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Ready to Take Command of Your Machines?
              </h2>
              <p className="text-sm sm:text-base text-zinc-400">
                Launch the control center now or run the lightweight agent in your terminal.
                Zero credit card, zero bloated software.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-zinc-950 font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
                >
                  <IconZap className="w-4 h-4" />
                  <span>Open Control Hub Now</span>
                  <IconArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#install"
                  className="w-full sm:w-auto px-6 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-semibold text-sm transition-colors"
                >
                  View Quickstart Guide
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <HomeFooter />
    </div>
  );
}
