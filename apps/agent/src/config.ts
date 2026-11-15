import fs from "fs";
import path from "path";
import os from "os";

export interface AgentConfig {
  gatewayUrl: string;
  deviceId: string;
  allowedFolders: string[];
}

export class ConfigManager {
  private baseDir: string;
  private configPath: string;
  private tokenPath: string;

  constructor(customDir?: string) {
    this.baseDir =
      customDir ||
      process.env.RELAY_AGENT_DIR ||
      path.join(os.homedir(), ".config", "relay-agent");
    this.configPath = path.join(this.baseDir, "config.json");
    this.tokenPath = path.join(this.baseDir, "token");
  }

  public ensureDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true, mode: 0o700 });
    }
  }

  public hasToken(): boolean {
    return fs.existsSync(this.tokenPath);
  }

  public getToken(): string {
    if (!this.hasToken()) {
      throw new Error(`Device token not found at ${this.tokenPath}. Please pair first.`);
    }
    return fs.readFileSync(this.tokenPath, "utf-8").trim();
  }

  public saveToken(token: string): void {
    this.ensureDir();
    fs.writeFileSync(this.tokenPath, token.trim(), { mode: 0o600 });
  }

  public hasConfig(): boolean {
    return fs.existsSync(this.configPath);
  }

  public getConfig(): AgentConfig {
    if (!this.hasConfig()) {
      throw new Error(`Agent config not found at ${this.configPath}. Please pair first.`);
    }
    const raw = fs.readFileSync(this.configPath, "utf-8");
    return JSON.parse(raw);
  }

  public saveConfig(config: AgentConfig): void {
    this.ensureDir();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  }

  public updateAllowedFolders(folders: string[]): void {
    const current = this.getConfig();
    current.allowedFolders = folders;
    this.saveConfig(current);
  }

  public getDefaultAllowedFolders(): string[] {
    const home = os.homedir();
    return [
      path.join(home, "Desktop"),
      path.join(home, "Documents"),
      path.join(home, "Downloads"),
    ].filter((f) => fs.existsSync(f));
  }

  public getBaseDir(): string {
    return this.baseDir;
  }
}
