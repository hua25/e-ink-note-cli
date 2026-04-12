import { Command } from "commander";
import { apiGet } from "../client.js";
import { getApiKey, printSuccess } from "../config.js";

interface Device {
  deviceId: string;
  alias: string;
  board: string;
}

export function registerDevices(program: Command): void {
  const devices = program.command("devices").description("Manage e-ink devices");

  devices
    .command("list")
    .description("List all devices")
    .option("--api-key <key>", "API key override")
    .action(async (opts) => {
      const apiKey = getApiKey(opts.apiKey);
      const data = await apiGet<Device[]>("/devices", apiKey);
      printSuccess(data);
    });
}
