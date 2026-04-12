import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".enote");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export interface DeviceEntry {
  deviceId: string;
  alias: string;
}

export interface Config {
  api_key: string;
  devices: DeviceEntry[];
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function loadConfig(): Partial<Config> {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as Partial<Config>;
  } catch {
    return {};
  }
}

export function saveConfig(config: Partial<Config>): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getApiKey(flagValue?: string): string {
  if (flagValue) return flagValue;
  if (process.env.ENOTE_API_KEY) return process.env.ENOTE_API_KEY;
  const config = loadConfig();
  if (config.api_key) return config.api_key;
  printError("API key not found. Set ENOTE_API_KEY env var or run 'enote init'.");
  process.exit(1);
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
    // No devices configured — honour explicit flags, otherwise empty
    return flagValues && flagValues.length > 0 ? flagValues : [];
  }

  if (configured.length === 1) {
    // Single device — flag overrides, otherwise use the only device
    return flagValues && flagValues.length > 0 ? flagValues : [configured[0].deviceId];
  }

  // Multiple devices — use flags if given, otherwise fan out to all
  if (flagValues && flagValues.length > 0) return flagValues;
  return configured.map((d) => d.deviceId);
}

export function requireDevices(flagValues?: string[]): string[] {
  const devices = resolveDevices(flagValues);
  if (devices.length === 0) {
    printError("No device configured. Run 'enote init' to set up your devices.");
    process.exit(1);
  }
  return devices;
}

// ── Output helpers ──────────────────────────────────────────────────────────

export function printSuccess(data: unknown): void {
  console.log(JSON.stringify({ ok: true, data }));
}

export function printError(message: string, code?: number): void {
  console.error(JSON.stringify({ ok: false, error: message, ...(code !== undefined ? { code } : {}) }));
}
