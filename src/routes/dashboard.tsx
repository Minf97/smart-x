import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Circle,
  Search,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import HeaderLangToggle from "@/components/header-lang-toggle";
import ToggleTheme from "@/components/toggle-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  ITEM_PRIORITY_I18N_KEYS,
  ITEM_STATUS_I18N_KEYS,
  type Item,
  type ItemPriority,
  type ItemStatus,
} from "@/types/alert";

// Mock 数据
const mockAlerts: Item[] = [
  {
    id: "ENG-2498",
    title: "TypeError: Cannot read property 'map' of undefined",
    status: "in_progress",
    priority: "P0",
    detail: {
      summary: {
        source: "Frontend App",
        environment: "production",
        version: "1.8.2",
        firstSeenAt: "10 mins ago",
        lastSeenAt: "2 mins ago",
        occurrenceCount: 24,
      },
      error: {
        message: "TypeError: Cannot read property 'map' of undefined",
        stack: `TypeError: Cannot read property 'map' of undefined
at HomePage.render (src/pages/HomePage.tsx:45:12)
at renderComponent (react-dom.js:234:45)
at updateComponent (react-dom.js:456:23)`,
        fingerprint: "home-page-map-undefined",
      },
      analysis: {
        rootCause:
          "The component reads list data before the request is ready, so the map call receives undefined.",
        impact:
          "This issue affects the home page in production and can block page rendering for users who hit this request path.",
        codeLocations: [
          {
            filePath: "src/pages/HomePage.tsx",
            line: 45,
            column: 12,
            snippet: "{data?.items?.map(item => ...)}",
            symbolName: "HomePage.render",
            reason: "Stack trace points to the first map call.",
          },
        ],
        fixSuggestions: [
          {
            summary: "Guard against empty data before rendering the list.",
            patch: "{data?.items?.map(item => ...) ?? null}",
            risk: "Low risk, but verify empty-state rendering.",
            verification: "Test first render before API data resolves.",
          },
        ],
      },
    },
  },
  {
    id: "ENG-2380",
    title: "API Timeout /api/users endpoint",
    status: "todo",
    priority: "P1",
    detail: {
      summary: {
        source: "Backend API",
        environment: "production",
        version: "2.3.0",
        firstSeenAt: "18 mins ago",
        lastSeenAt: "5 mins ago",
        occurrenceCount: 11,
      },
      error: {
        message: "API Timeout /api/users endpoint",
        stack: "TimeoutError: request timed out at GET /api/users",
        fingerprint: "api-users-timeout",
      },
      analysis: {
        rootCause:
          "The users endpoint exceeds the gateway timeout under heavy query load.",
        impact:
          "User profile and admin list views may fail to load for active sessions.",
      },
    },
  },
  {
    id: "ENG-2039",
    title: "Memory leak detected in Node worker process",
    status: "in_review",
    priority: "P2",
    detail: {
      summary: {
        source: "Node Service",
        environment: "staging",
        version: "0.9.1",
        firstSeenAt: "25 mins ago",
        lastSeenAt: "15 mins ago",
        occurrenceCount: 3,
      },
      error: {
        message: "Memory leak detected in Node worker process",
        stack: "WorkerHeapWarning: retained objects keep growing",
        fingerprint: "node-worker-memory-leak",
      },
    },
  },
  {
    id: "ENG-2076",
    title: "Database connection pool exhausted",
    status: "backlog",
    priority: "P0",
    detail: {
      summary: {
        source: "PostgreSQL",
        environment: "production",
        version: "2.3.0",
        firstSeenAt: "3 hours ago",
        lastSeenAt: "1 hour ago",
        occurrenceCount: 6,
      },
      error: {
        message: "Database connection pool exhausted",
        stack: "PoolError: no connections available",
        fingerprint: "db-pool-exhausted",
      },
    },
  },
  {
    id: "ENG-2108",
    title: "Rate limit exceeded on payment gateway",
    status: "duplicate",
    priority: "P1",
    detail: {
      summary: {
        source: "API Gateway",
        environment: "production",
        version: "2.3.0",
        firstSeenAt: "4 hours ago",
        lastSeenAt: "2 hours ago",
        occurrenceCount: 42,
      },
      error: {
        message: "Rate limit exceeded on payment gateway",
        stack: "GatewayError: too many payment requests",
        fingerprint: "payment-rate-limit",
      },
    },
  },
  {
    id: "ENG-2143",
    title: "Redis cache miss rate above threshold",
    status: "canceled",
    priority: "P2",
    detail: {
      summary: {
        source: "Redis Cluster",
        environment: "staging",
        version: "2.2.7",
        firstSeenAt: "5 hours ago",
        lastSeenAt: "3 hours ago",
        occurrenceCount: 7,
      },
      error: {
        message: "Redis cache miss rate above threshold",
        stack: "MonitorNotice: cache miss rate > 40%",
        fingerprint: "redis-cache-miss",
      },
    },
  },
  {
    id: "ENG-2187",
    title: "S3 upload timeout for large files",
    status: "done",
    priority: "P1",
    detail: {
      summary: {
        source: "Storage Service",
        environment: "production",
        version: "2.3.0",
        firstSeenAt: "8 hours ago",
        lastSeenAt: "5 hours ago",
        occurrenceCount: 2,
      },
      error: {
        message: "S3 upload timeout for large files",
        stack: "UploadTimeout: multipart upload timed out",
        fingerprint: "s3-upload-timeout",
      },
    },
  },
  {
    id: "ENG-2219",
    title: "WebSocket connection drops frequently",
    status: "todo",
    priority: "P0",
    detail: {
      summary: {
        source: "Real-time Service",
        environment: "production",
        version: "1.5.4",
        firstSeenAt: "10 hours ago",
        lastSeenAt: "6 hours ago",
        occurrenceCount: 17,
      },
      error: {
        message: "WebSocket connection drops frequently",
        stack: "SocketError: connection closed unexpectedly",
        fingerprint: "ws-connection-drops",
      },
    },
  },
];

function DashboardPage() {
  const { t } = useTranslation();
  const [selectedAlert, setSelectedAlert] = useState(mockAlerts[0]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 状态图标
  const getStatusIcon = (status: ItemStatus) => {
    switch (status) {
      case "done":
        return <Check className="h-3.5 w-3.5 text-green-500" />;
      case "in_progress":
        return <Circle className="h-3.5 w-3.5 fill-blue-500 text-blue-500" />;
      case "in_review":
        return (
          <Circle className="h-3.5 w-3.5 fill-violet-500 text-violet-500" />
        );
      case "todo":
        return (
          <Circle className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
        );
      case "duplicate":
        return (
          <Circle className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
        );
      case "canceled":
        return <Circle className="h-3.5 w-3.5 fill-zinc-500 text-zinc-500" />;
      case "backlog":
        return <Circle className="h-3.5 w-3.5 fill-gray-400 text-gray-400" />;
      default:
        return <Circle className="h-3.5 w-3.5 fill-gray-400 text-gray-400" />;
    }
  };

  // 优先级色
  const getPriorityColor = (priority: ItemPriority) => {
    const colors = {
      P0: "bg-red-500/10 text-red-500 border-red-500/20",
      P1: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      P2: "bg-green-500/10 text-green-500 border-green-500/20",
    };

    return colors[priority];
  };

  // 状态色
  const getStatusColor = (status: ItemStatus) => {
    const colors = {
      backlog: "bg-gray-500/10 text-gray-500",
      todo: "bg-yellow-500/10 text-yellow-500",
      in_progress: "bg-blue-500/10 text-blue-500",
      in_review: "bg-violet-500/10 text-violet-500",
      done: "bg-green-500/10 text-green-500",
      canceled: "bg-zinc-500/10 text-zinc-500",
      duplicate: "bg-orange-500/10 text-orange-500",
    };

    return colors[status];
  };

  // 状态文案
  const getStatusLabel = (status: ItemStatus) => {
    return t(ITEM_STATUS_I18N_KEYS[status]);
  };

  // 优先文案
  const getPriorityLabel = (priority: ItemPriority) => {
    return t(ITEM_PRIORITY_I18N_KEYS[priority]);
  };

  // 最近时间
  const getLastSeen = (item: Item) => {
    return (
      item.detail.summary.lastSeenAt ?? item.detail.summary.firstSeenAt ?? "-"
    );
  };

  // 根因文案
  const getRootCause = (item: Item) => {
    return item.detail.analysis?.rootCause ?? "-";
  };

  // 修复摘要
  const getFixSummary = (item: Item) => {
    return item.detail.analysis?.fixSuggestions?.[0]?.summary ?? "-";
  };

  // 修复补丁
  const getFixPatch = (item: Item) => {
    return item.detail.analysis?.fixSuggestions?.[0]?.patch ?? "-";
  };

  // 堆栈文案
  const getStack = (item: Item) => {
    return item.detail.error.stack ?? item.detail.error.message;
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full bg-background">
        {/* 侧栏 */}
        <Sidebar className="border-r" variant="inset">
          <SidebarHeader className="border-b">
            <Button
              className="h-9 w-full justify-between px-3 hover:bg-accent"
              variant="ghost"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium text-sm">
                  {t("dashboard.title")}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </SidebarHeader>

          {/* 统计栏 */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <span className="font-medium">{t("dashboard.allAlerts")}</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="text-muted-foreground/60">
                {mockAlerts.length}
              </span>
            </div>
            <Button className="h-7 w-7" size="icon" variant="ghost">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>

          <SidebarContent className="px-0">
            <SidebarMenu className="gap-0 px-2">
              {mockAlerts.map((alert) => (
                <SidebarMenuItem key={alert.id}>
                  <SidebarMenuButton
                    className="h-8 gap-2 px-2 hover:bg-accent"
                    isActive={selectedAlert.id === alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    onMouseEnter={() => setHoveredId(alert.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* 图标 */}
                    <div className="shrink-0">
                      {getStatusIcon(alert.status)}
                    </div>

                    {/* 编号 */}
                    <span className="w-16 shrink-0 font-mono text-muted-foreground text-xs">
                      {alert.id}
                    </span>

                    {/* 标题 */}
                    <span className="flex-1 truncate text-xs">
                      {alert.title}
                    </span>

                    {/* 时间 */}
                    {hoveredId === alert.id && (
                      <span className="shrink-0 text-muted-foreground text-xs">
                        {getLastSeen(alert)}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>

        {/* 主区 */}
        <SidebarInset>
          <div className="flex h-full flex-col">
            {/* 顶栏 */}
            <header className="flex items-center gap-4 border-b px-4 py-3">
              <SidebarTrigger />
              <div className="max-w-md flex-1">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 pl-9"
                    placeholder={t("dashboard.searchPlaceholder")}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <HeaderLangToggle />
                <ToggleTheme />
              </div>
            </header>

            {/* 详情头 */}
            <div className="border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedAlert.status)}
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-muted-foreground text-xs">
                        {selectedAlert.id}
                      </span>
                      <Badge
                        className={getPriorityColor(selectedAlert.priority)}
                        variant="outline"
                      >
                        {getPriorityLabel(selectedAlert.priority)}
                      </Badge>
                      <Badge
                        className={getStatusColor(selectedAlert.status)}
                        variant="secondary"
                      >
                        {getStatusLabel(selectedAlert.status)}
                      </Badge>
                    </div>
                    <h2 className="font-semibold text-xl">
                      {selectedAlert.title}
                    </h2>
                  </div>
                </div>

                <Button className="h-8 w-8" size="icon" variant="ghost">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 详情体 */}
            <div className="flex-1 overflow-auto">
              <div className="max-w-4xl space-y-6 p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {t("dashboard.source")}
                    </span>
                    <p className="mt-1 font-medium">
                      {selectedAlert.detail.summary.source}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("dashboard.reported")}
                    </span>
                    <p className="mt-1 font-medium">
                      {getLastSeen(selectedAlert)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-3 font-semibold text-sm">
                    {t("dashboard.stackTrace")}
                  </h3>
                  <div className="rounded-lg border bg-muted/30 p-4 font-mono text-xs">
                    <pre className="whitespace-pre-wrap text-muted-foreground">
                      {getStack(selectedAlert)}
                    </pre>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-3 font-semibold text-sm">
                    {t("dashboard.analysis")}
                  </h3>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                      <h4 className="mb-2 font-medium text-sm">
                        {t("dashboard.rootCause")}
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        {getRootCause(selectedAlert)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                      <h4 className="mb-2 font-medium text-sm">
                        {t("dashboard.suggestedFix")}
                      </h4>
                      <p className="mb-3 text-muted-foreground text-sm">
                        {getFixSummary(selectedAlert)}
                      </p>
                      <div className="rounded-md border bg-muted/50 p-3 font-mono text-xs">
                        <pre className="whitespace-pre-wrap">
                          {getFixPatch(selectedAlert)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-3 font-semibold text-sm">
                    {t("dashboard.activity")}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex gap-3 text-sm">
                      <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                      <div className="flex-1">
                        <p>{t("dashboard.analysisStarted")}</p>
                        <p className="mt-0.5 text-muted-foreground text-xs">
                          {getLastSeen(selectedAlert)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      <div className="flex-1">
                        <p>{t("dashboard.contextRetrieved")}</p>
                        <p className="mt-0.5 text-muted-foreground text-xs">
                          1 min ago
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
                      <div className="flex-1">
                        <p>{t("dashboard.fixGenerated")}</p>
                        <p className="mt-0.5 text-muted-foreground text-xs">
                          30 secs ago
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 底栏 */}
            <div className="border-t px-6 py-4">
              <div className="flex gap-2">
                <Button size="sm">{t("dashboard.createPr")}</Button>
                <Button size="sm" variant="outline">
                  {t("dashboard.markResolved")}
                </Button>
                <Button size="sm" variant="ghost">
                  {t("dashboard.dismiss")}
                </Button>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});
