import crypto from "crypto";
import {
  ErrorCode,
  MessageType,
  isDestructiveCommand,
  getCommandTimeout,
  CommandResultPayload,
  CommandErrorPayload,
} from "@relay/protocol";
import { PresenceManager } from "./presence.js";
import { findDeviceById } from "./db/devices.js";
import { verifyAndConsumeConfirmation } from "./db/confirmations.js";
import { createAuditEntry, updateAuditEntry } from "./db/audit.js";

interface PendingCommand {
  commandId: string;
  deviceId: string;
  action: string;
  startTime: number;
  auditId: string;
  resolve: (result: CommandResultPayload) => void;
  reject: (error: any) => void;
  timeoutTimer: NodeJS.Timeout;
}

export class CommandDispatcher {
  private static instance: CommandDispatcher;
  private pendingCommands: Map<string, PendingCommand> = new Map();
  private completedCommandIds: Set<string> = new Set();

  public static getInstance(): CommandDispatcher {
    if (!CommandDispatcher.instance) {
      CommandDispatcher.instance = new CommandDispatcher();
    }
    return CommandDispatcher.instance;
  }

  public async executeCommand(params: {
    userId: string;
    deviceId: string;
    action: string;
    commandParams?: Record<string, unknown>;
    confirmationId?: string;
    ip?: string;
    userAgent?: string;
    customCommandId?: string;
  }): Promise<CommandResultPayload> {
    const {
      userId,
      deviceId,
      action,
      commandParams = {},
      confirmationId,
      ip = "127.0.0.1",
      userAgent = "Relay",
      customCommandId,
    } = params;

    const commandId = customCommandId || crypto.randomUUID();

    // 1. De-duplication check
    if (this.completedCommandIds.has(commandId)) {
      throw {
        errorCode: ErrorCode.INVALID_PARAMS,
        message: "Command already completed",
      };
    }

    if (this.pendingCommands.has(commandId)) {
      throw {
        errorCode: ErrorCode.INVALID_PARAMS,
        message: "Command currently executing",
      };
    }

    // 2. Device verification & ownership check
    const device = await findDeviceById(deviceId);
    if (!device) {
      throw {
        errorCode: ErrorCode.INVALID_PARAMS,
        message: "Device not found",
      };
    }

    if (device.userId !== userId) {
      throw {
        errorCode: ErrorCode.NOT_OWNER,
        message: "You do not own this device",
      };
    }

    // 3. Presence check
    const presence = PresenceManager.getInstance();
    if (!presence.isDeviceOnline(deviceId)) {
      throw {
        errorCode: ErrorCode.DEVICE_OFFLINE,
        message: "Device is currently offline. Destructive actions cannot be queued.",
      };
    }

    // 4. Server-side destructive confirmation enforcement
    if (isDestructiveCommand(action)) {
      if (!confirmationId) {
        throw {
          errorCode: ErrorCode.CONFIRMATION_REQUIRED,
          message: `Action ${action} is destructive and requires confirmation.`,
        };
      }

      const valid = await verifyAndConsumeConfirmation(
        confirmationId,
        userId,
        deviceId,
        action,
        commandParams
      );

      if (!valid) {
        throw {
          errorCode: ErrorCode.CONFIRMATION_INVALID,
          message: "Confirmation is expired, invalid, or already consumed.",
        };
      }
    }

    // 5. Create pending audit entry
    const audit = await createAuditEntry({
      userId,
      deviceId,
      action,
      parameters: commandParams,
      ip,
      userAgent,
      result: "pending",
    });

    // 6. Forward to agent and wait with timeout
    const timeoutMs = getCommandTimeout(action);

    return new Promise<CommandResultPayload>((resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        this.pendingCommands.delete(commandId);
        updateAuditEntry(audit.id, {
          result: "timeout",
          errorCode: ErrorCode.TIMEOUT,
          errorMessage: `Command timed out after ${timeoutMs}ms`,
          durationMs: timeoutMs,
        }).catch(console.error);

        reject({
          errorCode: ErrorCode.TIMEOUT,
          message: `Command ${action} timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs);

      this.pendingCommands.set(commandId, {
        commandId,
        deviceId,
        action,
        startTime: Date.now(),
        auditId: audit.id,
        resolve,
        reject,
        timeoutTimer,
      });

      const sent = presence.sendToAgent(deviceId, {
        type: MessageType.COMMAND_EXECUTE,
        id: commandId,
        payload: {
          commandId,
          action,
          params: commandParams,
          confirmationId,
        },
      });

      if (!sent) {
        clearTimeout(timeoutTimer);
        this.pendingCommands.delete(commandId);
        updateAuditEntry(audit.id, {
          result: "failure",
          errorCode: ErrorCode.DEVICE_OFFLINE,
          errorMessage: "Failed to send command to agent",
        }).catch(console.error);

        reject({
          errorCode: ErrorCode.DEVICE_OFFLINE,
          message: "Failed to deliver command to agent",
        });
      }
    });
  }

  public handleAgentResult(result: CommandResultPayload): void {
    const pending = this.pendingCommands.get(result.commandId);
    if (!pending) return;

    clearTimeout(pending.timeoutTimer);
    this.pendingCommands.delete(result.commandId);
    this.completedCommandIds.add(result.commandId);

    const duration = Date.now() - pending.startTime;
    updateAuditEntry(pending.auditId, {
      result: "success",
      durationMs: duration,
    }).catch(console.error);

    pending.resolve(result);
  }

  public handleAgentError(error: CommandErrorPayload): void {
    const pending = this.pendingCommands.get(error.commandId);
    if (!pending) return;

    clearTimeout(pending.timeoutTimer);
    this.pendingCommands.delete(error.commandId);
    this.completedCommandIds.add(error.commandId);

    const duration = Date.now() - pending.startTime;
    updateAuditEntry(pending.auditId, {
      result: "failure",
      errorCode: error.errorCode,
      errorMessage: error.message,
      durationMs: duration,
    }).catch(console.error);

    pending.reject(error);
  }
}
