import crypto from "crypto";
import { getCollection, ConfirmationDoc } from "./mongo.js";
import { config, hashSecret } from "../config.js";

/**
 * Creates a canonical JSON representation to hash parameters deterministically
 */
function canonicalParamString(params: Record<string, unknown> = {}): string {
  const sortedKeys = Object.keys(params).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = params[k];
  }
  return JSON.stringify(sortedObj);
}

export async function createConfirmation(
  userId: string,
  deviceId: string,
  action: string,
  params: Record<string, unknown> = {}
): Promise<{ confirmationId: string; expiresAt: Date }> {
  const confirmations = getCollection<ConfirmationDoc>("confirmations");
  const confirmationId = crypto.randomUUID();
  const paramHash = hashSecret(canonicalParamString(params));
  const expiresAt = new Date(Date.now() + config.confirmationExpirySeconds * 1000);

  const doc: ConfirmationDoc = {
    id: confirmationId,
    userId,
    deviceId,
    action,
    paramHash,
    expiresAt,
  };

  await confirmations.insertOne(doc as any);
  return { confirmationId, expiresAt };
}

export async function verifyAndConsumeConfirmation(
  confirmationId: string,
  userId: string,
  deviceId: string,
  action: string,
  params: Record<string, unknown> = {}
): Promise<boolean> {
  const confirmations = getCollection<ConfirmationDoc>("confirmations");
  const now = new Date();
  const expectedParamHash = hashSecret(canonicalParamString(params));

  const consumed = await confirmations.findOneAndUpdate(
    {
      id: confirmationId,
      userId,
      deviceId,
      action,
      paramHash: expectedParamHash,
      usedAt: { $exists: false },
      expiresAt: { $gt: now },
    },
    {
      $set: { usedAt: now },
    },
    { returnDocument: "after" }
  );

  return !!consumed;
}
