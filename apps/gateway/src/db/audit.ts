import crypto from "crypto";
import { getCollection, AuditLogDoc } from "./mongo.js";

/**
 * Redacts sensitive fields from audit log parameters
 */
function redactParameters(params: Record<string, unknown> = {}): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  const sensitiveKeys = new Set([
    "password",
    "token",
    "code",
    "contentBase64",
    "secret",
    "key",
  ]);

  for (const [key, value] of Object.entries(params)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactParameters(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

export async function createAuditEntry(data: {
  userId: string;
  deviceId?: string;
  action: string;
  parameters?: Record<string, unknown>;
  ip: string;
  userAgent: string;
  result?: "pending" | "success" | "failure" | "timeout";
}): Promise<AuditLogDoc> {
  const auditLogs = getCollection<AuditLogDoc>("auditLogs");
  const doc: AuditLogDoc = {
    id: crypto.randomUUID(),
    userId: data.userId,
    deviceId: data.deviceId,
    action: data.action,
    parameters: data.parameters ? redactParameters(data.parameters) : undefined,
    result: data.result || "pending",
    ip: data.ip,
    userAgent: data.userAgent,
    createdAt: new Date(),
  };

  await auditLogs.insertOne(doc as any);
  return doc;
}

export async function updateAuditEntry(
  id: string,
  update: {
    result: "success" | "failure" | "timeout";
    errorCode?: string;
    errorMessage?: string;
    durationMs?: number;
  }
): Promise<void> {
  const auditLogs = getCollection<AuditLogDoc>("auditLogs");
  await auditLogs.updateOne(
    { id },
    {
      $set: {
        result: update.result,
        errorCode: update.errorCode,
        errorMessage: update.errorMessage,
        durationMs: update.durationMs,
      },
    }
  );
}

export async function queryAuditLogs(
  userId: string,
  filter: {
    deviceId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }
): Promise<{ total: number; entries: AuditLogDoc[] }> {
  const auditLogs = getCollection<AuditLogDoc>("auditLogs");
  const query: any = { userId };

  if (filter.deviceId) {
    query.deviceId = filter.deviceId;
  }

  if (filter.action) {
    query.action = filter.action;
  }

  if (filter.startDate || filter.endDate) {
    query.createdAt = {};
    if (filter.startDate) query.createdAt.$gte = filter.startDate;
    if (filter.endDate) query.createdAt.$lte = filter.endDate;
  }

  const limit = Math.min(filter.limit || 50, 100);
  const skip = filter.skip || 0;

  const [total, entries] = await Promise.all([
    auditLogs.countDocuments(query),
    auditLogs
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  return { total, entries };
}
