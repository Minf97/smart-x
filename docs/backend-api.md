# 后端联调

这一步先验证最小链路：

- 创建项目
- 拿到 webhook
- 手动推一条报警
- 拉取报警列表

## 1. 准备地址

把下面地址换成你的线上后端：

```bash
export BASE_URL="https://smart-x-theta.vercel.app"
```

先看健康检查：

```bash
curl -sS "$BASE_URL/health"
```

预期返回：

```json
{"ok":true,"databaseConfigured":true}
```

如果浏览器可以访问但终端、Node 或 Electron 请求超时，先按
[本地代理排查 SOP](./local-proxy-sop.md) 检查代理和 DNS，不要先改
`BASE_URL`。

## 2. 创建项目

```bash
curl -sS -X POST "$BASE_URL/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Project"
  }'
```

预期返回：

```json
{
  "id": "pj_xxx",
  "name": "Demo Project",
  "webhookId": "wk_xxx",
  "webhookUrl": "https://.../ingest/wk_xxx",
  "webhookEnabled": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

把这三个值记下来：

- `projectId`
- `webhookId`
- `webhookUrl`

## 3. 推送一条报警

如果你已经拿到 `webhookUrl`，直接发：

```bash
curl -sS -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TypeError: Cannot read properties of undefined",
    "message": "Cannot read properties of undefined (reading map)",
    "stack": "TypeError: Cannot read properties of undefined (reading map)\n    at HomePage.render (src/pages/HomePage.tsx:45:12)",
    "source": "frontend",
    "environment": "production",
    "priority": "P0",
    "count": 1,
    "sourceUrl": "https://example.com/home",
    "occurredAt": "2026-04-14T10:00:00.000Z"
  }'
```

如果你只记了 `webhookId`：

```bash
curl -sS -X POST "$BASE_URL/ingest/$WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TypeError: Cannot read properties of undefined",
    "message": "Cannot read properties of undefined (reading map)",
    "stack": "TypeError: Cannot read properties of undefined (reading map)\n    at HomePage.render (src/pages/HomePage.tsx:45:12)",
    "source": "frontend",
    "environment": "production",
    "priority": "P0",
    "count": 1,
    "sourceUrl": "https://example.com/home",
    "occurredAt": "2026-04-14T10:00:00.000Z"
  }'
```

预期返回：

```json
{
  "ok": true,
  "projectId": "pj_xxx",
  "alertId": "al_xxx"
}
```

## 4. 拉取报警列表

```bash
curl -sS "$BASE_URL/projects/$PROJECT_ID/alerts"
```

预期返回：

```json
{
  "alerts": [
    {
      "id": "al_xxx",
      "projectId": "pj_xxx",
      "title": "TypeError: Cannot read properties of undefined",
      "groupKey": "...",
      "status": "backlog",
      "priority": "P0",
      "isRead": false,
      "isSyncedLocal": false,
      "detail": {
        "error": {
          "message": "Cannot read properties of undefined (reading map)"
        },
        "summary": {
          "source": "frontend",
          "environment": "production"
        }
      }
    }
  ]
}
```

当前这个接口默认只返回待同步报警：

```bash
curl -sS "$BASE_URL/projects/$PROJECT_ID/alerts"
```

本地落库成功后，再回执已同步：

```bash
curl -i -X POST "$BASE_URL/projects/$PROJECT_ID/alerts/sync-ack" \
  -H "Content-Type: application/json" \
  -d '{
    "alertIds": ["al_xxx"]
  }'
```

预期返回：

- 状态码 `204 No Content`
- 不返回业务数据

## 5. 一条命令跑通

如果你本机有 `jq`，可以直接整条跑完：

```bash
export BASE_URL="https://smart-5rm6mqfqb-minf97s-projects.vercel.app"

PROJECT_JSON=$(curl -sS -X POST "$BASE_URL/projects" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Project"}')

PROJECT_ID=$(printf '%s' "$PROJECT_JSON" | jq -r '.id')
WEBHOOK_URL=$(printf '%s' "$PROJECT_JSON" | jq -r '.webhookUrl')

curl -sS -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TypeError: Cannot read properties of undefined",
    "message": "Cannot read properties of undefined (reading map)",
    "stack": "TypeError: Cannot read properties of undefined (reading map)\n    at HomePage.render (src/pages/HomePage.tsx:45:12)",
    "source": "frontend",
    "environment": "production",
    "priority": "P0",
    "count": 1,
    "sourceUrl": "https://example.com/home",
    "occurredAt": "2026-04-14T10:00:00.000Z"
  }'

curl -sS "$BASE_URL/projects/$PROJECT_ID/alerts"
```

## 6. 当前验收点

只要下面三件事成立，就说明远端 MVP 已经通了：

- `/projects` 能创建项目
- `/ingest/:webhookId` 能落一条报警
- `/projects/:projectId/alerts` 能查回这条报警

## 7. 数据模型约定

这里补充一个已经确认的建模约定：

- Remote Backend 按 `projectId + groupKey` 聚合同类报警。
- 如果上报 payload 显式传入 `groupKey`，直接使用该值。
- 如果没有传 `groupKey`，Remote Backend 会按 `title` 生成稳定分组键。
- 相同 `groupKey` 的新报警会更新原有记录，并累计 `occurrenceCount`。
- 左侧列表按 group 展示，一组只展示一行。

也就是说：

- 连续进来 10 条同标题报警
- 数据库里保留 1 条聚合记录
- `occurrenceCount` 显示为 10
- 最近时间、最高优先级和最新错误内容会更新到该记录

## 8. 下一步

这条链路通了以后，下一步就做：

- 根据本地 AI 配置处理报警
- 读取本地托管仓库上下文
- 生成修复 patch 并提交 PR/MR

## 9. 鉴权存档

这里记录一下当前阶段的鉴权结论，避免后面重复讨论。

### 当前状态

现在远端后端还没有用户鉴权。

也就是说：

- `POST /projects` 不区分用户
- `GET /projects/:projectId/alerts` 不校验用户身份
- `POST /projects/:projectId/alerts/sync-ack` 也不校验用户身份
- `POST /ingest/:webhookId` 只依赖 `webhookId`

当前更接近一个无鉴权 MVP：

- `projectId` 只是随机资源 ID
- `webhookId` 更像写入密钥

### 当前风险

这种方式只能算弱保护，不算真正权限控制。

主要问题：

- 只要知道 `projectId`，理论上就能拉取该项目报警
- 只要知道 `webhookId`，理论上就能向该项目写入报警
- 现在没有“这个 project 属于哪个用户”的正式模型

所以当前方案只适合前期验证链路，不适合正式生产安全要求。

### 为什么暂时不加

当前项目还没有完整用户体系，包括：

- 登录注册
- 用户会话
- 多设备同步
- 账号级项目管理

如果现在强行加入完整鉴权，会明显拉长 MVP 链路。

当前阶段优先级仍然是：

- 接入真实报警
- 同步到本地
- 本地 AI 修复
- 创建 PR/MR

### 后续方向

后续大概率还是需要正式用户鉴权机制。

但这件事暂时先不做，等核心链路稳定后再设计。

后面再展开时，至少要回答这几个问题：

- 用户如何登录
- 项目如何归属到用户
- 多设备如何共享同一个项目
- webhook 如何绑定到用户项目
- 远端读写接口如何做权限校验

### 当前结论

最终结论是：

- 现在先不加用户鉴权
- 先把报警 -> 同步 -> 修复 -> PR 这条主链路打通
- 鉴权保留为后续正式设计项
