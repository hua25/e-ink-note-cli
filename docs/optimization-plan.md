# E-Note CLI 优化任务列表

## P0 — 架构修复（阻塞测试和可维护性）

### 1. 消除库层 `process.exit(1)` 调用

**影响文件:** `src/client.ts`, `src/config.ts`, `src/commands/*.ts`

**问题:** `request()`、`getApiKey()`、`requireDevices()` 等工具函数内部直接调用 `process.exit(1)`，导致：
- 任何调用这些函数的代码都无法进行单元测试
- 库层与 CLI 生命周期强耦合
- 非 CLI 场景（如作为 SDK 使用）不可行

**方案:**
1. 新建 `src/errors.ts`，定义结构化错误类型：
   ```ts
   export class ApiError extends Error {
     constructor(message: string, public code?: number) { super(message); this.name = "ApiError"; }
   }
   export class ConfigError extends Error {
     constructor(message: string) { super(message); this.name = "ConfigError"; }
   }
   ```
2. `client.ts` 的 `request()` 函数：删除所有 `printError` + `process.exit(1)` 调用，改为 `throw new ApiError(...)`。
3. `config.ts` 的 `getApiKey()` 和 `requireDevices()`：删除 `process.exit(1)`，改为 `throw new ConfigError(...)`。
4. `config.ts` 的 `printError` 改为仅输出格式化错误信息，不退出进程。
5. 在 `src/index.ts` 中增加顶层错误处理：
   ```ts
   program.parseAsync(process.argv).catch((err) => {
     if (err instanceof ApiError || err instanceof ConfigError) {
       printError(err.message, err instanceof ApiError ? err.code : undefined);
     } else {
       printError(String(err));
     }
     process.exit(1);
   });
   ```
6. 各 command action 中需要立即退出的校验错误（如文件不存在、参数非法），保留 `printError` + `process.exit(1)` 在 command handler 层是可接受的——这属于 CLI 交互逻辑。

---

### 2. 增加通用 `--json` 标志和人类友好输出

**影响文件:** `src/config.ts`, `src/commands/*.ts`, `src/index.ts`

**问题:** 所有命令输出 raw JSON，作为交互式 CLI 用户体验差。`enote todos list` 应该像 `docker ps` 一样输出可读表格。

**方案:**
1. 在 `program` 上注册全局选项 `--json`，使所有子命令可用 `opts().parent.opts().json`：
   ```ts
   program.option("--json", "Output raw JSON");
   ```
2. 新建 `src/output.ts`：
   ```ts
   export function output(data: unknown, json: boolean): void {
     if (json) {
       console.log(JSON.stringify({ ok: true, data }));
     } else {
       // 根据 data 类型选择格式
     }
   }
   ```
3. 列表类数据使用 `console.table()` 输出。
4. 操作结果使用简洁的描述性文本（如 `✓ Created todo #42`）。
5. 将 `printSuccess` 标记为 `@deprecated`，逐步替换为新的 `output()`。
6. 替换所有 command 中的 `printSuccess` 调用。

---

### 3. 增加测试基础设施

**影响文件:** `package.json`, 新建 `tests/`

**问题:** 零测试覆盖。CLI 涉及 HTTP 请求、文件操作、用户输入解析，任何改动都依赖手工验证。

**方案:**
1. 安装 vitest：`npm install -D vitest`
2. `package.json` 增加 scripts：
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```
3. 编写单元测试，按模块拆分：

   **`tests/config.test.ts`** — config 核心逻辑（无需 mock）：
   - `loadConfig()` 文件不存在时返回 `{}`
   - `saveConfig()` 后 `loadConfig()` 可读取
   - `resolveDevices()` 的四种场景（0/1/N 设备 + flag 覆盖）
   - `getApiKey()` 的优先级链（flag > env > config）

   **`tests/client.test.ts`** — HTTP 层（mock fetch）：
   - 成功响应解析
   - HTTP 错误码 → 抛出 `ApiError`
   - 非 JSON 响应 → 抛出 `ApiError`
   - 网络异常 → 抛出 `ApiError`

   **`tests/commands.test.ts`** — 参数解析（直接调用 commander 解析）：
   - `--device` repeatable 参数解析
   - 必填参数校验
   - 参数类型转换

4. 测试不依赖真实 API，完全通过 mock `fetch` 实现。

---

## P1 — Bug 修复

### 4. 修复 `--device` 不可重复的问题

**影响文件:** `src/commands/todos.ts:54`, `src/commands/display.ts:21,45,79,121`

**问题:** 所有 `--device` 选项声明为 `--device <deviceId>`（单值），但帮助文档说 "repeatable"。传多个 `--device A --device B` 时 commander 只用最后一个。

**方案:**
1. 将所有 `--device <deviceId>` 改为 `--device <deviceId...>`（variadic）。
2. 变长参数在 commander 中返回 `string[]`，直接用 `opts.device` 替代 `opts.device ? [opts.device] : undefined`：
   - 当前：`const deviceIds = requireDevices(opts.device ? [opts.device] : undefined);`
   - 修改后：`const deviceIds = requireDevices(opts.device);`
3. 如果用户想传多个设备 ID 且包含空格，需要用引号：`--device "a b c"`。

---

### 5. 修复删除所有页面时的 trailing slash

**影响文件:** `src/commands/display.ts:128-130`

**问题:** 无 `--page` 时发送 `DELETE .../display/pages/`（尾部斜杠），可能导致 404 或 301 重定向。

**方案:**
```ts
// 当前
const path = opts.page
  ? `/devices/${deviceId}/display/pages/${opts.page}`
  : `/devices/${deviceId}/display/pages/`;

// 修改后
const path = opts.page
  ? `/devices/${deviceId}/display/pages/${opts.page}`
  : `/devices/${deviceId}/display/pages`;
```

---

### 6. 图片文件避免重复读取

**影响文件:** `src/commands/display.ts:100-112`

**问题:** `Promise.all` 中每个 device 都重新 `readFileSync`，3 个设备 × 5 张图片 = 15 次磁盘 I/O，完全重复。

**方案:**
1. 在 `Promise.all` 之前读取文件并缓存 buffer/Blob：
   ```ts
   const cachedFiles = files.map((filePath) => ({
     buffer: fs.readFileSync(filePath),
     name: filePath.split("/").pop() ?? "image",
   }));
   ```
2. 循环内复用缓存：
   ```ts
   deviceIds.map((deviceId) => {
     const form = new FormData();
     for (const { buffer, name } of cachedFiles) {
       form.append("images", new Blob([buffer]), name);
     }
     // ...
   })
   ```
3. 同时将 `filePath.split("/").pop()` 改为 `require("path").basename(filePath)`，兼容 Windows 路径分隔符。

---

### 7. 增加 HTTP 请求超时

**影响文件:** `src/client.ts`

**问题:** `fetch` 无超时控制，网络异常时 CLI 无限挂起。

**方案:**
1. 在 `request()` 函数中添加 `AbortController`，默认超时 30 秒：
   ```ts
   const controller = new AbortController();
   const timer = setTimeout(() => controller.abort(), 30_000);
   try {
     res = await fetch(url, { ...init, headers, signal: controller.signal });
   } finally {
     clearTimeout(timer);
   }
   ```
2. 超时时的 `AbortError` 在 catch 中转为 `ApiError("Request timed out")`。

---

### 8. `--dither` 改为 `--no-dither` 布尔标志

**影响文件:** `src/commands/display.ts:80`

**问题:** 当前 `--dither <true|false>` 要求用户输入值。默认就是 `true`，用户绝大部分场景不需要指定，只需一个关闭的开关。

**方案:**
1. 将声明改为：
   ```ts
   .option("--no-dither", "Disable dithering algorithm")
   ```
2. Commander 的 `--no-*` 约定：不传时为 `true`（默认），传 `--no-dither` 时为 `false`。
3. 发送时：
   ```ts
   if (opts.dither === false) form.append("dither", "false");
   // 默认 true 时不需要发送，与 API 默认值一致
   ```

---

### 9. `Promise.all` 改用 `Promise.allSettled`

**影响文件:** `src/commands/todos.ts:73`, `src/commands/display.ts:34,68,100,126`

**问题:** 多设备 fan-out 时，任意一台设备失败，所有结果丢失。用户看不到哪些成功了哪些失败了。

**方案:**
1. 新建 `src/utils.ts`，提取公共函数：
   ```ts
   export async function fanOut<T>(deviceIds: string[], fn: (id: string) => Promise<T>) {
     const results = await Promise.allSettled(deviceIds.map(fn));
     const success: Record<string, T> = {};
     const failed: Record<string, string> = {};
     results.forEach((r, i) => {
       if (r.status === "fulfilled") success[deviceIds[i]] = r.value;
       else failed[deviceIds[i]] = r.reason instanceof Error ? r.reason.message : String(r.reason);
     });
     return { success, failed };
   }
   ```
2. 各 command 使用 `fanOut` 替代 `Promise.all`。
3. 输出时清晰展示成功和失败情况。

---

## P2 — 安全增强

### 10. 配置文件权限限制

**影响文件:** `src/config.ts:36`

**问题:** `~/.enote/config.json` 以默认 umask（通常是 644）写入，任何系统用户可读 API key。

**方案:**
1. `saveConfig` 写入后调用 `fs.chmodSync(CONFIG_FILE, 0o600)`。
2. 初始化时也检查已有配置文件的权限，如果不安全则打印警告。
3. 在 README 中说明 `ENOTE_API_KEY` 环境变量比配置文件更安全。

---

### 11. 客户端校验枚举值

**影响文件:** `src/commands/todos.ts:49-53,62`

**问题:** `--repeat`、`--priority`、`--status` 等枚举值直接发送到 API，拼写错误只能得到服务端的模糊错误。

**方案:**
1. 定义枚举常量：
   ```ts
   const REPEAT_TYPES = ["daily", "weekly", "monthly", "yearly", "none"] as const;
   ```
2. 在 action handler 中校验：
   ```ts
   if (opts.repeat && !REPEAT_TYPES.includes(opts.repeat)) {
     printError(`Invalid repeat type: "${opts.repeat}". Valid: ${REPEAT_TYPES.join(", ")}`);
     process.exit(1);
   }
   ```
3. 也可以用 commander 的 `choices` 参数：
   ```ts
   .option("--repeat <type>", "Repeat type").choices(["daily", "weekly", "monthly", "yearly", "none"])
   ```

---

## P3 — 体验和代码质量改进

### 12. 配置文件损坏时给出明确提示

**影响文件:** `src/config.ts:22-30`

**问题:** `loadConfig()` 在 JSON 解析失败时静默返回 `{}`，用户看到 "未配置设备" 而不知道配置文件已损坏。

**方案:**
1. 区分"文件不存在"和"文件损坏"两种情况：
   ```ts
   export function loadConfig(): Partial<Config> {
     if (!fs.existsSync(CONFIG_FILE)) return {};
     try {
       const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
       return JSON.parse(raw) as Partial<Config>;
     } catch {
       console.error("Warning: config file is corrupted, ignoring. Path:", CONFIG_FILE);
       return {};
     }
   }
   ```

---

### 13. 版本号从 package.json 读取

**影响文件:** `src/index.ts:12`

**问题:** 版本号硬编码为 `"0.1.0"`，与 `package.json` 容易不同步。

**方案:**
1. 从 `package.json` 动态读取：
   ```ts
   import pkg from "../package.json" with { type: "json" };
   // ...
   .version(pkg.version);
   ```
2. 或使用 `fs.readFileSync` 读取（CommonJS 兼容方式）。

---

### 14. `--api-key` 提取为全局选项（减少样板代码）

**影响文件:** `src/index.ts`, `src/commands/*.ts`

**问题:** 每个子命令都重复声明 `--api-key <key>` 选项，共出现 12 次。

**方案:**
1. 在顶层 program 注册：
   ```ts
   program.option("--api-key <key>", "API key override");
   ```
2. 子命令通过 `opts().parent.opts().apiKey` 获取。或者更简单：封装一个 helper 函数 `getApiKeyFromOpts(opts)` 自动从当前或父级选项提取。
3. 删除各子命令中重复的 `--api-key` 声明。

---

### 15. 类型化请求体（替代 `Record<string, unknown>`）

**影响文件:** `src/commands/todos.ts`, `src/commands/display.ts`

**问题:** 所有请求体都是 `Record<string, unknown>`，缺乏编译时类型检查。

**方案:**
1. 新建 `src/types.ts`，定义请求体接口：
   ```ts
   export interface CreateTodoRequest {
     title: string;
     description?: string;
     dueDate?: string;
     dueTime?: string;
     repeatType?: string;
     repeatWeekday?: number;
     repeatMonth?: number;
     repeatDay?: number;
     priority?: number;
     deviceId?: string;
   }
   export interface StructuredTextRequest {
     title?: string;
     body?: string;
     pageId?: string;
   }
   ```
2. 命令中将 `Record<string, unknown>` 替换为具体类型，`apiPost<T>` 自然会校验请求体。

---

### 16. `init --select` 统一为 `--device` 参数

**影响文件:** `src/commands/init.ts:24`

**问题:** `init` 用 `--select <deviceIds>`（逗号分隔），其他命令用 `--device`，不一致且不便于脚本统一处理。

**方案:**
1. 将 `init` 的 `--select` 改为 `--device <deviceId...>`（variadic），与其他命令一致。
2. 用户用法从 `enote init --select "id1,id2"` 变为 `enote init --device id1 --device id2`。

---

## 优先级总览

| # | 优先级 | 类别 | 任务 |
|---|--------|------|------|
| 1 | P0 | 架构 | 消除库层 `process.exit(1)` |
| 2 | P0 | 体验 | 增加 `--json` 标志 + 人类可读输出 |
| 3 | P0 | 工程 | 测试基础设施 |
| 4 | P1 | Bug | 修复 `--device` 不可重复 |
| 5 | P1 | Bug | 修复删除所有页面 trailing slash |
| 6 | P1 | 性能 | 图片文件避免重复读取 |
| 7 | P1 | 可靠性 | HTTP 超时控制 |
| 8 | P1 | 体验 | `--dither` → `--no-dither` |
| 9 | P1 | 健壮性 | `Promise.allSettled` 替代 `Promise.all` |
| 10 | P2 | 安全 | 配置文件 chmod 0o600 |
| 11 | P2 | 安全 | 客户端枚举校验 |
| 12 | P3 | 质量 | 配置文件损坏提示 |
| 13 | P3 | 质量 | 版本号从 package.json 读取 |
| 14 | P3 | 质量 | `--api-key` 提取为全局选项 |
| 15 | P3 | 质量 | 类型化请求体 |
| 16 | P3 | 体验 | `init --select` 统一为 `--device` |
