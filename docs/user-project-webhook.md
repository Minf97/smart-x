# User Project Webhook 接入示例

本文说明 User Project 如何把 Alert 上报到 AI Alert Platform。当前推荐方式是：原有飞书、Sentry 或监控通知保持不变，同时新增一份 webhook 上报到 Remote Backend。

## 1. 获取 Webhook

在 Desktop Agent 里创建 User Project 后，会得到一个 webhook URL：

```text
https://your-backend.example.com/ingest/wk_xxx
```

这个地址只负责接收 Alert。MVP 阶段它相当于写入密钥，不要放在公开页面源码里；浏览器端示例适合本地验证或内网应用，生产公网前端建议先发到自己的服务端，再由服务端转发。

## 2. Alert 字段

最小可用字段：

```json
{
  "title": "TypeError: Cannot read properties of undefined",
  "message": "Cannot read properties of undefined (reading map)",
  "stack": "TypeError: Cannot read properties of undefined (reading map)\n    at UserList (src/pages/UserList.tsx:42:18)",
  "source": "frontend",
  "environment": "production",
  "priority": "P1",
  "sourceUrl": "https://example.com/users",
  "occurredAt": "2026-05-15T04:00:00.000Z"
}
```

字段约定：

- `title`：Alert 标题。
- `message`：错误信息。
- `stack`：堆栈，建议保留文件路径和行号。
- `source`：来源，例如 `frontend`、`node-api`、`worker`。
- `environment`：环境，例如 `production`、`staging`。
- `priority`：支持 `P0`、`P1`、`P2`；不传时 Remote Backend 会按 `severity` 兜底映射。
- `sourceUrl`：出错页面、接口或监控链接。
- `occurredAt`：ISO 时间；不传时使用 Remote Backend 收到的时间。
- `groupKey`：可选。同类 Alert 的稳定分组键；不传时 Remote Backend 会按 `title` 生成并聚合。
- `rawAlert`：不需要手动传，Remote Backend 会保存原始 payload。

## 3. 浏览器端最小示例

只用于验证或可信内网环境。公网前端不要直接暴露 webhook URL。

```ts
const ALERT_WEBHOOK_URL = "https://your-backend.example.com/ingest/wk_xxx";

// 上报警报
async function reportAlert(error: Error, context: Record<string, unknown> = {}) {
  await fetch(ALERT_WEBHOOK_URL, {
    body: JSON.stringify({
      environment: "production",
      message: error.message,
      source: "frontend",
      stack: error.stack,
      title: error.name || "Browser error",
      ...context,
      occurredAt: new Date().toISOString(),
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

window.addEventListener("error", (event) => {
  const error =
    event.error instanceof Error
      ? event.error
      : new Error(event.message || "Unknown browser error");

  reportAlert(error, {
    sourceUrl: window.location.href,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const error = reason instanceof Error ? reason : new Error(String(reason));

  reportAlert(error, {
    sourceUrl: window.location.href,
    title: "Unhandled promise rejection",
  });
});
```

## 4. React Error Boundary 示例

适合捕获 React 渲染阶段错误。建议仍由服务端代理 webhook，避免把真实 webhook URL 放进公网 bundle。

```tsx
import type { ErrorInfo, PropsWithChildren } from "react";
import { Component } from "react";

const ALERT_WEBHOOK_URL = "https://your-backend.example.com/ingest/wk_xxx";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class AlertErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  // 更新视图
  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  // 上报错误
  componentDidCatch(error: Error, info: ErrorInfo) {
    fetch(ALERT_WEBHOOK_URL, {
      body: JSON.stringify({
        environment: "production",
        message: error.message,
        source: "react",
        sourceUrl: window.location.href,
        stack: `${error.stack || ""}\n${info.componentStack}`,
        title: error.name || "React render error",
        occurredAt: new Date().toISOString(),
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }).catch((reportError) => {
      console.error("Failed to report alert", reportError);
    });
  }

  // 渲染内容
  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
```

使用：

```tsx
<AlertErrorBoundary>
  <App />
</AlertErrorBoundary>
```

## 5. Node 服务端示例

服务端接入是当前最推荐的方式：webhook URL 留在服务端环境变量中，User Project 可以统一封装上报函数。

```ts
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

if (!ALERT_WEBHOOK_URL) {
  throw new Error("ALERT_WEBHOOK_URL is required.");
}

interface ReportServerAlertInput {
  error: Error;
  path?: string;
  requestId?: string;
}

// 上报服务
export async function reportServerAlert(input: ReportServerAlertInput) {
  const response = await fetch(ALERT_WEBHOOK_URL, {
    body: JSON.stringify({
      environment: process.env.NODE_ENV || "development",
      message: input.error.message,
      source: "node-api",
      sourceUrl: input.path,
      stack: input.error.stack,
      title: input.error.name || "Node server error",
      occurredAt: new Date().toISOString(),
      requestId: input.requestId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Alert webhook failed: ${response.status}`);
  }
}
```

Express 中使用：

```ts
app.use((error, request, response, next) => {
  reportServerAlert({
    error,
    path: request.originalUrl,
    requestId: request.headers["x-request-id"]?.toString(),
  }).catch((reportError) => {
    console.error("Failed to report alert", reportError);
  });

  next(error);
});
```

## 6. 本地验收脚本

仓库内置了一个 Remote Backend webhook 验收脚本：

```bash
BASE_URL="http://localhost:8788" npm run verify:webhook
```

也可以显式传参：

```bash
npm run verify:webhook -- --base-url "https://your-backend.example.com" --ack
```

脚本会执行：

1. 调用 `/health`。
2. 调用 `/projects` 创建测试 User Project。
3. 向返回的 `webhookUrl` 上报一条测试 Alert。
4. 调用 `/projects/:projectId/alerts` 确认 Alert 可拉取。
5. 如果传入 `--ack`，再调用同步回执，并确认该 Alert 不再出现在待同步列表中。

## 7. Desktop Agent 验收

Remote Backend 验收通过后，再在 Desktop Agent 里验主链路：

1. 创建 User Project，并复制 webhook URL。
2. 用上面的浏览器、React 或 Node 示例发一条真实 Alert。
3. 在 Desktop Agent 点击同步，确认 Alert 出现在左侧列表。
4. 选择 Managed Repository，点击分析，确认生成 Analysis。
5. 点击创建 Code Request，确认远端 GitHub PR 或 GitLab MR 创建成功。
6. 合并 Code Request 后，确认 Alert 状态进入 `done`。
7. 关闭、忽略或标记重复后，确认详情里出现同组处理记录。

满足 1-6 代表 Phase 1 主链路可演示；第 7 步代表本地 Feedback Signal 已经进入 Phase 2。
