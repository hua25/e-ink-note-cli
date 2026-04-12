# Zectrix CLI — 设计文档

## 架构

```
用户/Agent
    ↓  调用 skill（自然语言描述意图）
AI Agent（Claude Code / Cursor / Copilot / 任意 LLM Agent）
    ↓  执行 shell 命令
enote CLI（纯 API 封装，JSON I/O）
    ↓  HTTP + X-API-Key
Zectrix Cloud API
```

Skills 是**纯 Markdown 文档**，描述"如何用 CLI 完成某类任务"，不绑定任何特定 AI 平台。任何能执行 shell 命令并读取 Markdown 的 agent 均可使用。

---

## 技术栈

| 层次 | 选型 |
|------|------|
| CLI 语言 | TypeScript (Node.js 18+) |
| CLI 框架 | commander |
| HTTP | 原生 fetch |
| 打包 | tsup → 单文件 CJS |
| 分发 | `npm install -g enote-cli` |
| Skills | 通用 Markdown（`skills/` 目录，可软链至各 agent 规则目录） |

---

## 项目结构

```
e-ink-note-cli/
├── src/
│   ├── index.ts              # CLI 入口，注册子命令
│   ├── client.ts             # fetch 封装：auth、错误统一处理
│   ├── config.ts             # 配置读写（API Key + 设备列表）
│   └── commands/
│       ├── init.ts           # 初始化：认证 + 设备选择 + 写配置（enote init）
│       ├── devices.ts
│       ├── todos.ts
│       └── display.ts
├── skills/                   # 通用 skill 文档（agent 无关）
│   ├── enote-init.md
│   ├── enote-todos.md
│   └── enote-display.md
├── .claude/
│   └── skills/               # Claude Code 软链
│       ├── enote-init.md    -> ../../skills/enote-init.md
│       ├── enote-todos.md   -> ../../skills/enote-todos.md
│       └── enote-display.md -> ../../skills/enote-display.md
├── docs/
│   ├── zectrix-api.md
│   └── design.md
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

Skills 源文件统一放在 `skills/`，`.claude/skills/` 通过软链引用，Cursor / Copilot 等也可直接引用同一份文件。

---

## CLI 设计

### 配置文件

路径：`~/.enote/config.json`

```json
{
  "api_key": "your_key_here",
  "devices": [
    { "deviceId": "AA:BB:CC:DD:EE:FF", "alias": "书房屏幕" },
    { "deviceId": "11:22:33:44:55:66", "alias": "厨房屏幕" }
  ]
}
```

`devices` 数组第一项为默认设备，`init` 时按用户选择顺序写入。

**API Key 优先级**：`--api-key` flag > `ENOTE_API_KEY` 环境变量 > 配置文件

**设备 ID 来源**：`--device` flag > 配置文件 `devices[0].deviceId`（数组第一项）

---

### 初始化流程（`enote init`）

首次使用时运行，完成认证配置和设备绑定，**之后操作不再调用设备列表 API**：

```bash
enote init [--api-key <key>] [--select <deviceId,...>]
```

**两阶段调用设计**（供 agent 使用）：

**第一阶段**：不传 `--select`，仅获取设备列表
```bash
enote init --api-key <key>
```
返回可用设备列表，exit 0（尚未写入配置）：
```json
{
  "ok": true,
  "data": {
    "configured": false,
    "devices": [
      { "deviceId": "AA:BB:CC:DD:EE:FF", "alias": "书房屏幕" },
      { "deviceId": "11:22:33:44:55:66", "alias": "厨房屏幕" }
    ]
  }
}
```

**特例**：如果只有 1 台设备，自动完成配置（`configured: true`），无需第二阶段。

**第二阶段**：用户确认后，传入选中的设备 ID，写入配置
```bash
enote init --api-key <key> --select "AA:BB:CC:DD:EE:FF,11:22:33:44:55:66"
```
返回：
```json
{
  "ok": true,
  "data": {
    "configured": true,
    "devices": [
      { "deviceId": "AA:BB:CC:DD:EE:FF", "alias": "书房屏幕" },
      { "deviceId": "11:22:33:44:55:66", "alias": "厨房屏幕" }
    ]
  }
}
```

---

### 输出规范

所有命令输出纯 JSON：

- **成功** → stdout，exit 0：`{ "ok": true, "data": <...> }`
- **失败** → stderr，exit 1：`{ "ok": false, "error": "<message>", "code": <number> }`
- **未初始化**：todos / display 命令检测到无配置时，stderr 输出提示 `run 'enote init' first`，exit 1

---

### 命令列表

```bash
# 初始化（首次使用）
enote init [--api-key <key>] [--select <deviceId,...>]

# 设备（日常无需调用，init 后从配置读取）
enote devices list

# 待办
# --device 可临时覆盖配置中的默认设备；不传则用配置文件第一个设备
enote todos list [--status 0|1] [--device <deviceId>]
enote todos create --title <title> [--desc <text>]
                   [--due-date yyyy-MM-dd] [--due-time HH:mm]
                   [--repeat daily|weekly|monthly|yearly|none]
                   [--repeat-weekday 0-6] [--repeat-month 1-12] [--repeat-day 1-31]
                   [--priority 0|1|2] [--device <deviceId>]
enote todos update <id> [--title <title>] [--desc <text>]
                        [--due-date <date>] [--due-time <time>] [--priority 0|1|2]
enote todos complete <id>
enote todos delete <id>

# 显示推送
# --device 可临时覆盖配置中的默认设备
enote display text [--device <deviceId>] --text <content> [--font-size 12-48] [--page 1-5]
enote display structured [--device <deviceId>] [--title <text>] [--body <text>] [--page 1-5]
enote display image [--device <deviceId>] <file...> [--dither true|false] [--page 1-5]
enote display delete [--device <deviceId>] [--page <id>]   # 不传 --page 则清空全部页面
```

---

## Skills 设计

每个 skill 是独立的 Markdown 文件，结构统一，不含平台特有语法：

```
# <skill 名称>

## 用途
何时调用本 skill（一句话）

## 前置条件
CLI 安装和配置要求

## 命令参考
本 skill 涉及的 CLI 命令速查

## 操作指南
各场景的步骤说明，含参数映射、边界条件

## 输出处理
如何解读 JSON，向用户呈现什么
```

---

### skill: enote-init

**用途**：首次配置工具，完成 API Key 录入和设备绑定。

**操作指南**：

1. 执行 `enote init --api-key <key>`（第一阶段）
2. 解析返回的 `data.devices` 列表，以 `alias` 展示给用户
3. 若 `data.configured == true`（单设备自动完成），告知用户配置已完成
4. 若 `data.configured == false`，让用户选择要绑定的设备
5. 执行 `enote init --api-key <key> --select "<id1>,<id2>"` 完成写入
6. 告知用户配置文件路径（`~/.enote/config.json`）和已绑定设备

---

### skill: enote-todos

**用途**：管理待办事项（查看、创建、修改、完成、删除）。

**前置条件**：已执行 `enote init` 完成配置，否则提示用户先运行 `/enote-init`。

**自然语言映射**：
- 优先级："普通/一般" → 0，"重要" → 1，"紧急" → 2
- 重复类型："每天/每日" → daily，"每周" → weekly，"每月" → monthly，"每年" → yearly，"不重复" → none
- 日期：相对时间（"明天"、"下周一"）需转换为 `yyyy-MM-dd`

**边界处理**：
- 不绑定设备的待办（个人待办）不传 `--device`
- 需推送到特定设备时，若用户未说明，从配置文件默认设备中选取

---

### skill: enote-display

**用途**：向电子墨水屏推送显示内容（文字或图片）。

**前置条件**：已执行 `enote init` 完成配置，否则提示用户先运行 `/enote-init`。

**内容类型选择**：

| 场景 | 命令 |
|------|------|
| 纯文字段落 | `display text` |
| 有明确标题 + 正文结构 | `display structured` |
| 本地图片文件路径 | `display image` |

**边界处理**：
- 用户未指定设备 → 使用配置文件中的默认设备（第一个）；多设备时询问推送到哪台
- 文字超出限制（text >5000 字、title >200 字）→ 提示截断或分页
- 图片超过 5 张或单张 >2MB → 提前告知，请用户处理后重试
- `--page` 指定 1–5 时内容持久化；不指定则为临时显示，断电后消失

---

## 开发阶段

| 阶段 | 内容 |
|------|------|
| Phase 1 — CLI 骨架 | npm 初始化、TypeScript + tsup、config.ts（读写）、client.ts |
| Phase 2 — CLI 命令 | init / devices / todos / display 全部子命令 |
| Phase 3 — Skills | 编写三个 skill 文档，建立软链至 `.claude/skills/` |
| Phase 4 — 打包发布 | tsup 打包、配置 `bin`、npm publish、README |

---

## 关键约束（来自 API 文档）

- `display image`：单次最多 5 张，每张 ≤ 2MB，multipart/form-data
- `display text`：`text` ≤ 5000 字符
- `display structured`：`title` ≤ 200 字符，`body` ≤ 5000 字符，至少填一项
- `pageId` 范围 1–5，不传则临时显示（不持久化）
- `DELETE /display/pages/:id` 不传 id 时删除全部页面
