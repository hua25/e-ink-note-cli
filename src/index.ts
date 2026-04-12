import { Command } from "commander";
import { registerInit } from "./commands/init.js";
import { registerDevices } from "./commands/devices.js";
import { registerTodos } from "./commands/todos.js";
import { registerDisplay } from "./commands/display.js";

const program = new Command();

program
  .name("enote")
  .description("CLI tool for managing e-ink display devices via Zectrix cloud platform")
  .version("0.1.0");

registerInit(program);
registerDevices(program);
registerTodos(program);
registerDisplay(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(JSON.stringify({ ok: false, error: String(err) }));
  process.exit(1);
});
