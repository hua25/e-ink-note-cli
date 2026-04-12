import { Command } from "commander";
import { apiGet, apiPost, apiPut, apiDelete } from "../client.js";
import { getApiKey, requireDefaultDevice, printSuccess } from "../config.js";

interface Todo {
  id: number;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  repeatType?: string;
  status: number;
  priority: number;
  completed: boolean;
  deviceId?: string;
  deviceName?: string;
  createDate: string;
  updateDate: number;
}

export function registerTodos(program: Command): void {
  const todos = program.command("todos").description("Manage todo items");

  // list
  todos
    .command("list")
    .description("List todo items")
    .option("--api-key <key>", "API key override")
    .option("--status <0|1>", "Filter by status: 0=pending, 1=completed")
    .option("--device <deviceId>", "Filter by device ID")
    .action(async (opts) => {
      const apiKey = getApiKey(opts.apiKey);
      const params: Record<string, string> = {};
      if (opts.status !== undefined) params.status = opts.status;
      if (opts.device) params.deviceId = opts.device;
      const data = await apiGet<Todo[]>("/todos", apiKey, params);
      printSuccess(data);
    });

  // create
  todos
    .command("create")
    .description("Create a new todo item")
    .requiredOption("--title <title>", "Todo title")
    .option("--api-key <key>", "API key override")
    .option("--desc <text>", "Description")
    .option("--due-date <yyyy-MM-dd>", "Due date")
    .option("--due-time <HH:mm>", "Due time")
    .option("--repeat <type>", "Repeat type: daily|weekly|monthly|yearly|none")
    .option("--repeat-weekday <0-6>", "Weekday for weekly repeat (0=Sun)")
    .option("--repeat-month <1-12>", "Month for yearly repeat")
    .option("--repeat-day <1-31>", "Day for monthly/yearly repeat")
    .option("--priority <0|1|2>", "Priority: 0=normal, 1=important, 2=urgent")
    .option("--device <deviceId>", "Bind to device (omit for personal todo)")
    .action(async (opts) => {
      const apiKey = getApiKey(opts.apiKey);
      const body: Record<string, unknown> = { title: opts.title };
      if (opts.desc) body.description = opts.desc;
      if (opts.dueDate) body.dueDate = opts.dueDate;
      if (opts.dueTime) body.dueTime = opts.dueTime;
      if (opts.repeat) body.repeatType = opts.repeat;
      if (opts.repeatWeekday !== undefined) body.repeatWeekday = Number(opts.repeatWeekday);
      if (opts.repeatMonth !== undefined) body.repeatMonth = Number(opts.repeatMonth);
      if (opts.repeatDay !== undefined) body.repeatDay = Number(opts.repeatDay);
      if (opts.priority !== undefined) body.priority = Number(opts.priority);
      if (opts.device) body.deviceId = opts.device;
      const data = await apiPost<Todo>("/todos", apiKey, body);
      printSuccess(data);
    });

  // update
  todos
    .command("update <id>")
    .description("Update a todo item")
    .option("--api-key <key>", "API key override")
    .option("--title <title>", "New title")
    .option("--desc <text>", "New description")
    .option("--due-date <yyyy-MM-dd>", "New due date")
    .option("--due-time <HH:mm>", "New due time")
    .option("--priority <0|1|2>", "New priority")
    .action(async (id, opts) => {
      const apiKey = getApiKey(opts.apiKey);
      const body: Record<string, unknown> = {};
      if (opts.title) body.title = opts.title;
      if (opts.desc) body.description = opts.desc;
      if (opts.dueDate) body.dueDate = opts.dueDate;
      if (opts.dueTime) body.dueTime = opts.dueTime;
      if (opts.priority !== undefined) body.priority = Number(opts.priority);
      const data = await apiPut<Todo>(`/todos/${id}`, apiKey, body);
      printSuccess(data);
    });

  // complete
  todos
    .command("complete <id>")
    .description("Toggle todo completion status")
    .option("--api-key <key>", "API key override")
    .action(async (id, opts) => {
      const apiKey = getApiKey(opts.apiKey);
      const data = await apiPut<{ msg: string }>(`/todos/${id}/complete`, apiKey);
      printSuccess(data);
    });

  // delete
  todos
    .command("delete <id>")
    .description("Delete a todo item")
    .option("--api-key <key>", "API key override")
    .action(async (id, opts) => {
      const apiKey = getApiKey(opts.apiKey);
      const data = await apiDelete<{ msg: string }>(`/todos/${id}`, apiKey);
      printSuccess(data);
    });
}
