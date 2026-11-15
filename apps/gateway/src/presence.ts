import { WebSocket } from "ws";
import { updateDevicePresence } from "./db/devices.js";
import {
  MessageType,
  createEnvelope,
  SystemStatsPayload,
} from "@relay/protocol";

export interface AgentConnection {
  deviceId: string;
  userId: string;
  ws: WebSocket;
  lastHeartbeat: number;
  heartbeatMisses: number;
  heartbeatTimer?: NodeJS.Timeout;
}

export class PresenceManager {
  private static instance: PresenceManager;
  private agents: Map<string, AgentConnection> = new Map();
  private userSockets: Map<string, Set<WebSocket>> = new Map();
  private statsSubscribers: Map<string, Set<WebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startHeartbeatWatcher();
  }

  public static getInstance(): PresenceManager {
    if (!PresenceManager.instance) {
      PresenceManager.instance = new PresenceManager();
    }
    return PresenceManager.instance;
  }

  public registerAgent(
    deviceId: string,
    userId: string,
    ws: WebSocket
  ): AgentConnection {
    // If existing connection exists, close it cleanly
    const existing = this.agents.get(deviceId);
    if (existing && existing.ws !== ws) {
      existing.ws.close(1000, "Superseded by new agent connection");
    }

    const conn: AgentConnection = {
      deviceId,
      userId,
      ws,
      lastHeartbeat: Date.now(),
      heartbeatMisses: 0,
    };

    this.agents.set(deviceId, conn);
    updateDevicePresence(deviceId, "online").catch(console.error);

    // Notify connected web browsers of device status
    this.broadcastDeviceStatus(userId, deviceId, "online");

    // If there are already active stats subscribers for this device, tell agent to start streaming
    const subscribers = this.statsSubscribers.get(deviceId);
    if (subscribers && subscribers.size > 0) {
      this.sendToAgent(deviceId, {
        type: MessageType.STATS_SUBSCRIBE,
        payload: {},
      });
    }

    return conn;
  }

  public unregisterAgent(deviceId: string): void {
    const conn = this.agents.get(deviceId);
    if (conn) {
      this.agents.delete(deviceId);
      updateDevicePresence(deviceId, "offline").catch(console.error);
      this.broadcastDeviceStatus(conn.userId, deviceId, "offline");
    }
  }

  public recordHeartbeat(deviceId: string): void {
    const conn = this.agents.get(deviceId);
    if (conn) {
      conn.lastHeartbeat = Date.now();
      conn.heartbeatMisses = 0;
    }
  }

  public isDeviceOnline(deviceId: string): boolean {
    const conn = this.agents.get(deviceId);
    return !!conn && conn.ws.readyState === WebSocket.OPEN;
  }

  public getAgentWs(deviceId: string): WebSocket | null {
    const conn = this.agents.get(deviceId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      return conn.ws;
    }
    return null;
  }

  public registerUserSocket(userId: string, ws: WebSocket): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(ws);
  }

  public unregisterUserSocket(userId: string, ws: WebSocket): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Unsubscribe from any device stats
    for (const [deviceId, subscribers] of this.statsSubscribers.entries()) {
      if (subscribers.has(ws)) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          // Tell agent to stop streaming stats since no one is viewing
          this.sendToAgent(deviceId, {
            type: MessageType.STATS_UNSUBSCRIBE,
            payload: {},
          });
        }
      }
    }
  }

  public subscribeToStats(deviceId: string, ws: WebSocket): void {
    if (!this.statsSubscribers.has(deviceId)) {
      this.statsSubscribers.set(deviceId, new Set());
    }
    const set = this.statsSubscribers.get(deviceId)!;
    const wasEmpty = set.size === 0;
    set.add(ws);

    if (wasEmpty && this.isDeviceOnline(deviceId)) {
      this.sendToAgent(deviceId, {
        type: MessageType.STATS_SUBSCRIBE,
        payload: {},
      });
    }
  }

  public unsubscribeFromStats(deviceId: string, ws: WebSocket): void {
    const set = this.statsSubscribers.get(deviceId);
    if (set && set.has(ws)) {
      set.delete(ws);
      if (set.size === 0) {
        this.sendToAgent(deviceId, {
          type: MessageType.STATS_UNSUBSCRIBE,
          payload: {},
        });
      }
    }
  }

  public broadcastStats(deviceId: string, stats: SystemStatsPayload): void {
    const subscribers = this.statsSubscribers.get(deviceId);
    if (!subscribers || subscribers.size === 0) return;

    const envelope = createEnvelope(MessageType.DEVICE_STATS, deviceId, stats);
    const data = JSON.stringify(envelope);

    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  public broadcastDeviceStatus(
    userId: string,
    deviceId: string,
    status: "online" | "offline"
  ): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;

    const envelope = createEnvelope(MessageType.DEVICE_STATUS, deviceId, {
      deviceId,
      status,
      timestamp: Date.now(),
    });
    const data = JSON.stringify(envelope);

    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  public sendToAgent(
    deviceId: string,
    message: { type: string; payload: unknown; id?: string }
  ): boolean {
    const ws = this.getAgentWs(deviceId);
    if (!ws) return false;

    const envelope = createEnvelope(
      message.type,
      deviceId,
      message.payload,
      message.id
    );
    ws.send(JSON.stringify(envelope));
    return true;
  }

  private startHeartbeatWatcher(): void {
    // Check every 10s: 3 missed heartbeats = offline
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [deviceId, conn] of this.agents.entries()) {
        if (now - conn.lastHeartbeat > 30000) {
          console.warn(`[Presence] Agent ${deviceId} missed 3 heartbeats. Marking offline.`);
          conn.ws.close(1001, "Heartbeat timeout");
          this.unregisterAgent(deviceId);
        }
      }
    }, 10000);
  }

  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
