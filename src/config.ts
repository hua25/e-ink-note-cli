import fs from "fs";
import path from "path";
import os from "os";
import { ConfigError } from "./errors.js";

const CONFIG_DIR = path.join(os.homedir(), ".enote");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

// Allow tests to override config paths
let _configFile = CONFIG_FILE;
let _configDir = CONFIG_DIR;

export function __setConfigPaths(dir: string, file: string): void {
  _configDir = dir;
  _configFile = file;
}

export interface DeviceEntry {
  deviceId: string;
  alias: string;
}

export interface Config {
  api_key: string;
  devices: DeviceEntry[];
}

export function getConfigPath(): string {
  return _configFile;
}

export function loadConfig(): Partial<Config> {
  if (!fs.existsSync(_configFile)) return {};
  try {
    const raw = fs.readFileSync(_configFile, "utf-8");
    return JSON.parse(raw) as Partial<Config>;
  } catch {
    console.error(`Warning: ${_configFile} is corrupted, ignoring.`);
    return {};
  }
}

export function saveConfig(config: Partial<Config>): void {
  if (!fs.existsSync(_configDir)) {
    fs.mkdirSync(_configDir, { recursive: true });
  }
  fs.writeFileSync(_configFile, JSON.stringify(config, null, 2), "utf-8");
  fs.chmodSync(_configFile, 0o600);
}

export function getApiKey(flagValue?: string): string {
  if (flagValue) return flagValue;
  if (process.env.ENOTE_API_KEY) return process.env.ENOTE_API_KEY;
  const config = loadConfig();
  if (config.api_key) return config.api_key;
  throw new ConfigError(
    "API key not found. Set ENOTE_API_KEY env var or run 'enote init'.",
  );
}

/**
 * Resolve target device IDs based on config and optional CLI flags.
 *
 * Rules:
 *  - 0 devices in config → return [] (caller decides if that's OK)
 *  - 1 device in config  → return that device (flag overrides it)
 *  - N devices in config → return flagValues if provided, else all devices
 */
export function resolveDevices(flagValues?: string[]): string[] {
  const config = loadConfig();
  const configured = config.devices ?? [];

  if (configured.length === 0) {
    return flagValues && flagValues.length > 0 ? flagValues : [];
  }

  if (configured.length === 1) {
    return flagValues && flagValues.length > 0 ? flagValues : [configured[0].deviceId];
  }

  if (flagValues && flagValues.length > 0) return flagValues;
  return configured.map((d) => d.deviceId);
}

export function requireDevices(flagValues?: string[]): string[] {
  const devices = resolveDevices(flagValues);
  if (devices.length === 0) {
    throw new ConfigError("No device configured. Run 'enote init' to set up your devices.");
  }
  return devices;
}

// ── Output helpers (for JSON mode / backward compat) ─────────────────────────

export function printSuccess(data: unknown): void {
  console.log(JSON.stringify({ ok: true, data }));
}
