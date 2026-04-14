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
