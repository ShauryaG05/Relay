#!/usr/bin/env node
import os from "os";
import { ConfigManager } from "./config.js";
import { AgentConnection } from "./connection.js";
import { LaunchdManager } from "./launchd.js";

const CAPABILITIES = [
  "power.lock",
  "power.sleep",
  "power.restart",
  "power.shutdown",
  "files.list",
  "files.download",
  "files.upload",
  "process.list",
  "process.kill",
  "audio.setVolume",
  "audio.setMute",
  "notify.show",
];

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const configManager = new ConfigManager();
  const launchd = new LaunchdManager(configManager);

  switch (command) {
    case "pair": {
      const codeIndex = 1;
      const code = args[codeIndex];
      let gatewayUrl = "http://localhost:4000";
      let name = os.hostname();

      for (let i = 2; i < args.length; i++) {
        if (args[i] === "--gateway" && args[i + 1]) {
          gatewayUrl = args[i + 1];
          i++;
        } else if (args[i] === "--name" && args[i + 1]) {
          name = args[i + 1];
          i++;
        }
      }

      if (!code) {
        console.error("Usage: relay-agent pair <PAIRING-CODE> [--gateway <URL>] [--name <DEVICE_NAME>]");
        process.exit(1);
      }

      console.log(`[Relay Agent] Pairing with Gateway at ${gatewayUrl}...`);

      const agentInfo = {
        name,
        platform: process.platform,
        osVersion: os.release(),
        chip: os.arch(),
        hostname: os.hostname(),
        agentVersion: "1.0.0",
        capabilities: CAPABILITIES,
        allowedFolders: configManager.getDefaultAllowedFolders(),
      };

      try {
        const claimUrl = `${gatewayUrl.replace(/\/+$/, "")}/api/pairing/claim`;
        const res = await fetch(claimUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, agentInfo }),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as any;
          throw new Error(errData.error || `HTTP ${res.status}: ${res.statusText}`);
        }

        const data = (await res.json()) as { deviceId: string; token: string };

        // Save token with restricted permissions (0o600)
        configManager.saveToken(data.token);

        // Save device config
        configManager.saveConfig({
          gatewayUrl,
          deviceId: data.deviceId,
          allowedFolders: agentInfo.allowedFolders,
        });

        console.log(`\n🎉 Successfully paired device!`);
        console.log(`Device ID:      ${data.deviceId}`);
        console.log(`Config saved:   ${configManager.getBaseDir()}`);
        console.log(`Allowed folders:`);
        for (const f of agentInfo.allowedFolders) {
          console.log(`  - ${f}`);
        }
        console.log(`\nTo start agent in foreground:  relay-agent start`);
        console.log(`To install as background service: relay-agent service install\n`);
      } catch (err: any) {
        console.error(`\n❌ Pairing failed: ${err.message}\n`);
        process.exit(1);
      }
      break;
    }

    case "start": {
      if (!configManager.hasConfig() || !configManager.hasToken()) {
        console.error(`Error: Device is not paired yet. Run: relay-agent pair <code> --gateway <url>`);
        process.exit(1);
      }

      const connection = new AgentConnection(configManager);
      connection.start();

      // Graceful shutdown
      process.on("SIGINT", () => {
        console.log("\n[Relay Agent] Stopping...");
        connection.stop();
        process.exit(0);
      });

      process.on("SIGTERM", () => {
        console.log("\n[Relay Agent] Terminating...");
        connection.stop();
        process.exit(0);
      });
      break;
    }

    case "service": {
      const subCommand = args[1];
      if (subCommand === "install") {
        if (!configManager.hasConfig() || !configManager.hasToken()) {
          console.error(`Error: Device is not paired yet. Please pair before installing service.`);
          process.exit(1);
        }
        await launchd.install();
        console.log(`Service installed and active. The agent will now start automatically on login.`);
      } else if (subCommand === "uninstall") {
        await launchd.uninstall();
        console.log(`Service uninstalled.`);
      } else {
        console.error(`Usage: relay-agent service [install|uninstall]`);
        process.exit(1);
      }
      break;
    }

    case "status": {
      console.log(`\n=== Relay Agent Status ===`);
      console.log(`Base directory:   ${configManager.getBaseDir()}`);
      console.log(`Paired:           ${configManager.hasConfig() && configManager.hasToken() ? "Yes" : "No"}`);
      if (configManager.hasConfig()) {
        const conf = configManager.getConfig();
        console.log(`Device ID:        ${conf.deviceId}`);
        console.log(`Gateway URL:      ${conf.gatewayUrl}`);
        console.log(`Allowed folders:`);
        for (const f of conf.allowedFolders) {
          console.log(`  - ${f}`);
        }
      }
      console.log(`LaunchAgent:      ${launchd.isInstalled() ? "Installed" : "Not installed"}\n`);
      break;
    }

    default:
      console.log(`
Relay macOS Agent

Usage:
  relay-agent pair <CODE> [--gateway <URL>] [--name <NAME>]   Pair this Mac with your Relay account
  relay-agent start                                           Run agent daemon in foreground
  relay-agent service install                                 Install auto-start LaunchAgent
  relay-agent service uninstall                               Remove auto-start LaunchAgent
  relay-agent status                                          Display current agent configuration and status
`);
      break;
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
