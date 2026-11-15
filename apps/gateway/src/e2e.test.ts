import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import http from "http";
import WebSocket from "ws";
import { startServer } from "./server.js";
import { createUser } from "./db/users.js";
import { createPairingCode, claimPairingCode } from "./db/pairing.js";
import { createConfirmation } from "./db/confirmations.js";
import { CommandDispatcher } from "./dispatch.js";
import { PresenceManager } from "./presence.js";
import {
  MessageType,
  createEnvelope,
  EnvelopeSchema,
  ErrorCode,
} from "@relay/protocol";

describe("End-to-End Relay Pipeline", () => {
  let server: http.Server;
  let testUserId: string;
  let deviceId: string;
  let deviceToken: string;
  let agentWs: WebSocket;

  before(async () => {
    process.env.MONGO_DB_NAME = "relay_e2e_" + Date.now();
    server = await startServer(4999);

    // Create user
    const user = await createUser("e2e-user@relay.local", "Password123!");
    testUserId = user.id;

    // Create pairing code
    const { code } = await createPairingCode(testUserId);

    // Agent claims code
    const claim = await claimPairingCode(code, {
      name: "E2E Mac",
      platform: "darwin",
      osVersion: "15.8.1",
      chip: "x86_64",
      hostname: "E2E-Mac.local",
      agentVersion: "1.0.0",
      capabilities: ["power.restart", "files.list"],
      allowedFolders: ["/tmp"],
    });

    deviceId = claim.deviceId;
    deviceToken = claim.token;
  });

  after(async () => {
    if (agentWs) agentWs.close();
    PresenceManager.getInstance().cleanup();
    if (server) {
      await new Promise<void>((res) => server.close(() => res()));
    }
  });

  test("Agent connects over WebSocket and marks device online", async () => {
    const wsUrl = `ws://127.0.0.1:4999/ws/agent?token=${deviceToken}`;
    agentWs = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      agentWs.on("open", resolve);
      agentWs.on("error", reject);
    });

    // Send hello
    const hello = createEnvelope(MessageType.AGENT_HELLO, deviceId, {
      token: deviceToken,
      agentVersion: "1.0.0",
      platform: "darwin",
      osVersion: "15.8.1",
      chip: "x86_64",
      hostname: "E2E-Mac.local",
      capabilities: ["power.restart", "files.list"],
      allowedFolders: ["/tmp"],
    });
    agentWs.send(JSON.stringify(hello));

    // Wait a brief moment for registration
    await new Promise((r) => setTimeout(r, 100));

    const presence = PresenceManager.getInstance();
    assert.strictEqual(presence.isDeviceOnline(deviceId), true);
  });

  test("Dispatcher rejects destructive command without confirmation", async () => {
    const dispatcher = CommandDispatcher.getInstance();

    await assert.rejects(
      async () => {
        await dispatcher.executeCommand({
          userId: testUserId,
          deviceId,
          action: "power.restart",
          commandParams: { reason: "test" },
        });
      },
      (err: any) => {
        return err.errorCode === ErrorCode.CONFIRMATION_REQUIRED;
      }
    );
  });

  test("Dispatcher executes command and receives agent result", async () => {
    const dispatcher = CommandDispatcher.getInstance();

    // Listen on agentWs for the command and respond
    agentWs.on("message", (raw) => {
      const env = EnvelopeSchema.parse(JSON.parse(raw.toString()));
      if (env.type === MessageType.COMMAND_EXECUTE) {
        const payload = env.payload as any;
        const result = createEnvelope(MessageType.COMMAND_RESULT, deviceId, {
          commandId: payload.commandId,
          action: payload.action,
          success: true,
          data: { status: "simulated-success" },
          executionTimeMs: 12,
        });
        agentWs.send(JSON.stringify(result));
      }
    });

    // Create confirmation for power.restart
    const params = { reason: "test" };
    const { confirmationId } = await createConfirmation(
      testUserId,
      deviceId,
      "power.restart",
      params
    );

    const result = await dispatcher.executeCommand({
      userId: testUserId,
      deviceId,
      action: "power.restart",
      commandParams: params,
      confirmationId,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual((result.data as any).status, "simulated-success");
  });
});
