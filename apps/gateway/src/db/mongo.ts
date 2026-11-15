import { MongoClient, Db, Collection } from "mongodb";
import { config } from "../config.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export interface UserDoc {
  id: string;
  email: string;
  name: string;
  role: "owner" | "user";
  status: "active" | "suspended";
  authMethods: Array<"password" | "google" | "passkey">;
  passwordHash?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  failedLoginAttempts?: number;
  lockoutUntil?: Date;
}

export interface DeviceDoc {
  id: string;
  userId: string;
  name: string;
  platform: string;
  osVersion: string;
  chip: string;
  agentVersion: string;
  hostname: string;
  tokenHash: string;
  status: "online" | "offline";
  lastSeenAt?: Date;
  pairedAt: Date;
  revokedAt?: Date;
  allowedFolders: string[];
  capabilities: string[];
}

export interface PairingCodeDoc {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: Date;
  usedAt?: Date;
  failedAttempts: number;
}

export interface ConfirmationDoc {
  id: string;
  userId: string;
  deviceId: string;
  action: string;
  paramHash: string;
  expiresAt: Date;
  usedAt?: Date;
}

export interface AuditLogDoc {
  id: string;
  userId: string;
  deviceId?: string;
  action: string;
  parameters?: Record<string, unknown>;
  result: "pending" | "success" | "failure" | "timeout";
  errorCode?: string;
  errorMessage?: string;
  ip: string;
  userAgent: string;
  createdAt: Date;
  durationMs?: number;
}

export async function connectMongo(): Promise<Db> {
  if (db && client) {
    return db;
  }

  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = client.db(config.mongoDbName);

  await initIndexes(db);
  console.log(`[MongoDB] Connected to database: ${config.mongoDbName}`);
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("MongoDB not connected. Call connectMongo() first.");
  }
  return db;
}

export function getCollection<T extends Document = any>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

async function initIndexes(database: Db): Promise<void> {
  // Users collection
  const users = database.collection("users");
  await users.createIndex({ email: 1 }, { unique: true });

  // Devices collection
  const devices = database.collection("devices");
  await devices.createIndex({ tokenHash: 1 }, { unique: true });
  await devices.createIndex({ userId: 1 });

  // Pairing codes collection with TTL
  const pairingCodes = database.collection("pairingCodes");
  await pairingCodes.createIndex({ codeHash: 1 });
  await pairingCodes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  // Confirmations collection with TTL
  const confirmations = database.collection("confirmations");
  await confirmations.createIndex({ id: 1 }, { unique: true });
  await confirmations.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  // Audit logs collection
  const auditLogs = database.collection("auditLogs");
  await auditLogs.createIndex({ userId: 1, createdAt: -1 });
  await auditLogs.createIndex({ deviceId: 1, createdAt: -1 });
  await auditLogs.createIndex({ createdAt: -1 });
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
