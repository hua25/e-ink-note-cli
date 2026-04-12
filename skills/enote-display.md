# enote-display

## 用途

向电子墨水屏推送显示内容，支持纯文本、标题+正文结构体、本地图片三种形式，可指定页面槽位（1–5）持久化存储。

## 前置条件

- 已完成初始化：`enote init`（配置文件 `~/.enote/config.json` 存在）
- 未初始化时，CLI 会返回提示 `run 'enote init' first`，应引导用户先运行 `/enote-init`

## 命令参考

```bash
enote display text [--device <deviceId>] --text <content> [--font-size 12-48] [--page 1-5]
enote display structured [--device <deviceId>] [--title <text>] [--body <text>] [--page 1-5]
enote display image [--device <deviceId>] <file...> [--dither true|false] [--page 1-5]
enote display delete [--device <deviceId>] [--page <id>]
```

## 操作指南

### 内容类型选择

| 场景 | 命令 |
|------|------|
| 纯文字段落、备忘录 | `display text` |
| 有明确标题 + 正文结构（如会议提醒、日程） | `display structured` |
| 本地图片文件路径 | `display image` |

### 限制说明

| 参数 | 限制 |
|------|------|
| `--text` | ≤ 5000 字符 |
| `--title` | ≤ 200 字符 |
| `--body` | ≤ 5000 字符 |
| 图片数量 | 单次最多 5 张 |
| 图片大小 | 每张 ≤ 2MB |

超出限制时，CLI 会在 stderr 返回错误并 exit 1，应提前提醒用户处理。

### 页面持久化

- `--page 1-5`：内容写入指定槽位，断电后仍保留
- 不传 `--page`：临时显示，断电后消失

### 删除页面

```bash
enote display delete --page 1       # 删除第 1 页
enote display delete                # 清空全部页面（不传 --page）
```

### 多设备推送

若需推送到多台设备，对每台设备分别执行命令：
```bash
enote display text --device AA:BB:CC:DD:EE:FF --text "内容"
enote display text --device 11:22:33:44:55:66 --text "内容"
```

不传 `--device` 时，默认使用配置文件中第一台设备。

## 输出处理

**推送成功**：
```json
{
  "ok": true,
  "data": {
    "totalPages": 1,
    "pushedPages": 1,
    "pageId": "1"
  }
}
```

向用户确认时，展示 `pushedPages`（成功推送页数）和 `pageId`（页面槽位，若有）。

**失败**（stderr）：
```json
{ "ok": false, "error": "<错误信息>", "code": <number> }
```
