# enote-cli

> 电子墨水屏设备管理 CLI 工具，基于 [Zectrix](https://cloud.zectrix.com) 云平台 API。
> 专为 AI Agent 调用设计，所有输出均为 JSON 格式。

---

## 安装

**环境要求**：Node.js 18+

```bash
# 克隆仓库
git clone https://github.com/hua25/e-ink-note-cli.git
cd e-ink-note-cli

# 安装依赖并构建
npm install
npm run build

# 全局安装
npm link
```

安装完成后即可在终端使用 `enote` 命令。

---

## 快速开始

### 1. 初始化

首次使用需配置 API Key 并绑定设备：

```bash
enote init --api-key <your_api_key>
```

如果账号下有多台设备，会返回设备列表，按提示选择后再次运行：

```bash
enote init --api-key <your_api_key> --select "AA:BB:CC:DD:EE:FF,11:22:33:44:55:66"
```

配置写入 `~/.enote/config.json`，后续操作无需重复传入 API Key 和设备 ID。

### 2. 推送内容到屏幕

```bash
# 推送纯文字
enote display text --text "今日天气：晴，25°C"

# 推送标题+正文
enote display structured --title "会议提醒" --body "15:00 三楼会议室\n请带笔记本"

# 推送图片
enote display image ./poster.png

# 指定页面槽位（持久化，断电保留）
enote display text --text "备忘录内容" --page 1
```

### 3. 管理待办事项

```bash
# 查看待办
enote todos list
enote todos list --status 0   # 仅未完成

# 创建待办
enote todos create --title "买牛奶" --due-date 2026-04-15 --priority 1

# 标记完成
enote todos complete 1

# 删除
enote todos delete 1
```

---

## 配置

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

`devices` 数组第一项为默认设备。

### API Key 优先级

`--api-key` 参数 > `ENOTE_API_KEY` 环境变量 > 配置文件

---

## 完整命令参考

### 初始化

```bash
enote init [--api-key <key>] [--select <deviceId,...>]
```

### 设备

```bash
enote devices list
```

### 待办事项

```bash
enote todos list [--status 0|1] [--device <deviceId>]

enote todos create --title <title>
                   [--desc <text>]
                   [--due-date yyyy-MM-dd] [--due-time HH:mm]
                   [--repeat daily|weekly|monthly|yearly|none]
                   [--repeat-weekday 0-6]
                   [--repeat-month 1-12]
                   [--repeat-day 1-31]
                   [--priority 0|1|2]
                   [--device <deviceId>]

enote todos update <id> [--title <title>] [--desc <text>]
                        [--due-date <date>] [--due-time <time>] [--priority 0|1|2]

enote todos complete <id>
enote todos delete <id>
```

优先级：`0` = 普通，`1` = 重要，`2` = 紧急

### 显示推送

```bash
# 纯文字（最多 5000 字符）
enote display text [--device <deviceId>] --text <content>
                   [--font-size 12-48] [--page 1-5]

# 标题 + 正文（title ≤ 200 字，body ≤ 5000 字，至少填一项）
enote display structured [--device <deviceId>]
                         [--title <text>] [--body <text>] [--page 1-5]

# 图片（最多 5 张，每张 ≤ 2MB）
enote display image [--device <deviceId>] <file...>
                    [--dither true|false] [--page 1-5]

# 删除页面（不传 --page 则清空全部）
enote display delete [--device <deviceId>] [--page <1-5>]
```

`--page` 指定 1–5 时内容持久化存储，不指定则临时显示（断电消失）。

---

## 输出格式

所有命令输出纯 JSON，适合 AI Agent 程序化解析：

**成功**（stdout，exit 0）：
```json
{ "ok": true, "data": { ... } }
```

**失败**（stderr，exit 1）：
```json
{ "ok": false, "error": "错误描述", "code": 1001 }
```

---

## AI Agent 集成

项目内置三个通用 Skill 文档（`skills/` 目录），供 Claude Code、Cursor、Copilot 等 AI Agent 直接调用：

| Skill 文件 | 用途 |
|-----------|------|
| `skills/enote-init.md` | 初始化配置流程 |
| `skills/enote-todos.md` | 待办事项管理 |
| `skills/enote-display.md` | 推送内容到屏幕 |

**Claude Code** 用户：`.claude/skills/` 目录已通过软链接引用上述文件，可直接使用 `/enote-init`、`/enote-todos`、`/enote-display` 命令。

**其他 Agent**：将 `skills/` 目录下的 Markdown 文件引入对应平台的规则配置中即可（如 Cursor 的 `.cursor/rules/`、Copilot 的 `.github/copilot-instructions.md`）。

---

## 本地开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 监听模式（修改源码后自动重新编译）
npm run dev

# 本地调试（无需全局安装）
node dist/index.js --help
```
