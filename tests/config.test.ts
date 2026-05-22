import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  __setConfigPaths,
  loadConfig,
  saveConfig,
  getConfigPath,
  getApiKey,
  resolveDevices,
  requireDevices,
  Config,
} from "../src/config.js";

const testDir = path.join(os.tmpdir(), `enote-test-${Date.now()}`);
const testConfigDir = path.join(testDir, ".enote");
const testConfigFile = path.join(testConfigDir, "config.json");

beforeEach(() => {
  fs.mkdirSync(testConfigDir, { recursive: true });
  __setConfigPaths(testConfigDir, testConfigFile);
  delete process.env.ENOTE_API_KEY;
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
  delete process.env.ENOTE_API_KEY;
});

function writeConfig(config: Partial<Config>): void {
  fs.mkdirSync(testConfigDir, { recursive: true });
  fs.writeFileSync(testConfigFile, JSON.stringify(config));
}

describe("loadConfig", () => {
  it("returns empty object when no config file exists", () => {
    const config = loadConfig();
    expect(config).toEqual({});
  });

  it("returns parsed config when file exists", () => {
    writeConfig({ api_key: "test-key" });
    const config = loadConfig();
    expect(config.api_key).toBe("test-key");
  });

  it("warns and returns empty object on corrupted JSON", () => {
    fs.writeFileSync(testConfigFile, "{invalid json");
    const config = loadConfig();
    expect(config).toEqual({});
  });
});

describe("saveConfig", () => {
  it("writes config and sets restrictive permissions", () => {
    saveConfig({ api_key: "saved-key" });
    const raw = fs.readFileSync(testConfigFile, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.api_key).toBe("saved-key");

    const stat = fs.statSync(testConfigFile);
    // 0o600 = owner rw only
    expect(stat.mode & 0o777).toBe(0o600);
  });
});

describe("getApiKey", () => {
  it("returns flag value when provided", () => {
    const key = getApiKey("flag-key");
    expect(key).toBe("flag-key");
  });

  it("returns env var when no flag and no config", () => {
    process.env.ENOTE_API_KEY = "env-key";
    const key = getApiKey();
    expect(key).toBe("env-key");
  });

  it("returns config value when no flag and no env var", () => {
    writeConfig({ api_key: "config-key" });
    const key = getApiKey();
    expect(key).toBe("config-key");
  });

  it("prioritizes flag over env var and config", () => {
    process.env.ENOTE_API_KEY = "env-key";
    writeConfig({ api_key: "config-key" });
    const key = getApiKey("flag-key");
    expect(key).toBe("flag-key");
  });

  it("prioritizes env var over config", () => {
    process.env.ENOTE_API_KEY = "env-key";
    writeConfig({ api_key: "config-key" });
    const key = getApiKey();
    expect(key).toBe("env-key");
  });

  it("throws when no source provides an API key", () => {
    expect(() => getApiKey()).toThrow("API key not found");
  });
});

describe("resolveDevices", () => {
  it("returns empty when no config and no flags", () => {
    const devices = resolveDevices();
    expect(devices).toEqual([]);
  });

  it("returns flags when no config exists", () => {
    const devices = resolveDevices(["dev-a", "dev-b"]);
    expect(devices).toEqual(["dev-a", "dev-b"]);
  });

  it("returns single configured device when no flags", () => {
    writeConfig({
      api_key: "k",
      devices: [{ deviceId: "only-device", alias: "Test" }],
    });
    const devices = resolveDevices();
    expect(devices).toEqual(["only-device"]);
  });

  it("flags override single configured device", () => {
    writeConfig({
      api_key: "k",
      devices: [{ deviceId: "only-device", alias: "Test" }],
    });
    const devices = resolveDevices(["override-device"]);
    expect(devices).toEqual(["override-device"]);
  });

  it("returns all configured devices when multiple and no flags", () => {
    writeConfig({
      api_key: "k",
      devices: [
        { deviceId: "dev-1", alias: "A" },
        { deviceId: "dev-2", alias: "B" },
      ],
    });
    const devices = resolveDevices();
    expect(devices).toEqual(["dev-1", "dev-2"]);
  });

  it("flags override when multiple devices configured", () => {
    writeConfig({
      api_key: "k",
      devices: [
        { deviceId: "dev-1", alias: "A" },
        { deviceId: "dev-2", alias: "B" },
      ],
    });
    const devices = resolveDevices(["override-device"]);
    expect(devices).toEqual(["override-device"]);
  });
});

describe("requireDevices", () => {
  it("returns flag values", () => {
    const devices = requireDevices(["d1"]);
    expect(devices).toEqual(["d1"]);
  });

  it("throws when no devices available", () => {
    expect(() => requireDevices()).toThrow("No device configured");
  });

  it("returns configured devices when no flags", () => {
    writeConfig({
      api_key: "k",
      devices: [{ deviceId: "dev-1", alias: "A" }],
    });
    const devices = requireDevices();
    expect(devices).toEqual(["dev-1"]);
  });
});

describe("getConfigPath", () => {
  it("returns the config file path", () => {
    expect(getConfigPath()).toBe(testConfigFile);
  });
});
