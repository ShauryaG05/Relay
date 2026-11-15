import { execFile } from "child_process";
import { promisify } from "util";
import { ErrorCode } from "@relay/protocol";

const execFileAsync = promisify(execFile);

export interface ProcessEntry {
  pid: number;
  cpuPercent: number;
  memPercent: number;
  command: string;
}

export async function handleProcessList(): Promise<{ processes: ProcessEntry[] }> {
  try {
    const { stdout } = await execFileAsync("ps", ["-axo", "pid,%cpu,%mem,comm"]);
    const lines = stdout.trim().split("\n");
    const processes: ProcessEntry[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim().replace(/\s+/g, " ");
      const parts = line.split(" ");
      if (parts.length >= 4) {
        const pid = parseInt(parts[0], 10);
        const cpuPercent = parseFloat(parts[1]) || 0;
        const memPercent = parseFloat(parts[2]) || 0;
        const command = parts.slice(3).join(" ");

        if (!isNaN(pid)) {
          processes.push({
            pid,
            cpuPercent,
            memPercent,
            command,
          });
        }
      }
    }

    // Sort by CPU usage descending
    processes.sort((a, b) => b.cpuPercent - a.cpuPercent);

    return { processes: processes.slice(0, 100) };
  } catch (err: any) {
    throw {
      errorCode: ErrorCode.INTERNAL,
      message: `Failed to list processes: ${err.message}`,
    };
  }
}

export async function handleProcessKill(
  pid: number,
  signal: string = "SIGTERM"
): Promise<{ success: boolean; pid: number }> {
  if (pid <= 1) {
    throw {
      errorCode: ErrorCode.PATH_NOT_ALLOWED,
      message: "Refusing to kill system root processes (PID 0 or 1)",
    };
  }

  try {
    process.kill(pid, signal);
    return { success: true, pid };
  } catch (err: any) {
    throw {
      errorCode: ErrorCode.INTERNAL,
      message: `Failed to terminate process ${pid}: ${err.message}`,
    };
  }
}
