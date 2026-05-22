import { readFileSync } from "fs";
import { join } from "path";
import { Command } from "commander";
import { registerInit } from "./commands/init.js";
import { registerDevices } from "./commands/devices.js";
import { registerTodos } from "./commands/todos.js";
import { registerDisplay } from "./commands/display.js";
import { ApiError, ConfigError } from "./errors.js";
import { printError } from "./output.js";

const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8")) as {
  version: string;
};

const program = new Command();

program
  .name("enote")
  .description("CLI tool for managing e-ink display devices via Zectrix cloud platform")
  .version(pkg.version)
  .option("--json", "Output raw JSON")
  .option("--api-key <key>", "API key override");

registerInit(program);
registerDevices(program);
registerTodos(program);
registerDisplay(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  const json = program.opts().json ?? false;
  if (err instanceof ApiError) {
    printError(err.message, err.code, json);
  } else if (err instanceof ConfigError) {
    printError(err.message, undefined, json);
  } else {
    printError(String(err), undefined, json);
  }
  process.exit(1);
});
