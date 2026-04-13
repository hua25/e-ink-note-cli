---
name: enote-init
description: "Configure enote CLI: enter API Key, fetch device list, select devices to bind, write ~/.enote/config.json. Use when user wants to set up enote for the first time or re-configure it."
---

## 用途

首次配置 enote 工具：录入 API Key，获取并选择要绑定的电子墨水屏设备，将配置写入 `~/.enote/config.json`。

## 前置条件

- 已安装 enote CLI：`npm install -g enote-cli`
- 已获得 Zectrix API Key

## 命令参考

```bash
# 第一阶段：获取设备列表（不写入配置）
enote init --api-key <key>

# 第二阶段：选择设备并写入配置
enote init --api-key <key> --select "<deviceId1>,<deviceId2>"
```

## 操作指南

### 标准流程（两阶段）

**第一阶段**：执行 `enote init --api-key <key>`，解析返回结果：

- 若 `data.configured == true`（账号下只有 1 台设备）：
  - 配置已自动完成，告知用户配置文件路径和绑定设备，流程结束
- 若 `data.configured == false`（多台设备）：
  - 将 `data.devices` 以 `alias`（别名）展示给用户
  - 让用户选择要绑定的设备（可多选）

**第二阶段**：用户确认后，将所选 `deviceId` 用逗号拼接，执行：
```bash
enote init --api-key <key> --select "AA:BB:CC:DD:EE:FF,11:22:33:44:55:66"
```
- 验证通过后写入配置文件
- 告知用户已完成配置，展示绑定的设备 alias 列表

### 配置文件格式

```json
{
  "api_key": "your_key_here",
  "devices": [
    { "deviceId": "AA:BB:CC:DD:EE:FF", "alias": "书房屏幕" },
    { "deviceId": "11:22:33:44:55:66", "alias": "厨房屏幕" }
  ]
}
```

`devices` 数组第一项为后续命令的默认设备。

### 重新初始化

重新运行 `enote init` 会覆盖现有配置，适用于更换 API Key 或修改设备绑定。

## 输出处理

**单设备，自动完成**：
```json
{
  "ok": true,
  "data": {
    "configured": true,
    "config_path": "/Users/<user>/.enote/config.json",
    "devices": [{ "deviceId": "AA:BB:CC:DD:EE:FF", "alias": "我的设备" }]
  }
}
```

**多设备，待选择**：
```json
{
  "ok": true,
  "data": {
    "configured": false,
    "message": "Multiple devices found. Re-run with --select <deviceId,...> to save configuration.",
    "devices": [
      { "deviceId": "AA:BB:CC:DD:EE:FF", "alias": "书房屏幕" },
      { "deviceId": "11:22:33:44:55:66", "alias": "厨房屏幕" }
    ]
  }
}
```

**第二阶段完成**：
```json
{
  "ok": true,
  "data": {
    "configured": true,
    "config_path": "/Users/<user>/.enote/config.json",
    "devices": [...]
  }
}
```

**失败**（stderr）：
```json
{ "ok": false, "error": "<错误信息>", "code": <number> }
```
