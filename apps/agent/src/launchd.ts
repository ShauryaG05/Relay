import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { ConfigManager } from "./config.js";

const execFileAsync = promisify(execFile);

const PLIST_LABEL = "com.relay.agent";

export class LaunchdManager {
  private plistPath: string;

  constructor(private configManager: ConfigManager) {
    const launchAgentsDir = path.join(os.homedir(), "Library", "LaunchAgents");
    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
    }
    this.plistPath = path.join(launchAgentsDir, `${PLIST_LABEL}.plist`);
  }

  public async install(): Promise<{ plistPath: string }> {
    const nodeBinary = process.execPath;
    const cliScript = path.resolve(__dirname, "cli.js");
    const logPath = path.join(this.configManager.getBaseDir(), "agent.log");

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodeBinary}</string>
    <string>${cliScript}</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${logPath}</string>
  <key>StandardErrorPath</key>
  <string>${logPath}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
`;

    fs.writeFileSync(this.plistPath, plistContent, { mode: 0o644 });

    try {
      // Unload first if previously loaded
      try {
        await execFileAsync("launchctl", ["unload", this.plistPath]);
      } catch {}

      await execFileAsync("launchctl", ["load", this.plistPath]);
      console.log(`[Launchd] Successfully installed and loaded LaunchAgent: ${this.plistPath}`);
    } catch (err: any) {
      throw new Error(`Failed to load launchd service: ${err.message}`);
    }

    return { plistPath: this.plistPath };
  }

  public async uninstall(): Promise<{ success: boolean }> {
    if (!fs.existsSync(this.plistPath)) {
      return { success: true };
    }

    try {
      try {
        await execFileAsync("launchctl", ["unload", this.plistPath]);
      } catch {}

      fs.unlinkSync(this.plistPath);
      console.log(`[Launchd] Successfully unloaded and removed LaunchAgent: ${this.plistPath}`);
      return { success: true };
    } catch (err: any) {
      throw new Error(`Failed to uninstall launchd service: ${err.message}`);
    }
  }

  public isInstalled(): boolean {
    return fs.existsSync(this.plistPath);
  }
}
