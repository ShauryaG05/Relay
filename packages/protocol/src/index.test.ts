import { test, describe } from "node:test";
import assert from "node:assert";
import {
  isDestructiveCommand,
  getCommandTimeout,
  createEnvelope,
  MessageType,
  EnvelopeSchema,
  AgentHelloPayloadSchema,
  SystemStatsPayloadSchema,
  FilesListParamsSchema,
} from "./index.js";

describe("Protocol Package", () => {
  test("correctly flags destructive commands", () => {
    assert.strictEqual(isDestructiveCommand("power.restart"), true);
    assert.strictEqual(isDestructiveCommand("power.shutdown"), true);
    assert.strictEqual(isDestructiveCommand("process.kill"), true);
    assert.strictEqual(isDestructiveCommand("power.lock"), false);
    assert.strictEqual(isDestructiveCommand("files.list"), false);
  });

  test("returns valid timeouts", () => {
    assert.strictEqual(getCommandTimeout("power.lock"), 5000);
    assert.strictEqual(getCommandTimeout("files.download"), 30000);
    assert.strictEqual(getCommandTimeout("unknown.cmd"), 10000);
  });

  test("creates valid envelopes", () => {
    const envelope = createEnvelope(MessageType.AGENT_HEARTBEAT, "device-1", {
      status: "alive",
    });
    const parsed = EnvelopeSchema.parse(envelope);
    assert.strictEqual(parsed.deviceId, "device-1");
    assert.strictEqual(parsed.type, MessageType.AGENT_HEARTBEAT);
  });

  test("validates AgentHello schema", () => {
    const hello = {
      token: "secret-token",
      agentVersion: "1.0.0",
      platform: "darwin",
      osVersion: "15.8.1",
      chip: "x86_64",
      hostname: "test-mac",
      capabilities: ["power.lock", "files.list"],
      allowedFolders: ["/Users/test/Downloads"],
    };
    const parsed = AgentHelloPayloadSchema.parse(hello);
    assert.strictEqual(parsed.hostname, "test-mac");
  });

  test("validates SystemStats schema", () => {
    const stats = {
      cpu: { loadPercent: 12.5, cores: 8 },
      memory: {
        usedBytes: 8000000000,
        totalBytes: 16000000000,
        usedPercent: 50.0,
      },
      disk: {
        usedBytes: 100000000000,
        totalBytes: 500000000000,
        usedPercent: 20.0,
        mount: "/",
      },
      battery: {
        hasBattery: true,
        percent: 85,
        isCharging: true,
        timeRemainingMinutes: 120,
      },
      network: {
        rxBytesPerSec: 1024,
        txBytesPerSec: 2048,
      },
      uptimeSeconds: 3600,
      platform: "darwin",
      hostname: "macbook",
    };
    const parsed = SystemStatsPayloadSchema.parse(stats);
    assert.strictEqual(parsed.cpu.cores, 8);
    assert.strictEqual(parsed.battery.percent, 85);
  });

  test("validates FilesList params with default", () => {
    const parsed = FilesListParamsSchema.parse({});
    assert.strictEqual(parsed.path, "");
  });
});
