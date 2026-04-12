# Authentication

* API Key (apikey-header-X-API-Key)
  - Parameter Name: **X-API-Key**, in: header. 

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|X-API-Key|header|string| 否 |zectrix_api_key_string|

---

# 设备管理

## 获取设备列表

- URL: `https://cloud.zectrix.com/open/v1/devices`
- Request Type: `GET`

### Response:

> 返回示例

```json
{
  "code": 0,
  "data": [
    {
      "deviceId": "AA:BB:CC:DD:EE:FF",
      "alias": "我的设备",
      "board": "bread-compact-wifi"
    }
  ]
}
```

---

# 待办事项

## 获取待办列表

- URL: `https://cloud.zectrix.com/open/v1/todos`
- Request Type: `GET`

### 请求参数

|名称|类型|必选|说明|
|---|---|---|---|
|status|integer| 否 |过滤状态：0=待完成, 1=已完成|
|deviceId|string| 否 |设备ID(MAC地址)，过滤指定设备的待办|

### Response:

> 返回示例

```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "title": "买牛奶",
      "description": "",
      "dueDate": "2026-03-20",
      "dueTime": "09:00",
      "repeatType": "none",
      "status": 0,
      "priority": 1,
      "completed": false,
      "deviceId": "AA:BB:CC:DD:EE:FF",
      "deviceName": "我的设备",
      "createDate": "2026-03-18 10:00:00",
      "updateDate": 1742284800
    }
  ]
}
```

## 创建代办

- URL: `https://cloud.zectrix.com/open/v1/todos`
- Request Type: `POST`

### 请求参数

|名称|类型|必选|说明|
|---|---|---|---|
|title|string| 是 | 标题 |
|description|string| 否 |描述|
|dueDate|string|否|截止日期(yyyy-MM-dd)|
|dueTime|string|否|截止时间(HH:mm)|
|repeatType|string|否|重复类型：daily/weekly/monthly/yearly/none|
|repeatWeekday|integer|否|周几 0-6, 0=周日（weekly用）|
|repeatMonth|integer|否|每年几月 1-12（yearly用）|
|repeatDay|integer|否|每月几号 1-31（monthly/yearly用）|
|priority|integer|否|优先级：0=普通, 1=重要, 2=紧急|
|deviceId|integer|否|设备ID(MAC地址)，为空则为个人待办|

- Request Body 示例：

```json
{
  "title": "买牛奶",
  "description": "",
  "dueDate": "2026-03-20",
  "dueTime": "09:00",
  "repeatType": "none",
  "priority": 1,
  "deviceId": "AA:BB:CC:DD:EE:FF"
}
```

### Response:

> 返回示例

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "title": "买牛奶",
    "status": 0,
    "priority": 1,
    "deviceId": "AA:BB:CC:DD:EE:FF",
    "createDate": "2026-03-18 10:00:00"
  }
}
```

## 更新代办

- URL: `https://cloud.zectrix.com/open/v1/todos/{{id}}`
- Request Type: `PUT`

### 请求参数

#### 路径参数

|名称|类型|必选|说明|
|---|---|---|---|
|id|integer|是|待办ID|

#### 请求体参数
|名称|类型|必选|说明|
|---|---|---|---|
|id|string| 是 | 标题 |
|description|string| 否 |描述|
|dueDate|string|否|截止日期(yyyy-MM-dd)|
|dueTime|string|否|截止时间(HH:mm)|
|priority|integer|否|优先级：0=普通, 1=重要, 2=紧急|


- Request Body 示例：

```json
{
  "title": "买牛奶和面包"
}
```

### Response:

> 返回示例

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "title": "买牛奶和面包",
    "status": 0,
    "priority": 1
  }
}
```

## 标记完成/取消完成

- URL: `https://cloud.zectrix.com/open/v1/todos/{{id}}/complete`
- Request Type: `PUT`

### 请求参数

#### 路径参数

|名称|类型|必选|说明|
|---|---|---|---|
|id|integer|是|待办ID|

### Response:

> 返回示例

```json
{ "code": 0, "msg": "success" }
```

## 删除代办

- URL: `https://cloud.zectrix.com/open/v1/todos/{{id}}`
- Request Type: `DELETE`

### 请求参数

#### 路径参数

|名称|类型|必选|说明|
|---|---|---|---|
|id|integer|是|待办ID|

### Response:

> 返回示例

```json
{ "code": 0, "msg": "success" }
```

---

# 显示推送

## 推送图片到设备


- URL: `https://cloud.zectrix.com/open/v1/devices/{{deviceId}}/display/image`
- Request Type: `POST`
- CURL 示例：
```bash
curl \
  -X POST \
  "https://cloud.zectrix.com/open/v1/devices/{{deviceId}}/display/image" \
  -H "X-API-Key: {{api_key_string}}" \
  -F "images=@/path/to/image.png" \
  -F "dither=true" \
  -F "pageId=1"
```

### 请求参数

#### 路径参数

|名称|类型|必选|说明|
|---|---|---|---|
|deviceId|string|是|设备ID(MAC地址)|

#### 表单参数
|名称|类型|必选|说明|
|---|---|---|---|
|images|file| 是 | 图片文件，支持多张(最多5张)，单张不超过2MB |
|dither|boolean| 否 |是否使用抖动算法(默认true)，关闭则使用硬阈值二值化|
|pageId|string|否|页面编号(1-5)，指定后会持久化存储|

### Response:

> 返回示例

```json
{
  "code": 0,
  "data": {
    "totalPages": 1,
    "pushedPages": 1,
    "pageId": "1"
  }
}
```

## 推送文本到设备

- URL: `https://cloud.zectrix.com/open/v1/devices/{{deviceId}}/display/text`
- Request Type: `POST`

### 请求参数

#### 路径参数

|名称|类型|必选|说明|
|---|---|---|---|
|deviceId|string|是|设备ID(MAC地址)|

#### 请求体参数

|名称|类型|必选|说明|
|---|---|---|---|
|text|string| 是 | 文本内容(最多5000字)，支持换行 |
|fontSize|integer| 否 |字体大小(12-48，默认20)|
|pageId|string|否|页面编号(1-5)，指定后会持久化存储|

- Request Body 示例：

```json
{
  "text": "今日天气：晴\\n温度：25°C",
  "fontSize": 20,
  "pageId": "1"
}
```

### Response:

> 返回示例

```json
{
  "code": 0,
  "data": {
    "totalPages": 1,
    "pushedPages": 1,
    "pageId": "1"
  }
}
```

## 推送标题+正文到设备

- URL: `https://cloud.zectrix.com/open/v1/devices/{{deviceId}}/display/structured-text`
- Request Type: `POST`

### 请求参数

#### 路径参数

|名称|类型|必选|说明|
|---|---|---|---|
|deviceId|string|是|设备ID(MAC地址)|

#### 请求体参数

|名称|类型|必选|说明|
|---|---|---|---|
|title|string| 否 | 标题文本(最多200字)，与body至少填一项 |
|body|string| 否 |正文内容(最多5000字)，支持换行|
|pageId|string|否|页面编号(1-5)，指定后会持久化存储|

- Request Body 示例：

```json
{
  "title": "会议提醒",
  "body": "15:00 三楼会议室\\n请带笔记本",
  "pageId": "1"
}
```

### Response:

> 返回示例

```json
{
  "code": 0,
  "data": {
    "totalPages": 1,
    "pushedPages": 1,
    "pageId": "1"
  }
}
```

## 删除页面(不传则删除全部页面)

- URL: `https://cloud.zectrix.com/open/v1/devices/{{deviceId}}/display/pages/{{id}}`
- Request Type: `DELETE`

### 请求参数

#### 路径参数

|名称|类型|必选|说明|
|---|---|---|---|
|deviceId|string|是|设备ID(MAC地址)|
|pageId|string|否|页面编号，不传则删除全部页面|

### Response:

> 返回示例

```json
{ "code": 0, "msg": "success" }
```


