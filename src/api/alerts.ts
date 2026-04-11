import type { Item, ItemStatus } from "@/types/alert";

// Mock 数据
let mockAlerts: Item[] = [
  {
    detail: {
      analysis: {
        codeLocations: [
          {
            column: 12,
            filePath: "src/pages/HomePage.tsx",
            line: 45,
            reason: "Stack trace points to the first map call.",
            snippet: "{data?.items?.map(item => ...)}",
            symbolName: "HomePage.render",
          },
        ],
        fixSuggestions: [
          {
            patch: "{data?.items?.map(item => ...) ?? null}",
            risk: "Low risk, but verify empty-state rendering.",
            summary: "Guard against empty data before rendering the list.",
            verification: "Test first render before API data resolves.",
          },
        ],
        impact:
          "This issue affects the home page in production and can block page rendering for users who hit this request path.",
        rootCause:
          "The component reads list data before the request is ready, so the map call receives undefined.",
      },
      error: {
        fingerprint: "home-page-map-undefined",
        message: "TypeError: Cannot read property 'map' of undefined",
        stack: `TypeError: Cannot read property 'map' of undefined
at HomePage.render (src/pages/HomePage.tsx:45:12)
at renderComponent (react-dom.js:234:45)
at updateComponent (react-dom.js:456:23)`,
      },
      summary: {
        environment: "production",
        firstSeenAt: "10 mins ago",
        lastSeenAt: "2 mins ago",
        occurrenceCount: 24,
        source: "Frontend App",
        version: "1.8.2",
      },
    },
    id: "ENG-2498",
    priority: "P0",
    status: "in_progress",
    title: "TypeError: Cannot read property 'map' of undefined",
  },
  {
    detail: {
      analysis: {
        impact:
          "User profile and admin list views may fail to load for active sessions.",
        rootCause:
          "The users endpoint exceeds the gateway timeout under heavy query load.",
      },
      error: {
        fingerprint: "api-users-timeout",
        message: "API Timeout /api/users endpoint",
        stack: "TimeoutError: request timed out at GET /api/users",
      },
      summary: {
        environment: "production",
        firstSeenAt: "18 mins ago",
        lastSeenAt: "5 mins ago",
        occurrenceCount: 11,
        source: "Backend API",
        version: "2.3.0",
      },
    },
    id: "ENG-2380",
    priority: "P1",
    status: "todo",
    title: "API Timeout /api/users endpoint",
  },
  {
    detail: {
      error: {
        fingerprint: "node-worker-memory-leak",
        message: "Memory leak detected in Node worker process",
        stack: "WorkerHeapWarning: retained objects keep growing",
      },
      summary: {
        environment: "staging",
        firstSeenAt: "25 mins ago",
        lastSeenAt: "15 mins ago",
        occurrenceCount: 3,
        source: "Node Service",
        version: "0.9.1",
      },
    },
    id: "ENG-2039",
    priority: "P2",
    status: "in_review",
    title: "Memory leak detected in Node worker process",
  },
  {
    detail: {
      error: {
        fingerprint: "db-pool-exhausted",
        message: "Database connection pool exhausted",
        stack: "PoolError: no connections available",
      },
      summary: {
        environment: "production",
        firstSeenAt: "3 hours ago",
        lastSeenAt: "1 hour ago",
        occurrenceCount: 6,
        source: "PostgreSQL",
        version: "2.3.0",
      },
    },
    id: "ENG-2076",
    priority: "P0",
    status: "backlog",
    title: "Database connection pool exhausted",
  },
  {
    detail: {
      error: {
        fingerprint: "payment-rate-limit",
        message: "Rate limit exceeded on payment gateway",
        stack: "GatewayError: too many payment requests",
      },
      summary: {
        environment: "production",
        firstSeenAt: "4 hours ago",
        lastSeenAt: "2 hours ago",
        occurrenceCount: 42,
        source: "API Gateway",
        version: "2.3.0",
      },
    },
    id: "ENG-2108",
    priority: "P1",
    status: "duplicate",
    title: "Rate limit exceeded on payment gateway",
  },
  {
    detail: {
      error: {
        fingerprint: "redis-cache-miss",
        message: "Redis cache miss rate above threshold",
        stack: "MonitorNotice: cache miss rate > 40%",
      },
      summary: {
        environment: "staging",
        firstSeenAt: "5 hours ago",
        lastSeenAt: "3 hours ago",
        occurrenceCount: 7,
        source: "Redis Cluster",
        version: "2.2.7",
      },
    },
    id: "ENG-2143",
    priority: "P2",
    status: "canceled",
    title: "Redis cache miss rate above threshold",
  },
  {
    detail: {
      error: {
        fingerprint: "s3-upload-timeout",
        message: "S3 upload timeout for large files",
        stack: "UploadTimeout: multipart upload timed out",
      },
      summary: {
        environment: "production",
        firstSeenAt: "8 hours ago",
        lastSeenAt: "5 hours ago",
        occurrenceCount: 2,
        source: "Storage Service",
        version: "2.3.0",
      },
    },
    id: "ENG-2187",
    priority: "P1",
    status: "done",
    title: "S3 upload timeout for large files",
  },
  {
    detail: {
      error: {
        fingerprint: "ws-connection-drops",
        message: "WebSocket connection drops frequently",
        stack: "SocketError: connection closed unexpectedly",
      },
      summary: {
        environment: "production",
        firstSeenAt: "10 hours ago",
        lastSeenAt: "6 hours ago",
        occurrenceCount: 17,
        source: "Real-time Service",
        version: "1.5.4",
      },
    },
    id: "ENG-2219",
    priority: "P0",
    status: "todo",
    title: "WebSocket connection drops frequently",
  },
];

// 列表请求
export async function listAlerts() {
  // 模拟延迟
  await new Promise((resolve) => window.setTimeout(resolve, 120));

  return mockAlerts;
}

// 更新状态
export async function updateAlertStatus(id: string, status: ItemStatus) {
  // 模拟延迟
  await new Promise((resolve) => window.setTimeout(resolve, 360));

  const item = mockAlerts.find((alert) => alert.id === id);

  if (!item) {
    throw new Error("Alert not found.");
  }

  const updatedItem = {
    ...item,
    status,
  };

  mockAlerts = mockAlerts.map((alert) =>
    alert.id === id ? updatedItem : alert
  );

  return updatedItem;
}
