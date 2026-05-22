import { Command } from "commander";
import { apiGet } from "../client.js";
import { getApiKey } from "../config.js";
import { outputResult } from "../output.js";

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
    .action(async (opts) => {
      const json = program.opts().json ?? false;
      const apiKey = getApiKey(program.opts().apiKey);
      const data = await apiGet<Device[]>("/devices", apiKey);
      outputResult(data, json);
    });
}
