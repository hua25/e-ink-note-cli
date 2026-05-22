import fs from "fs";
import path from "path";
import { Command } from "commander";
import { apiPost, apiPostForm, apiDelete } from "../client.js";
import { getApiKey, requireDevices } from "../config.js";
import { outputResult, printError } from "../output.js";
import { fanOut } from "../utils.js";
import type { TextDisplayRequest, StructuredTextRequest } from "../types.js";

interface DisplayResult {
  totalPages: number;
  pushedPages: number;
  pageId?: string;
}

export function registerDisplay(program: Command): void {
  const display = program.command("display").description("Push content to e-ink display");

  // text
  display
    .command("text")
    .description("Push plain text to device display")
    .requiredOption("--text <content>", "Text content (max 5000 chars)")
    .option("--device <deviceId...>", "Target device ID (repeatable; defaults to all configured devices)")
    .option("--font-size <12-48>", "Font size (default 20)")
    .option("--page <1-5>", "Page slot (persists when specified)")
    .action(async (opts) => {
      const json = program.opts().json ?? false;
      const apiKey = getApiKey(program.opts().apiKey);
      const deviceIds = requireDevices(opts.device);
      if (opts.text.length > 5000) {
        printError("Text exceeds 5000 character limit.", undefined, json);
        process.exit(1);
      }
      const body: TextDisplayRequest = { text: opts.text };
      if (opts.fontSize) body.fontSize = Number(opts.fontSize);
      if (opts.page) body.pageId = opts.page;
      const { success, failed } = await fanOut(deviceIds, (deviceId) =>
        apiPost<DisplayResult>(`/devices/${deviceId}/display/text`, apiKey, body),
      );
      outputResult(
        deviceIds.length === 1 ? (success[deviceIds[0]] ?? failed[deviceIds[0]]) : { success, failed },
        json,
      );
    });

  // structured
  display
    .command("structured")
    .description("Push structured text (title + body) to device display")
    .option("--device <deviceId...>", "Target device ID (repeatable; defaults to all configured devices)")
    .option("--title <text>", "Title (max 200 chars)")
    .option("--body <text>", "Body text (max 5000 chars)")
    .option("--page <1-5>", "Page slot (persists when specified)")
    .action(async (opts) => {
      const json = program.opts().json ?? false;
      const apiKey = getApiKey(program.opts().apiKey);
      const deviceIds = requireDevices(opts.device);
      if (!opts.title && !opts.body) {
        printError("At least one of --title or --body is required.", undefined, json);
        process.exit(1);
      }
      if (opts.title && opts.title.length > 200) {
        printError("Title exceeds 200 character limit.", undefined, json);
        process.exit(1);
      }
      if (opts.body && opts.body.length > 5000) {
        printError("Body exceeds 5000 character limit.", undefined, json);
        process.exit(1);
      }
      const body: StructuredTextRequest = {};
      if (opts.title) body.title = opts.title;
      if (opts.body) body.body = opts.body;
      if (opts.page) body.pageId = opts.page;
      const { success, failed } = await fanOut(deviceIds, (deviceId) =>
        apiPost<DisplayResult>(`/devices/${deviceId}/display/structured-text`, apiKey, body),
      );
      outputResult(
        deviceIds.length === 1 ? (success[deviceIds[0]] ?? failed[deviceIds[0]]) : { success, failed },
        json,
      );
    });

  // image
  display
    .command("image <files...>")
    .description("Push image(s) to device display (max 5 files, 2MB each)")
    .option("--device <deviceId...>", "Target device ID (repeatable; defaults to all configured devices)")
    .option("--no-dither", "Disable dithering algorithm")
    .option("--page <1-5>", "Page slot (persists when specified)")
    .action(async (files: string[], opts) => {
      const json = program.opts().json ?? false;
      const apiKey = getApiKey(program.opts().apiKey);
      const deviceIds = requireDevices(opts.device);
      if (files.length > 5) {
        printError("Maximum 5 images per request.", undefined, json);
        process.exit(1);
      }
      for (const filePath of files) {
        if (!fs.existsSync(filePath)) {
          printError(`File not found: ${filePath}`, undefined, json);
          process.exit(1);
        }
        if (fs.statSync(filePath).size > 2 * 1024 * 1024) {
          printError(`File exceeds 2MB limit: ${filePath}`, undefined, json);
          process.exit(1);
        }
      }
      // Read files once, reuse buffers across all devices
      const cachedFiles = files.map((filePath) => ({
        buffer: fs.readFileSync(filePath),
        name: path.basename(filePath),
      }));
      const { success, failed } = await fanOut(deviceIds, (deviceId) => {
        const form = new FormData();
        for (const { buffer, name } of cachedFiles) {
          form.append("images", new Blob([buffer]), name);
        }
        if (opts.dither === false) form.append("dither", "false");
        if (opts.page) form.append("pageId", opts.page);
        return apiPostForm<DisplayResult>(`/devices/${deviceId}/display/image`, apiKey, form);
      });
      outputResult(
        deviceIds.length === 1 ? (success[deviceIds[0]] ?? failed[deviceIds[0]]) : { success, failed },
        json,
      );
    });

  // delete
  display
    .command("delete")
    .description("Delete display page(s) — omit --page to delete all")
    .option("--device <deviceId...>", "Target device ID (repeatable; defaults to all configured devices)")
    .option("--page <id>", "Page ID to delete (omit to delete all)")
    .action(async (opts) => {
      const json = program.opts().json ?? false;
      const apiKey = getApiKey(program.opts().apiKey);
      const deviceIds = requireDevices(opts.device);
      const { success, failed } = await fanOut(deviceIds, (deviceId) => {
        const reqPath = opts.page
          ? `/devices/${deviceId}/display/pages/${opts.page}`
          : `/devices/${deviceId}/display/pages`;
        return apiDelete<{ msg: string }>(reqPath, apiKey);
      });
      outputResult(
        deviceIds.length === 1 ? (success[deviceIds[0]] ?? failed[deviceIds[0]]) : { success, failed },
        json,
      );
    });
}
