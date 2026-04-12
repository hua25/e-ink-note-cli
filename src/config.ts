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

export function getDefaultDevice(flagValue?: string): string | undefined {
  if (flagValue) return flagValue;
  const config = loadConfig();
  if (config.devices && config.devices.length > 0) {
    return config.devices[0].deviceId;
  }
  return undefined;
}

export function requireDefaultDevice(flagValue?: string): string {
  const deviceId = getDefaultDevice(flagValue);
  if (!deviceId) {
    printError("No device configured. Run 'enote init' to set up your devices.");
    process.exit(1);
  }
  return deviceId;
}

// ── Output helpers ──────────────────────────────────────────────────────────

export function printSuccess(data: unknown): void {
  console.log(JSON.stringify({ ok: true, data }));
}

export function printError(message: string, code?: number): void {
  console.error(JSON.stringify({ ok: false, error: message, ...(code !== undefined ? { code } : {}) }));
}
