import fs from "fs";
import { Command } from "commander";
import { apiPost, apiPostForm, apiDelete } from "../client.js";
import { getApiKey, requireDefaultDevice, printSuccess, printError } from "../config.js";

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
    .option("--api-key <key>", "API key override")
    .option("--device <deviceId>", "Target device ID")
    .option("--font-size <12-48>", "Font size (default 20)")
    .option("--page <1-5>", "Page slot (persists when specified)")
    .action(async (opts) => {
      const apiKey = getApiKey(opts.apiKey);
      const deviceId = requireDefaultDevice(opts.device);
      if (opts.text.length > 5000) {
        printError("Text exceeds 5000 character limit.");
        process.exit(1);
      }
      const body: Record<string, unknown> = { text: opts.text };
      if (opts.fontSize) body.fontSize = Number(opts.fontSize);
      if (opts.page) body.pageId = opts.page;
      const data = await apiPost<DisplayResult>(`/devices/${deviceId}/display/text`, apiKey, body);
      printSuccess(data);
    });

  // structured
  display
    .command("structured")
    .description("Push structured text (title + body) to device display")
    .option("--api-key <key>", "API key override")
    .option("--device <deviceId>", "Target device ID")
    .option("--title <text>", "Title (max 200 chars)")
    .option("--body <text>", "Body text (max 5000 chars)")
    .option("--page <1-5>", "Page slot (persists when specified)")
    .action(async (opts) => {
      const apiKey = getApiKey(opts.apiKey);
      const deviceId = requireDefaultDevice(opts.device);
      if (!opts.title && !opts.body) {
        printError("At least one of --title or --body is required.");
        process.exit(1);
      }
      if (opts.title && opts.title.length > 200) {
        printError("Title exceeds 200 character limit.");
        process.exit(1);
      }
      if (opts.body && opts.body.length > 5000) {
        printError("Body exceeds 5000 character limit.");
        process.exit(1);
      }
      const body: Record<string, unknown> = {};
      if (opts.title) body.title = opts.title;
      if (opts.body) body.body = opts.body;
      if (opts.page) body.pageId = opts.page;
      const data = await apiPost<DisplayResult>(`/devices/${deviceId}/display/structured-text`, apiKey, body);
      printSuccess(data);
    });

  // image
  display
    .command("image <files...>")
    .description("Push image(s) to device display (max 5 files, 2MB each)")
    .option("--api-key <key>", "API key override")
    .option("--device <deviceId>", "Target device ID")
    .option("--dither <true|false>", "Use dithering algorithm (default true)")
    .option("--page <1-5>", "Page slot (persists when specified)")
    .action(async (files: string[], opts) => {
      const apiKey = getApiKey(opts.apiKey);
      const deviceId = requireDefaultDevice(opts.device);
      if (files.length > 5) {
        printError("Maximum 5 images per request.");
        process.exit(1);
      }
      const form = new FormData();
      for (const filePath of files) {
        if (!fs.existsSync(filePath)) {
          printError(`File not found: ${filePath}`);
          process.exit(1);
        }
        const stat = fs.statSync(filePath);
        if (stat.size > 2 * 1024 * 1024) {
          printError(`File exceeds 2MB limit: ${filePath}`);
          process.exit(1);
        }
        const buffer = fs.readFileSync(filePath);
        const fileName = filePath.split("/").pop() ?? "image";
        form.append("images", new Blob([buffer]), fileName);
      }
      if (opts.dither !== undefined) form.append("dither", opts.dither);
      if (opts.page) form.append("pageId", opts.page);
      const data = await apiPostForm<DisplayResult>(`/devices/${deviceId}/display/image`, apiKey, form);
      printSuccess(data);
    });

  // delete
  display
    .command("delete")
    .description("Delete display page(s) — omit --page to delete all")
    .option("--api-key <key>", "API key override")
    .option("--device <deviceId>", "Target device ID")
    .option("--page <id>", "Page ID to delete (omit to delete all)")
    .action(async (opts) => {
      const apiKey = getApiKey(opts.apiKey);
      const deviceId = requireDefaultDevice(opts.device);
      const path = opts.page
        ? `/devices/${deviceId}/display/pages/${opts.page}`
        : `/devices/${deviceId}/display/pages/`;
      const data = await apiDelete<{ msg: string }>(path, apiKey);
      printSuccess(data);
    });
}
