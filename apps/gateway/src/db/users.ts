import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getCollection, UserDoc } from "./mongo.js";
import { config } from "../config.js";

const SALT_ROUNDS = 12;

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const users = getCollection<UserDoc>("users");
  return users.findOne({ email: email.toLowerCase() });
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  const users = getCollection<UserDoc>("users");
  return users.findOne({ id });
}

export async function createUser(
  email: string,
  password?: string,
  name?: string
): Promise<UserDoc> {
  const normalizedEmail = email.toLowerCase();

  // Single-owner mode check
  if (config.singleOwnerMode && config.ownerEmails.length > 0) {
    if (!config.ownerEmails.includes(normalizedEmail)) {
      throw new Error(`Email ${normalizedEmail} is not authorized in single-owner mode`);
    }
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error(`User with email ${normalizedEmail} already exists`);
  }

  const users = getCollection<UserDoc>("users");
  const count = await users.countDocuments();
  const role: "owner" | "user" = count === 0 ? "owner" : "user";

  let passwordHash: string | undefined;
  const authMethods: Array<"password" | "google" | "passkey"> = [];

  if (password) {
    passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    authMethods.push("password");
  }

  const user: UserDoc = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0],
    role,
    status: "active",
    authMethods,
    passwordHash,
    createdAt: new Date(),
    failedLoginAttempts: 0,
  };

  await users.insertOne(user as any);
  return user;
}

export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<UserDoc> {
  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash) {
    throw new Error("Invalid email or password");
  }

  const now = new Date();
  if (user.lockoutUntil && user.lockoutUntil > now) {
    const remainingMins = Math.ceil(
      (user.lockoutUntil.getTime() - now.getTime()) / 60000
    );
    throw new Error(
      `Account is temporarily locked. Please try again in ${remainingMins} minute(s)`
    );
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  const users = getCollection<UserDoc>("users");

  if (!match) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const updates: Partial<UserDoc> = { failedLoginAttempts: attempts };

    if (attempts >= config.rateLimits.loginMaxAttempts) {
      updates.lockoutUntil = new Date(Date.now() + config.rateLimits.loginWindowMs);
      updates.failedLoginAttempts = 0;
    }

    await users.updateOne({ id: user.id }, { $set: updates });
    throw new Error("Invalid email or password");
  }

  // Reset failed attempts on success
  await users.updateOne(
    { id: user.id },
    {
      $set: {
        failedLoginAttempts: 0,
        lockoutUntil: undefined,
        lastLoginAt: new Date(),
      },
    }
  );

  return user;
}
