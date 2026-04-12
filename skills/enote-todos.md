# enote-todos

## 用途

管理电子墨水屏设备上的待办事项，支持查看、创建、修改、标记完成、删除。

## 前置条件

- 已完成初始化：`enote init`（配置文件 `~/.enote/config.json` 存在）
- 未初始化时，CLI 会返回提示 `run 'enote init' first`，应引导用户先运行 `/enote-init`

## 命令参考

```bash
enote todos list [--status 0|1] [--device <deviceId>]
enote todos create --title <title> [--desc <text>] [--due-date yyyy-MM-dd] [--due-time HH:mm]
                   [--repeat daily|weekly|monthly|yearly|none]
                   [--repeat-weekday 0-6] [--repeat-month 1-12] [--repeat-day 1-31]
                   [--priority 0|1|2] [--device <deviceId>]
enote todos update <id> [--title <title>] [--desc <text>] [--due-date <date>] [--due-time <time>] [--priority 0|1|2]
enote todos complete <id>
enote todos delete <id>
```

## 操作指南

### 自然语言参数映射

**优先级**

| 用户表达 | `--priority` 值 |
|---------|----------------|
| 普通、一般、默认 | `0` |
| 重要 | `1` |
| 紧急、urgent | `2` |

**重复类型**

| 用户表达 | `--repeat` 值 |
|---------|--------------|
| 每天、每日、daily | `daily` |
| 每周、weekly | `weekly` |
| 每月、monthly | `monthly` |
| 每年、yearly、annually | `yearly` |
| 不重复、一次性 | `none` |

**附加重复参数**

- `--repeat weekly` 时，可搭配 `--repeat-weekday 0-6`（0=周日，1=周一，…，6=周六）
- `--repeat monthly` 时，可搭配 `--repeat-day 1-31`
- `--repeat yearly` 时，可搭配 `--repeat-month 1-12` 和 `--repeat-day 1-31`

**日期时间**

- `--due-date`：格式 `yyyy-MM-dd`，相对描述需转换（"明天" → 实际日期，"下周一" → 具体日期）
- `--due-time`：格式 `HH:mm`，24 小时制

### 设备绑定

- 待办不绑定设备（个人待办）：不传 `--device`
- 绑定到设备显示：传 `--device <deviceId>`，不传时使用配置文件第一台设备

### 筛选列表

```bash
enote todos list                  # 全部待办
enote todos list --status 0       # 仅未完成
enote todos list --status 1       # 仅已完成
enote todos list --device <id>    # 指定设备的待办
```

## 输出处理

**list 返回数组**：
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "title": "买牛奶",
      "status": 0,
      "priority": 1,
      "completed": false,
      "dueDate": "2026-04-15",
      "dueTime": "09:00",
      "deviceName": "书房屏幕"
    }
  ]
}
```

展示时，以 `title` 为主，附上 `dueDate`/`dueTime`（若有）和优先级（0=普通/1=重要/2=紧急）。

**create / update 返回单条记录**，展示创建/修改后的 `title` 和 `id`。

**complete / delete 返回**：
```json
{ "ok": true, "data": { "msg": "success" } }
```

**失败**（stderr）：
```json
{ "ok": false, "error": "<错误信息>", "code": <number> }
```
