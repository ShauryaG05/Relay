import { execFile } from "child_process";
import { promisify } from "util";
import { ErrorCode } from "@relay/protocol";

const execFileAsync = promisify(execFile);

export async function handleAudioSetVolume(
  volume: number
): Promise<{ success: boolean; volume: number }> {
  const clamped = Math.max(0, Math.min(100, Math.round(volume)));
  try {
    await execFileAsync("osascript", [
      "-e",
      `set volume output volume ${clamped}`,
    ]);
    return { success: true, volume: clamped };
  } catch (err: any) {
    throw {
      errorCode: ErrorCode.INTERNAL,
      message: `Failed to set volume: ${err.message}`,
    };
  }
}

export async function handleAudioSetMute(
  muted: boolean
): Promise<{ success: boolean; muted: boolean }> {
  try {
    await execFileAsync("osascript", [
      "-e",
      `set volume output muted ${muted ? "true" : "false"}`,
    ]);
    return { success: true, muted };
  } catch (err: any) {
    throw {
      errorCode: ErrorCode.INTERNAL,
      message: `Failed to set mute: ${err.message}`,
    };
  }
}
