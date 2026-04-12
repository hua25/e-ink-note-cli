import { Command } from "commander";
import { apiGet } from "../client.js";
import {
  getApiKey,
  loadConfig,
  saveConfig,
  getConfigPath,
  printSuccess,
  printError,
  DeviceEntry,
} from "../config.js";

interface ApiDevice {
  deviceId: string;
  alias: string;
  board: string;
}

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Initialize enote: authenticate and select devices")
    .option("--api-key <key>", "Zectrix API key")
    .option("--select <deviceIds>", "Comma-separated device IDs to save (skip to preview devices)")
    .action(async (opts) => {
      const apiKey = getApiKey(opts.apiKey);

      // Fetch device list
      const devices = await apiGet<ApiDevice[]>("/devices", apiKey);

      if (devices.length === 0) {
        printError("No devices found on this account.");
        process.exit(1);
      }

      // Single device: auto-configure without --select
      if (devices.length === 1 && !opts.select) {
        const selected: DeviceEntry[] = [{ deviceId: devices[0].deviceId, alias: devices[0].alias }];
        const existing = loadConfig();
        saveConfig({ ...existing, api_key: apiKey, devices: selected });
        printSuccess({
          configured: true,
          config_path: getConfigPath(),
          devices: selected,
        });
        return;
      }

      // Multiple devices, no --select yet: return list for agent/user to choose
      if (!opts.select) {
        printSuccess({
          configured: false,
          message: "Multiple devices found. Re-run with --select <deviceId,...> to save configuration.",
          devices: devices.map((d) => ({ deviceId: d.deviceId, alias: d.alias })),
        });
        return;
      }

      // --select provided: validate and save
      const selectedIds = opts.select.split(",").map((s: string) => s.trim()).filter(Boolean);
      const deviceMap = new Map(devices.map((d) => [d.deviceId, d]));
      const unknown = selectedIds.filter((id: string) => !deviceMap.has(id));
      if (unknown.length > 0) {
        printError(`Unknown device ID(s): ${unknown.join(", ")}`);
        process.exit(1);
      }

      const selected: DeviceEntry[] = selectedIds.map((id: string) => ({
        deviceId: id,
        alias: deviceMap.get(id)!.alias,
      }));

      const existing = loadConfig();
      saveConfig({ ...existing, api_key: apiKey, devices: selected });

      printSuccess({
        configured: true,
        config_path: getConfigPath(),
        devices: selected,
      });
    });
}
