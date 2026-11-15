import crypto from "crypto";
import { getCollection, PairingCodeDoc, DeviceDoc } from "./mongo.js";
import { config, hashSecret } from "../config.js";

/**
 * Generate a friendly 8-character uppercase pairing code (e.g. "ABCD-EFGH")
 */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit ambiguous O, 0, 1, I
  let result = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return `${result.slice(0, 4)}-${result.slice(4)}`;
}

export async function createPairingCode(userId: string): Promise<{ code: string; expiresAt: Date }> {
  const pairingCodes = getCollection<PairingCodeDoc>("pairingCodes");

  // Check attempt limit for user
  const recentFailures = await pairingCodes.countDocuments({
    userId,
    failedAttempts: { $gte: config.rateLimits.pairingMaxAttempts },
    expiresAt: { $gt: new Date() },
  });

  if (recentFailures > 0) {
    throw new Error("Too many failed pairing attempts. Please wait before creating a new code.");
  }

  const code = generateCode();
  const codeHash = hashSecret(code.replace(/-/g, "").toUpperCase());
  const expiresAt = new Date(Date.now() + config.pairingCodeExpirySeconds * 1000);

  const doc: PairingCodeDoc = {
    id: crypto.randomUUID(),
    userId,
    codeHash,
    expiresAt,
    failedAttempts: 0,
  };

  await pairingCodes.insertOne(doc as any);
  return { code, expiresAt };
}

export async function claimPairingCode(
  rawCode: string,
  agentInfo: {
    name?: string;
    platform: string;
    osVersion: string;
    chip: string;
    hostname: string;
    agentVersion: string;
    capabilities: string[];
    allowedFolders: string[];
  }
): Promise<{ deviceId: string; token: string }> {
  const cleanCode = rawCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const codeHash = hashSecret(cleanCode);
  const now = new Date();

  const pairingCodes = getCollection<PairingCodeDoc>("pairingCodes");

  // Atomic find and mark used
  const claimed = await pairingCodes.findOneAndUpdate(
    {
      codeHash,
      usedAt: { $exists: false },
      expiresAt: { $gt: now },
    },
    {
      $set: { usedAt: now },
    },
    { returnDocument: "after" }
  );

  if (!claimed) {
    // Increment failure attempt counter on matching or recent codes
    await pairingCodes.updateMany(
      { expiresAt: { $gt: now } },
      { $inc: { failedAttempts: 1 } }
    );
    throw new Error("Invalid or expired pairing code");
  }

  // Generate 256-bit cryptographically secure device token
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSecret(token);
  const deviceId = crypto.randomUUID();

  const devices = getCollection<DeviceDoc>("devices");
  const device: DeviceDoc = {
    id: deviceId,
    userId: claimed.userId,
    name: agentInfo.name || agentInfo.hostname || "Mac",
    platform: agentInfo.platform,
    osVersion: agentInfo.osVersion,
    chip: agentInfo.chip,
    hostname: agentInfo.hostname,
    agentVersion: agentInfo.agentVersion,
    tokenHash,
    status: "online",
    pairedAt: now,
    lastSeenAt: now,
    allowedFolders: agentInfo.allowedFolders || [],
    capabilities: agentInfo.capabilities || [],
  };

  await devices.insertOne(device as any);

  return { deviceId, token };
}
