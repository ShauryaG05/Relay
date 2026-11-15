import WebSocket from "ws";
import os from "os";
import {
  MessageType,
  EnvelopeSchema,
  CommandExecutePayloadSchema,
  ConfigSetAllowlistParamsSchema,
  createEnvelope,
} from "@relay/protocol";
import { ConfigManager } from "./config.js";
import { AgentDispatcher } from "./dispatcher.js";
import { sampleSystemStats } from "./handlers/stats.js";

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

export class AgentConnection {
  private ws: WebSocket | null = null;
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;
  private reconnectAttempt: number = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private statsTimer: NodeJS.Timeout | null = null;
  private dispatcher: AgentDispatcher;

  constructor(private configManager: ConfigManager) {
    this.dispatcher = new AgentDispatcher(configManager);
  }

  public start(): void {
    this.shouldReconnect = true;
    this.connect();
  }

  public stop(): void {
    this.shouldReconnect = false;
    this.clearTimers();
    if (this.ws) {
      this.ws.close(1000, "Agent stopped by user");
      this.ws = null;
    }
  }

  private connect(): void {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const config = this.configManager.getConfig();
      const token = this.configManager.getToken();

      // Formulate WebSocket URL
      let wsUrl = config.gatewayUrl.replace(/^http/, "ws");
      if (!wsUrl.endsWith("/ws/agent")) {
        wsUrl = `${wsUrl.replace(/\/+$/, "")}/ws/agent`;
      }
      wsUrl += `?token=${encodeURIComponent(token)}`;

      console.log(`[Agent] Connecting outbound to Gateway at ${config.gatewayUrl}...`);

      this.ws = new WebSocket(wsUrl);

      this.ws.on("open", () => {
        this.isConnecting = false;
        this.reconnectAttempt = 0;
        console.log(`[Agent] Connected and authenticated with Gateway.`);

        this.sendHello();
        this.startHeartbeat();
      });

      this.ws.on("message", async (data: WebSocket.Data) => {
        try {
          const raw = JSON.parse(data.toString());
          const envelope = EnvelopeSchema.parse(raw);
          await this.handleMessage(envelope);
        } catch (err: any) {
          console.error(`[Agent] Failed to process message from gateway:`, err);
        }
      });

      this.ws.on("close", (code, reason) => {
        this.isConnecting = false;
        this.clearTimers();
        console.warn(`[Agent] Gateway connection closed: code=${code}, reason=${reason.toString()}`);
        this.scheduleReconnect();
      });

      this.ws.on("error", (err) => {
        this.isConnecting = false;
        console.error(`[Agent] WebSocket error:`, err.message);
      });
    } catch (err: any) {
      this.isConnecting = false;
      console.error(`[Agent] Connection initialization failed:`, err.message);
      this.scheduleReconnect();
    }
  }

  private sendHello(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const config = this.configManager.getConfig();
    const token = this.configManager.getToken();

    const helloPayload = {
      token,
      agentVersion: "1.0.0",
      platform: process.platform,
      osVersion: os.release(),
      chip: os.arch(),
      hostname: os.hostname(),
      capabilities: CAPABILITIES,
      allowedFolders: config.allowedFolders,
    };

    const envelope = createEnvelope(
      MessageType.AGENT_HELLO,
      config.deviceId,
      helloPayload
    );

    this.ws.send(JSON.stringify(envelope));
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const config = this.configManager.getConfig();
        const envelope = createEnvelope(
          MessageType.AGENT_HEARTBEAT,
          config.deviceId,
          { timestamp: Date.now() }
        );
        this.ws.send(JSON.stringify(envelope));
      }
    }, 10000); // Heartbeat every 10s
  }

  private startStatsStreaming(): void {
    if (this.statsTimer) return;
    console.log(`[Agent] Starting live system stats streaming (2s interval)...`);

    this.statsTimer = setInterval(async () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          const stats = await sampleSystemStats();
          const config = this.configManager.getConfig();
          const envelope = createEnvelope(
            MessageType.AGENT_STATS,
            config.deviceId,
            stats
          );
          this.ws.send(JSON.stringify(envelope));
        } catch (err) {
          console.error(`[Agent] Error sampling system stats:`, err);
        }
      }
    }, 2000);
  }

  private stopStatsStreaming(): void {
    if (this.statsTimer) {
      console.log(`[Agent] Stopping live system stats streaming.`);
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }

  private async handleMessage(envelope: any): Promise<void> {
    const config = this.configManager.getConfig();

    switch (envelope.type) {
      case MessageType.COMMAND_EXECUTE: {
        const cmd = CommandExecutePayloadSchema.parse(envelope.payload);
        console.log(`[Agent] Executing command: ${cmd.action} (${cmd.commandId})`);

        const result = await this.dispatcher.dispatch(cmd);

        if ("success" in result && result.success) {
          const resp = createEnvelope(
            MessageType.COMMAND_RESULT,
            config.deviceId,
            result,
            envelope.id
          );
          this.ws?.send(JSON.stringify(resp));
        } else {
          const resp = createEnvelope(
            MessageType.COMMAND_ERROR,
            config.deviceId,
            result,
            envelope.id
          );
          this.ws?.send(JSON.stringify(resp));
        }
        break;
      }

      case MessageType.STATS_SUBSCRIBE: {
        this.startStatsStreaming();
        break;
      }

      case MessageType.STATS_UNSUBSCRIBE: {
        this.stopStatsStreaming();
        break;
      }

      case MessageType.CONFIG_SET_ALLOWLIST: {
        const parsed = ConfigSetAllowlistParamsSchema.parse(envelope.payload);
        this.configManager.updateAllowedFolders(parsed.allowedFolders);
        console.log(`[Agent] Updated folder allowlist:`, parsed.allowedFolders);
        break;
      }

      default:
        console.warn(`[Agent] Unknown message type: ${envelope.type}`);
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    this.reconnectAttempt++;
    // Exponential backoff: 1s, 2s, 4s, 8s ... max 30s + small jitter
    const baseDelay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempt - 1));
    const jitter = Math.floor(Math.random() * 1000);
    const delay = baseDelay + jitter;

    console.log(`[Agent] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempt})...`);
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();
    this.stopStatsStreaming();
  }
}
