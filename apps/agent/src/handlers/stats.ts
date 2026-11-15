import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { SystemStatsPayload } from "@relay/protocol";

const execFileAsync = promisify(execFile);

// For CPU calculation between ticks
let lastCpuMeasure = os.cpus();
let lastCpuMeasureTime = Date.now();

function getCpuLoad(): number {
  const currentCpus = os.cpus();
  const now = Date.now();
  const timeDiff = now - lastCpuMeasureTime;

  if (timeDiff <= 0) return 0;

  let totalIdle = 0;
  let totalTick = 0;

  for (let i = 0; i < currentCpus.length; i++) {
    const cur = currentCpus[i].times;
    const prev = lastCpuMeasure[i]?.times || cur;

    const idle = cur.idle - prev.idle;
    const total =
      cur.user - prev.user +
      (cur.nice - prev.nice) +
      (cur.sys - prev.sys) +
      (cur.irq - prev.irq) +
      idle;

    totalIdle += idle;
    totalTick += total;
  }

  lastCpuMeasure = currentCpus;
  lastCpuMeasureTime = now;

  if (totalTick <= 0) return 0;
  const load = Math.round((1 - totalIdle / totalTick) * 100);
  return Math.max(0, Math.min(100, load));
}

async function getDiskUsage(): Promise<{
  usedBytes: number;
  totalBytes: number;
  usedPercent: number;
  mount: string;
}> {
  try {
    const { stdout } = await execFileAsync("df", ["-k", "/"]);
    const lines = stdout.trim().split("\n");
    if (lines.length > 1) {
      const parts = lines[1].replace(/\s+/g, " ").split(" ");
      // Format: Filesystem 1024-blocks Used Available Capacity iused ifree %iused Mounted on
      const totalBlocks = parseInt(parts[1], 10) || 0;
      const usedBlocks = parseInt(parts[2], 10) || 0;
      const totalBytes = totalBlocks * 1024;
      const usedBytes = usedBlocks * 1024;
      const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
      return {
        usedBytes,
        totalBytes,
        usedPercent,
        mount: parts[parts.length - 1] || "/",
      };
    }
  } catch (e) {
    // fallback
  }

  return {
    usedBytes: 0,
    totalBytes: 1000000000,
    usedPercent: 0,
    mount: "/",
  };
}

async function getBatteryStatus(): Promise<{
  hasBattery: boolean;
  percent: number | null;
  isCharging: boolean | null;
  timeRemainingMinutes: number | null;
}> {
  try {
    const { stdout } = await execFileAsync("pmset", ["-g", "batt"]);
    // Output:
    // Now drawing from 'Battery Power'
    // -InternalBattery-0 (id=...)  98%; discharging; 6:15 remaining present: true
    if (!stdout.includes("InternalBattery")) {
      return {
        hasBattery: false,
        percent: null,
        isCharging: null,
        timeRemainingMinutes: null,
      };
    }

    const percentMatch = stdout.match(/(\d+)%/);
    const percent = percentMatch ? parseInt(percentMatch[1], 10) : null;
    const isCharging =
      stdout.includes("charging") && !stdout.includes("discharging");

    let timeRemainingMinutes: number | null = null;
    const timeMatch = stdout.match(/(\d+):(\d+) remaining/);
    if (timeMatch) {
      timeRemainingMinutes =
        parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
    }

    return {
      hasBattery: true,
      percent,
      isCharging,
      timeRemainingMinutes,
    };
  } catch (e) {
    return {
      hasBattery: false,
      percent: null,
      isCharging: null,
      timeRemainingMinutes: null,
    };
  }
}

export async function sampleSystemStats(): Promise<SystemStatsPayload> {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryPercent = Math.round((usedMem / totalMem) * 100);

  const [disk, battery] = await Promise.all([
    getDiskUsage(),
    getBatteryStatus(),
  ]);

  return {
    cpu: {
      loadPercent: getCpuLoad(),
      cores: cpus.length,
    },
    memory: {
      usedBytes: usedMem,
      totalBytes: totalMem,
      usedPercent: memoryPercent,
    },
    disk,
    battery,
    network: {
      rxBytesPerSec: 0, // baseline
      txBytesPerSec: 0,
    },
    uptimeSeconds: Math.round(os.uptime()),
    platform: process.platform,
    hostname: os.hostname(),
  };
}
