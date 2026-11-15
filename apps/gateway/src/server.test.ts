import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { RateLimiter } from "./rate-limiter.js";
import { connectMongo, closeMongo, getDb } from "./db/mongo.js";
import { createUser, verifyUserCredentials } from "./db/users.js";
import { createPairingCode, claimPairingCode } from "./db/pairing.js";
import { createConfirmation, verifyAndConsumeConfirmation } from "./db/confirmations.js";
import { generateWsTicket, verifyAndConsumeWsTicket } from "./auth.js";

describe("Gateway Components & DB", () => {
  let testUserId: string;

  before(async () => {
    process.env.MONGO_DB_NAME = "relay_test_" + Date.now();
    await connectMongo();
  });

  after(async () => {
    try {
      await getDb().dropDatabase();
    } catch (e) {
      // ignore
    }
    await closeMongo();
  });

  test("RateLimiter enforces limits", () => {
    const limiter = new RateLimiter(1000, 2);
    assert.strictEqual(limiter.isAllowed("ip-1"), true);
    assert.strictEqual(limiter.isAllowed("ip-1"), true);
    assert.strictEqual(limiter.isAllowed("ip-1"), false);
    assert.strictEqual(limiter.isAllowed("ip-2"), true);
  });

  test("User registration and password verification", async () => {
    const email = `test-${Date.now()}@relay.local`;
    const user = await createUser(email, "StrongPassword123!");
    assert.strictEqual(user.email, email);
    testUserId = user.id;

    const verified = await verifyUserCredentials(email, "StrongPassword123!");
    assert.strictEqual(verified.id, user.id);

    await assert.rejects(
      async () => {
        await verifyUserCredentials(email, "WrongPassword");
      },
      { message: "Invalid email or password" }
    );
  });

  test("Pairing code creation and single-use claim", async () => {
    const { code } = await createPairingCode(testUserId);
    assert.ok(code.length >= 8);

    const agentInfo = {
      name: "Shaurya MacBook",
      platform: "darwin",
      osVersion: "15.8.1",
      chip: "x86_64",
      hostname: "Shauryas-MacBook.local",
      agentVersion: "1.0.0",
      capabilities: ["power.lock", "files.list"],
      allowedFolders: ["/Users/shaurya/Desktop"],
    };

    const claimed = await claimPairingCode(code, agentInfo);
    assert.ok(claimed.deviceId);
    assert.ok(claimed.token);

    // Second claim must fail
    await assert.rejects(
      async () => {
        await claimPairingCode(code, agentInfo);
      },
      { message: "Invalid or expired pairing code" }
    );
  });

  test("Destructive confirmation creation and single-use consumption", async () => {
    const deviceId = "dev-test-1";
    const action = "power.restart";
    const params = { reason: "maintenance" };

    const { confirmationId } = await createConfirmation(
      testUserId,
      deviceId,
      action,
      params
    );
    assert.ok(confirmationId);

    // Mismatched params should fail
    const wrongParams = await verifyAndConsumeConfirmation(
      confirmationId,
      testUserId,
      deviceId,
      action,
      { reason: "other" }
    );
    assert.strictEqual(wrongParams, false);

    // Correct consumption should succeed
    const valid = await verifyAndConsumeConfirmation(
      confirmationId,
      testUserId,
      deviceId,
      action,
      params
    );
    assert.strictEqual(valid, true);

    // Second use of same confirmation should fail
    const reused = await verifyAndConsumeConfirmation(
      confirmationId,
      testUserId,
      deviceId,
      action,
      params
    );
    assert.strictEqual(reused, false);
  });

  test("WebSocket ticket generation and single-use consumption", () => {
    const ticket = generateWsTicket(testUserId);
    const userId = verifyAndConsumeWsTicket(ticket);
    assert.strictEqual(userId, testUserId);

    // Reusing the same ticket must throw
    assert.throws(() => {
      verifyAndConsumeWsTicket(ticket);
    });
  });
});
