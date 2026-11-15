import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

export const config = {
  port: parseInt(process.env.GATEWAY_PORT || process.env.PORT || "4000", 10),
  host: process.env.GATEWAY_HOST || "0.0.0.0",
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017",
  mongoDbName: process.env.MONGO_DB_NAME || "relay",
  jwtSecret: process.env.JWT_SECRET || "relay-jwt-dev-secret-key-min-32-chars-long",
  ticketSecret: process.env.TICKET_SECRET || "relay-ticket-dev-secret-key-32-chars",
  ownerEmails: (process.env.OWNER_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  singleOwnerMode: process.env.SINGLE_OWNER_MODE !== "false", // default true for v1
  pairingCodeExpirySeconds: 600, // 10 minutes
  confirmationExpirySeconds: 30, // 30 seconds
  ticketExpirySeconds: 60, // 1 minute
  rateLimits: {
    loginWindowMs: 15 * 60 * 1000,
    loginMaxAttempts: 5,
    pairingWindowMs: 15 * 60 * 1000,
    pairingMaxAttempts: 5,
  },
};

/**
 * SHA-256 hash helper for tokens and codes
 */
export function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}
