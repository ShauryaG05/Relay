import http from "http";
import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { config, hashSecret } from "./config.js";
import { connectMongo } from "./db/mongo.js";
import {
  createUser,
  verifyUserCredentials,
} from "./db/users.js";
import {
  listDevicesForUser,
  findDeviceById,
  findDeviceByTokenHash,
  updateDeviceCapabilities,
  updateDeviceAllowlist,
  revokeDevice,
} from "./db/devices.js";
import { createPairingCode, claimPairingCode } from "./db/pairing.js";
import { createConfirmation } from "./db/confirmations.js";
import { queryAuditLogs } from "./db/audit.js";
import {
  requireAuth,
  AuthenticatedRequest,
  generateSessionToken,
  generateWsTicket,
  verifyAndConsumeWsTicket,
} from "./auth.js";
import { PresenceManager } from "./presence.js";
import { CommandDispatcher } from "./dispatch.js";
import { RateLimiter } from "./rate-limiter.js";
import {
  MessageType,
  EnvelopeSchema,
  AgentHelloPayloadSchema,
  SystemStatsPayloadSchema,
  CommandResultPayloadSchema,
  CommandErrorPayloadSchema,
  WebCommandRequestPayloadSchema,
  createEnvelope,
} from "@relay/protocol";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const loginLimiter = new RateLimiter(config.rateLimits.loginWindowMs, config.rateLimits.loginMaxAttempts);
const pairingLimiter = new RateLimiter(config.rateLimits.pairingWindowMs, config.rateLimits.pairingMaxAttempts);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const user = await createUser(email, password, name);
    const token = generateSessionToken(user);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (!loginLimiter.isAllowed(ip)) {
    res.status(429).json({ error: "Too many login attempts. Please try again later." });
    return;
  }

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const user = await verifyUserCredentials(email, password);
    const token = generateSessionToken(user);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

app.get("/api/auth/me", requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

app.post("/api/auth/ticket", requireAuth, (req: AuthenticatedRequest, res) => {
  const ticket = generateWsTicket(req.user!.id);
  res.json({ ticket });
});

// Pairing Routes
app.post("/api/pairing/create", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await createPairingCode(req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/pairing/claim", async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (!pairingLimiter.isAllowed(ip)) {
    res.status(429).json({ error: "Too many pairing attempts. Please try again later." });
    return;
  }

  try {
    const { code, agentInfo } = req.body;
    if (!code || !agentInfo) {
      res.status(400).json({ error: "Pairing code and agentInfo are required" });
      return;
    }
    const result = await claimPairingCode(code, agentInfo);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Device Routes
app.get("/api/devices", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const devices = await listDevicesForUser(req.user!.id);
    const presence = PresenceManager.getInstance();

    const result = devices.map((d) => ({
      ...d,
      isOnline: presence.isDeviceOnline(d.id),
      tokenHash: undefined, // Redact token hash
    }));

    res.json({ devices: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/devices/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const deviceId = req.params.id as string;
    const device = await findDeviceById(deviceId);
    if (!device || device.userId !== req.user!.id || device.revokedAt) {
      res.status(404).json({ error: "Device not found" });
      return;
    }
    const presence = PresenceManager.getInstance();
    res.json({
      device: {
        ...device,
        isOnline: presence.isDeviceOnline(device.id),
        tokenHash: undefined,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/devices/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const deviceId = req.params.id as string;
    const device = await revokeDevice(deviceId, req.user!.id);
    const presence = PresenceManager.getInstance();
    const ws = presence.getAgentWs(device.id);
    if (ws) {
      ws.close(1008, "Device revoked");
      presence.unregisterAgent(device.id);
    }
    res.json({ success: true, message: "Device revoked successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/devices/:id/allowlist", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const deviceId = req.params.id as string;
    const { allowedFolders } = req.body;
    if (!Array.isArray(allowedFolders)) {
      res.status(400).json({ error: "allowedFolders must be an array of strings" });
      return;
    }

    await updateDeviceAllowlist(deviceId, req.user!.id, allowedFolders);

    // Notify agent to update its local allowedFolders
    const presence = PresenceManager.getInstance();
    presence.sendToAgent(deviceId, {
      type: MessageType.CONFIG_SET_ALLOWLIST,
      payload: { allowedFolders },
    });

    res.json({ success: true, allowedFolders });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Confirmation Route
app.post("/api/confirmations", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { deviceId, action, params } = req.body;
    if (!deviceId || !action) {
      res.status(400).json({ error: "deviceId and action are required" });
      return;
    }
    const result = await createConfirmation(req.user!.id, deviceId, action, params || {});
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Command Execution HTTP Route
app.post("/api/commands", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { deviceId, action, params, confirmationId, commandId } = req.body;
    const dispatcher = CommandDispatcher.getInstance();
    const result = await dispatcher.executeCommand({
      userId: req.user!.id,
      deviceId,
      action,
      commandParams: params,
      confirmationId,
      ip: req.ip || req.socket.remoteAddress || "127.0.0.1",
      userAgent: req.headers["user-agent"] || "Relay-Web",
      customCommandId: commandId,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({
      errorCode: err.errorCode || "INTERNAL",
      error: err.message || "Failed to execute command",
    });
  }
});

// Audit Log Route
app.get("/api/audit", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { deviceId, action, limit, skip } = req.query;
    const result = await queryAuditLogs(req.user!.id, {
      deviceId: deviceId as string | undefined,
      action: action as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      skip: skip ? parseInt(skip as string, 10) : 0,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// WebSocket Upgrade Handling
server.on("upgrade", async (req, socket, head) => {
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (pathname === "/ws/agent") {
    // Authenticate Agent via device token
    const token =
      req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
      url.searchParams.get("token");

    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const tokenHash = hashSecret(token);
    const device = await findDeviceByTokenHash(tokenHash);

    if (!device) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      handleAgentWsConnection(ws, device);
    });
  } else if (pathname === "/ws/web") {
    // Authenticate Web client via ticket
    const ticket = url.searchParams.get("ticket");
    if (!ticket) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      const userId = verifyAndConsumeWsTicket(ticket);
      wss.handleUpgrade(req, socket, head, (ws) => {
        handleWebWsConnection(ws, userId);
      });
    } catch (err) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
    }
  } else {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
  }
});

// Agent WebSocket Handler
function handleAgentWsConnection(ws: WebSocket, device: any) {
  const presence = PresenceManager.getInstance();
  const dispatcher = CommandDispatcher.getInstance();
  presence.registerAgent(device.id, device.userId, ws);

  console.log(`[AgentWS] Agent connected for device: ${device.id} (${device.name})`);

  ws.on("message", async (data: Buffer | string) => {
    try {
      const raw = JSON.parse(data.toString());
      const envelope = EnvelopeSchema.parse(raw);

      switch (envelope.type) {
        case MessageType.AGENT_HELLO: {
          const hello = AgentHelloPayloadSchema.parse(envelope.payload);
          await updateDeviceCapabilities(device.id, hello);
          console.log(`[AgentWS] Agent hello received from ${device.id}: ${hello.agentVersion}`);
          break;
        }

        case MessageType.AGENT_HEARTBEAT: {
          presence.recordHeartbeat(device.id);
          break;
        }

        case MessageType.AGENT_STATS: {
          const stats = SystemStatsPayloadSchema.parse(envelope.payload);
          presence.broadcastStats(device.id, stats);
          break;
        }

        case MessageType.COMMAND_RESULT: {
          const result = CommandResultPayloadSchema.parse(envelope.payload);
          dispatcher.handleAgentResult(result);
          break;
        }

        case MessageType.COMMAND_ERROR: {
          const error = CommandErrorPayloadSchema.parse(envelope.payload);
          dispatcher.handleAgentError(error);
          break;
        }

        default:
          console.warn(`[AgentWS] Unhandled message type: ${envelope.type}`);
      }
    } catch (err: any) {
      console.error(`[AgentWS] Message processing error:`, err);
    }
  });

  ws.on("close", () => {
    console.log(`[AgentWS] Agent disconnected: ${device.id}`);
    presence.unregisterAgent(device.id);
  });

  ws.on("error", (err) => {
    console.error(`[AgentWS] Error on agent socket ${device.id}:`, err);
    presence.unregisterAgent(device.id);
  });
}

// Web Client WebSocket Handler
function handleWebWsConnection(ws: WebSocket, userId: string) {
  const presence = PresenceManager.getInstance();
  const dispatcher = CommandDispatcher.getInstance();
  presence.registerUserSocket(userId, ws);

  console.log(`[WebWS] Web client connected for user: ${userId}`);

  ws.on("message", async (data: Buffer | string) => {
    try {
      const raw = JSON.parse(data.toString());
      const envelope = EnvelopeSchema.parse(raw);

      switch (envelope.type) {
        case MessageType.WEB_STATS_SUBSCRIBE: {
          presence.subscribeToStats(envelope.deviceId, ws);
          break;
        }

        case MessageType.WEB_STATS_UNSUBSCRIBE: {
          presence.unsubscribeFromStats(envelope.deviceId, ws);
          break;
        }

        case MessageType.COMMAND_REQUEST: {
          const cmd = WebCommandRequestPayloadSchema.parse(envelope.payload);
          try {
            const result = await dispatcher.executeCommand({
              userId,
              deviceId: cmd.deviceId,
              action: cmd.action,
              commandParams: cmd.params as Record<string, unknown>,
              confirmationId: cmd.confirmationId,
              customCommandId: cmd.commandId,
            });

            ws.send(
              JSON.stringify(
                createEnvelope(MessageType.GATEWAY_COMMAND_RESULT, cmd.deviceId, result, envelope.id)
              )
            );
          } catch (cmdErr: any) {
            ws.send(
              JSON.stringify(
                createEnvelope(
                  MessageType.GATEWAY_COMMAND_ERROR,
                  cmd.deviceId,
                  {
                    commandId: cmd.commandId,
                    action: cmd.action,
                    errorCode: cmdErr.errorCode || "INTERNAL",
                    message: cmdErr.message || "Execution error",
                  },
                  envelope.id
                )
              )
            );
          }
          break;
        }

        default:
          console.warn(`[WebWS] Unhandled message type: ${envelope.type}`);
      }
    } catch (err: any) {
      console.error(`[WebWS] Error processing message:`, err);
    }
  });

  ws.on("close", () => {
    presence.unregisterUserSocket(userId, ws);
  });

  ws.on("error", () => {
    presence.unregisterUserSocket(userId, ws);
  });
}

export async function startServer(port: number = config.port): Promise<http.Server> {
  await connectMongo();

  return new Promise((resolve) => {
    server.listen(port, config.host, () => {
      console.log(`[Gateway] Relay Gateway running at http://${config.host}:${port}`);
      resolve(server);
    });
  });
}

// Start if executed directly
if (process.argv[1]?.endsWith("server.js") || process.argv[1]?.endsWith("server.ts")) {
  startServer().catch((err) => {
    console.error("[Gateway] Fatal startup error:", err);
    process.exit(1);
  });
}
