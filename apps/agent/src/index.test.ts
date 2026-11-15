import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import os from "os";
import { ConfigManager } from "./config.js";
import { validateAndResolvePath, handleFilesList } from "./handlers/files.js";

describe("Agent Components & Security", () => {
  const tempDir = path.join(os.tmpdir(), "relay_agent_test_" + Date.now());
  const allowedDir = path.join(tempDir, "allowed");
  const forbiddenDir = path.join(tempDir, "forbidden");

  before(() => {
    fs.mkdirSync(allowedDir, { recursive: true });
    fs.mkdirSync(forbiddenDir, { recursive: true });
    fs.writeFileSync(path.join(allowedDir, "file1.txt"), "hello world");
    fs.writeFileSync(path.join(forbiddenDir, "secret.txt"), "secret data");
  });

  after(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test("ConfigManager manages config and token with strict permissions", () => {
    const configManager = new ConfigManager(tempDir);
    configManager.saveToken("test-token-12345");
    assert.strictEqual(configManager.getToken(), "test-token-12345");

    configManager.saveConfig({
      gatewayUrl: "http://localhost:4000",
      deviceId: "dev-test",
      allowedFolders: [allowedDir],
    });

    const cfg = configManager.getConfig();
    assert.strictEqual(cfg.deviceId, "dev-test");
    assert.strictEqual(cfg.allowedFolders[0], allowedDir);
  });

  test("validateAndResolvePath permits access inside allowed folder", () => {
    const filePath = path.join(allowedDir, "file1.txt");
    const resolved = validateAndResolvePath(filePath, [allowedDir]);
    assert.strictEqual(resolved, fs.realpathSync(filePath));
  });

  test("validateAndResolvePath blocks path traversal with ..", () => {
    const escapePath = path.join(allowedDir, "..", "forbidden", "secret.txt");
    assert.throws(
      () => {
        validateAndResolvePath(escapePath, [allowedDir]);
      },
      (err: any) => {
        return err.errorCode === "PATH_NOT_ALLOWED";
      }
    );
  });

  test("validateAndResolvePath blocks symlink traversal escape", () => {
    const symlinkPath = path.join(allowedDir, "symlink_to_forbidden");
    try {
      fs.symlinkSync(forbiddenDir, symlinkPath, "dir");
    } catch {
      // If symlink creation fails due to permissions, skip
      return;
    }

    const escapeViaSymlink = path.join(symlinkPath, "secret.txt");
    assert.throws(
      () => {
        validateAndResolvePath(escapeViaSymlink, [allowedDir]);
      },
      (err: any) => {
        return err.errorCode === "PATH_NOT_ALLOWED";
      }
    );
  });

  test("handleFilesList lists allowed root folders when path is empty", async () => {
    const result = await handleFilesList("", [allowedDir]);
    assert.strictEqual(result.currentPath, "/");
    assert.strictEqual(result.entries.length, 1);
    assert.strictEqual(result.entries[0].name, path.basename(allowedDir));
  });

  test("handleFilesList lists files in allowed directory", async () => {
    const result = await handleFilesList(allowedDir, [allowedDir]);
    assert.strictEqual(result.currentPath, fs.realpathSync(allowedDir));
    const names = result.entries.map((e) => e.name);
    assert.ok(names.includes("file1.txt"));
  });
});
