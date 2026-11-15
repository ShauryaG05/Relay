import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function handlePowerLock(): Promise<{ action: string; status: string }> {
  try {
    // Put display to sleep which triggers screen lock if password on sleep is enabled
    await execFileAsync("pmset", ["displaysleepnow"]);
    return { action: "power.lock", status: "success" };
  } catch (err: any) {
    throw new Error(`Failed to lock screen: ${err.message}`);
  }
}

export async function handlePowerSleep(): Promise<{ action: string; status: string }> {
  try {
    await execFileAsync("pmset", ["sleepnow"]);
    return { action: "power.sleep", status: "success" };
  } catch (err: any) {
    throw new Error(`Failed to sleep machine: ${err.message}`);
  }
}

export async function handlePowerRestart(): Promise<{ action: string; status: string }> {
  try {
    // Tell System Events to restart the Mac
    await execFileAsync("osascript", [
      "-e",
      'tell application "System Events" to restart',
    ]);
    return { action: "power.restart", status: "initiated" };
  } catch (err: any) {
    throw new Error(`Failed to initiate restart: ${err.message}`);
  }
}

export async function handlePowerShutdown(): Promise<{ action: string; status: string }> {
  try {
    // Tell System Events to shut down the Mac
    await execFileAsync("osascript", [
      "-e",
      'tell application "System Events" to shut down',
    ]);
    return { action: "power.shutdown", status: "initiated" };
  } catch (err: any) {
    throw new Error(`Failed to initiate shutdown: ${err.message}`);
  }
}
