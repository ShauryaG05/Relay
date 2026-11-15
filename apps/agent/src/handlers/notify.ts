import { execFile } from "child_process";
import { promisify } from "util";
import { ErrorCode } from "@relay/protocol";

const execFileAsync = promisify(execFile);

export async function handleNotifyShow(
  title: string,
  message: string
): Promise<{ success: boolean }> {
  // Sanitize strings for AppleScript
  const cleanTitle = title.replace(/"/g, '\\"');
  const cleanMessage = message.replace(/"/g, '\\"');

  try {
    await execFileAsync("osascript", [
      "-e",
      `display notification "${cleanMessage}" with title "${cleanTitle}"`,
    ]);
    return { success: true };
  } catch (err: any) {
    throw {
      errorCode: ErrorCode.INTERNAL,
      message: `Failed to show notification: ${err.message}`,
    };
  }
}
