import { z } from "zod";

export const PROTOCOL_VERSION = "1.0.0";

/**
 * Standard protocol error codes
 */
export const ErrorCode = {
  DEVICE_OFFLINE: "DEVICE_OFFLINE",
  NOT_OWNER: "NOT_OWNER",
  INVALID_PARAMS: "INVALID_PARAMS",
  CONFIRMATION_REQUIRED: "CONFIRMATION_REQUIRED",
  CONFIRMATION_INVALID: "CONFIRMATION_INVALID",
  PATH_NOT_ALLOWED: "PATH_NOT_ALLOWED",
  PERMISSION_MISSING: "PERMISSION_MISSING",
  UNSUPPORTED: "UNSUPPORTED",
  TIMEOUT: "TIMEOUT",
  TOO_LARGE: "TOO_LARGE",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Message Types exchanged across Gateway, Agent, and Web clients
 */
export const MessageType = {
  // Agent -> Gateway
  AGENT_HELLO: "agent.hello",
  AGENT_HEARTBEAT: "agent.heartbeat",
  AGENT_STATS: "agent.stats",
  COMMAND_RESULT: "command.result",
  COMMAND_ERROR: "command.error",
  FILE_CHUNK: "file.chunk",
  FILE_END: "file.end",

  // Gateway -> Agent
  COMMAND_EXECUTE: "command.execute",
  COMMAND_CANCEL: "command.cancel",
  STATS_SUBSCRIBE: "stats.subscribe",
  STATS_UNSUBSCRIBE: "stats.unsubscribe",
  CONFIG_SET_ALLOWLIST: "config.setAllowlist",

  // Web Client -> Gateway
  WEB_AUTH: "web.auth",
  COMMAND_REQUEST: "command.request",
  WEB_STATS_SUBSCRIBE: "web.stats.subscribe",
  WEB_STATS_UNSUBSCRIBE: "web.stats.unsubscribe",

  // Gateway -> Web Client
  DEVICE_STATUS: "device.status",
  DEVICE_STATS: "device.stats",
  GATEWAY_COMMAND_RESULT: "gateway.command.result",
  GATEWAY_COMMAND_ERROR: "gateway.command.error",
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

/**
 * Envelope Schema - Standard wrapper for all protocol messages
 */
export const EnvelopeSchema = z.object({
  version: z.string().default(PROTOCOL_VERSION),
  type: z.string(),
  id: z.string().min(1),
  deviceId: z.string(),
  timestamp: z.number().int().positive(),
  payload: z.unknown(),
});

export type Envelope<T = unknown> = {
  version: string;
  type: string;
  id: string;
  deviceId: string;
  timestamp: number;
  payload: T;
};

/**
 * Destructive command definitions
 */
export const DESTRUCTIVE_COMMANDS = new Set([
  "power.restart",
  "power.shutdown",
  "process.kill",
]);

export function isDestructiveCommand(action: string): boolean {
  return DESTRUCTIVE_COMMANDS.has(action);
}

/**
 * Default command timeouts in milliseconds
 */
export const COMMAND_TIMEOUTS: Record<string, number> = {
  "power.lock": 5000,
  "power.sleep": 5000,
  "power.restart": 10000,
  "power.shutdown": 10000,
  "files.list": 8000,
  "files.download": 30000,
  "files.upload": 30000,
  "config.setAllowlist": 5000,
  "process.list": 8000,
  "process.kill": 5000,
  "screen.capture": 10000,
  "audio.setVolume": 4000,
  "audio.setMute": 4000,
  "notify.show": 4000,
};

export function getCommandTimeout(action: string): number {
  return COMMAND_TIMEOUTS[action] ?? 10000;
}

/**
 * Agent Hello Payload Schema
 */
export const AgentHelloPayloadSchema = z.object({
  token: z.string().min(1),
  agentVersion: z.string().min(1),
  platform: z.string(),
  osVersion: z.string(),
  chip: z.string(),
  hostname: z.string(),
  capabilities: z.array(z.string()),
  allowedFolders: z.array(z.string()),
});

export type AgentHelloPayload = z.infer<typeof AgentHelloPayloadSchema>;

/**
 * System Stats Payload Schema
 */
export const SystemStatsPayloadSchema = z.object({
  cpu: z.object({
    loadPercent: z.number().min(0).max(100),
    cores: z.number().int().positive(),
  }),
  memory: z.object({
    usedBytes: z.number().nonnegative(),
    totalBytes: z.number().positive(),
    usedPercent: z.number().min(0).max(100),
  }),
  disk: z.object({
    usedBytes: z.number().nonnegative(),
    totalBytes: z.number().positive(),
    usedPercent: z.number().min(0).max(100),
    mount: z.string(),
  }),
  battery: z.object({
    hasBattery: z.boolean(),
    percent: z.number().min(0).max(100).nullable(),
    isCharging: z.boolean().nullable(),
    timeRemainingMinutes: z.number().nullable(),
  }),
  network: z.object({
    rxBytesPerSec: z.number().nonnegative(),
    txBytesPerSec: z.number().nonnegative(),
  }),
  uptimeSeconds: z.number().nonnegative(),
  platform: z.string(),
  hostname: z.string(),
});

export type SystemStatsPayload = z.infer<typeof SystemStatsPayloadSchema>;

/**
 * File Browser Schemas
 */
export const FileEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDirectory: z.boolean(),
  size: z.number().nonnegative(),
  modifiedAt: z.number(),
});

export type FileEntry = z.infer<typeof FileEntrySchema>;

export const FileListResultSchema = z.object({
  currentPath: z.string(),
  parentPath: z.string().nullable(),
  entries: z.array(FileEntrySchema),
});

export type FileListResult = z.infer<typeof FileListResultSchema>;

/**
 * Command Parameter Schemas
 */
export const FilesListParamsSchema = z.object({
  path: z.string().default(""),
});

export const FilesDownloadParamsSchema = z.object({
  path: z.string().min(1),
});

export const FilesUploadParamsSchema = z.object({
  path: z.string().min(1),
  contentBase64: z.string(),
  overwrite: z.boolean().default(false),
});

export const ConfigSetAllowlistParamsSchema = z.object({
  allowedFolders: z.array(z.string()),
});

export const ProcessKillParamsSchema = z.object({
  pid: z.number().int().positive(),
  signal: z.string().default("SIGTERM"),
});

export const AudioSetVolumeParamsSchema = z.object({
  volume: z.number().int().min(0).max(100),
});

export const AudioSetMuteParamsSchema = z.object({
  muted: z.boolean(),
});

export const NotifyShowParamsSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
});

/**
 * Command Execution Payload (Gateway -> Agent)
 */
export const CommandExecutePayloadSchema = z.object({
  commandId: z.string().min(1),
  action: z.string().min(1),
  params: z.record(z.unknown()).default({}),
  confirmationId: z.string().optional(),
});

export type CommandExecutePayload = z.infer<typeof CommandExecutePayloadSchema>;

/**
 * Command Result Payload (Agent -> Gateway -> Web)
 */
export const CommandResultPayloadSchema = z.object({
  commandId: z.string().min(1),
  action: z.string().min(1),
  success: z.boolean(),
  data: z.unknown().optional(),
  executionTimeMs: z.number().nonnegative().optional(),
});

export type CommandResultPayload = z.infer<typeof CommandResultPayloadSchema>;

/**
 * Command Error Payload
 */
export const CommandErrorPayloadSchema = z.object({
  commandId: z.string().min(1),
  action: z.string().min(1),
  errorCode: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type CommandErrorPayload = z.infer<typeof CommandErrorPayloadSchema>;

/**
 * Web Client Command Request
 */
export const WebCommandRequestPayloadSchema = z.object({
  commandId: z.string().min(1),
  deviceId: z.string().min(1),
  action: z.string().min(1),
  params: z.record(z.unknown()).default({}),
  confirmationId: z.string().optional(),
});

export type WebCommandRequestPayload = z.infer<typeof WebCommandRequestPayloadSchema>;

/**
 * Helper to construct a typed message envelope
 */
export function createEnvelope<T>(
  type: string,
  deviceId: string,
  payload: T,
  id: string = crypto.randomUUID(),
  timestamp: number = Date.now()
): Envelope<T> {
  return {
    version: PROTOCOL_VERSION,
    type,
    id,
    deviceId,
    timestamp,
    payload,
  };
}

/**
 * Helper to construct an error envelope
 */
export function createErrorEnvelope(
  deviceId: string,
  commandId: string,
  action: string,
  errorCode: ErrorCodeType | string,
  message: string,
  details?: unknown
): Envelope<CommandErrorPayload> {
  return createEnvelope<CommandErrorPayload>(
    MessageType.COMMAND_ERROR,
    deviceId,
    {
      commandId,
      action,
      errorCode,
      message,
      details,
    }
  );
}
