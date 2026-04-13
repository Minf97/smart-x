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

- 每次 webhook 进来的报警，都应当新增一条记录
- `groupKey` 只代表报警类别，不代表唯一记录
- 相同 `groupKey` 的多条报警，不应互相覆盖
- 前端未来可以按 `groupKey` 做分组展示
- 分组后的数量，就是同组报警记录数

也就是说：

- 后端负责保留原始报警记录
- 前端负责按 `groupKey` 聚合同类报警

当前代码里 `projectId + groupKey` 的覆盖写法，只是临时实现，不是最终模型。

最终我们要的效果是：

- 连续进来 10 条同类报警
- 数据库里有 10 条记录
- 前端列表可以选择：
  - 展示原始记录
  - 或按 `groupKey` 分组后展示 1 组

这样做的好处是：

- 原始数据不会丢
- 后续统计更准确
- 前端分组更灵活
- 未来也能按时间、环境、版本再做二次聚合

## 8. 下一步

这条链路通了以后，下一步就做：

- Electron 拉远端 alerts
- 增量同步到本地 SQLite
- 前端继续只读本地数据
