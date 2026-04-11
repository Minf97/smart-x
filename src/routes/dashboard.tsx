import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Check, ChevronDown, Circle, Settings, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ToggleTheme from "@/components/toggle-theme";

// Mock 数据 - 报警列表
const mockAlerts = [
  {
    id: "ENG-2498",
    title: "TypeError: Cannot read property 'map' of undefined",
    source: "Frontend App",
    level: "P0",
    status: "active",
    timestamp: "2 mins ago",
  },
  {
    id: "ENG-2380",
    title: "API Timeout /api/users endpoint",
    source: "Backend API",
    level: "P1",
    status: "active",
    timestamp: "5 mins ago",
  },
  {
    id: "ENG-2039",
    title: "Memory leak detected in Node worker process",
    source: "Node Service",
    level: "P2",
    status: "investigating",
    timestamp: "15 mins ago",
  },
  {
    id: "ENG-2076",
    title: "Database connection pool exhausted",
    source: "PostgreSQL",
    level: "P0",
    status: "active",
    timestamp: "1 hour ago",
  },
  {
    id: "ENG-2108",
    title: "Rate limit exceeded on payment gateway",
    source: "API Gateway",
    level: "P1",
    status: "investigating",
    timestamp: "2 hours ago",
  },
  {
    id: "ENG-2143",
    title: "Redis cache miss rate above threshold",
    source: "Redis Cluster",
    level: "P2",
    status: "backlog",
    timestamp: "3 hours ago",
  },
  {
    id: "ENG-2187",
    title: "S3 upload timeout for large files",
    source: "Storage Service",
    level: "P1",
    status: "resolved",
    timestamp: "5 hours ago",
  },
  {
    id: "ENG-2219",
    title: "WebSocket connection drops frequently",
    source: "Real-time Service",
    level: "P0",
    status: "active",
    timestamp: "6 hours ago",
  },
];

function DashboardPage() {
  const [selectedAlert, setSelectedAlert] = useState(mockAlerts[0]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 获取状态图标和颜色
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Circle className="w-4 h-4 text-red-500 fill-red-500" />;
      case "investigating":
        return <Circle className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
      case "resolved":
        return <Check className="w-4 h-4 text-green-500" />;
      case "backlog":
        return <Circle className="w-4 h-4 text-gray-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (level: string) => {
    const colors = {
      P0: "bg-red-500/10 text-red-500 border-red-500/20",
      P1: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      P2: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      P3: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return colors[level as keyof typeof colors] || colors.P3;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-red-500/10 text-red-500",
      investigating: "bg-blue-500/10 text-blue-500",
      resolved: "bg-green-500/10 text-green-500",
      backlog: "bg-gray-500/10 text-gray-500",
    };
    return colors[status as keyof typeof colors] || "bg-gray-500/10 text-gray-500";
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 - 报警列表 */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* 顶部 - 项目切换器（类似 Linear） */}
        <div className="px-4 py-3 border-b border-border">
          <Button
            variant="ghost"
            className="w-full justify-between h-9 px-3 hover:bg-secondary/80"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium text-sm">AI Alert Dashboard</span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        {/* 顶部工具栏 */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="font-medium">All Alerts</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground/60">{mockAlerts.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <ToggleTheme />
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* 报警列表 - 紧凑单行样式 */}
        <ScrollArea className="flex-1">
          <div className="py-1">
            {mockAlerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                onMouseEnter={() => setHoveredId(alert.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`
                  w-full px-3 py-1.5 text-left transition-colors duration-150 cursor-pointer
                  flex items-center gap-2 group
                  ${
                    selectedAlert.id === alert.id
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  }
                `}
              >
                {/* 状态图标 */}
                <div className="shrink-0">
                  {getStatusIcon(alert.status)}
                </div>

                {/* ID */}
                <span className="shrink-0 text-xs text-muted-foreground font-mono w-16">
                  {alert.id}
                </span>

                {/* 报警标题 */}
                <span className="flex-1 text-sm truncate">
                  {alert.title}
                </span>

                {/* 时间戳（Hover 时显示） */}
                {hoveredId === alert.id && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {alert.timestamp}
                  </span>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* 主内容区 - 报警详情 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部标题栏 */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(selectedAlert.status)}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {selectedAlert.id}
                  </span>
                  <Badge variant="outline" className={getPriorityColor(selectedAlert.level)}>
                    {selectedAlert.level}
                  </Badge>
                  <Badge variant="secondary" className={getStatusColor(selectedAlert.status)}>
                    {selectedAlert.status}
                  </Badge>
                </div>
                <h2 className="text-xl font-semibold">{selectedAlert.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 详情内容 */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6 max-w-4xl">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Source</span>
                <p className="mt-1 font-medium">{selectedAlert.source}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Reported</span>
                <p className="mt-1 font-medium">{selectedAlert.timestamp}</p>
              </div>
            </div>

            <Separator />

            {/* Stack Trace */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Stack Trace</h3>
              <div className="bg-secondary/30 p-4 rounded-lg font-mono text-xs border border-border">
                <pre className="whitespace-pre-wrap text-muted-foreground">
                  {`TypeError: Cannot read property 'map' of undefined
    at HomePage.render (src/pages/HomePage.tsx:45:12)
    at renderComponent (react-dom.js:234:45)
    at updateComponent (react-dom.js:456:23)`}
                </pre>
              </div>
            </div>

            <Separator />

            {/* AI Analysis */}
            <div>
              <h3 className="text-sm font-semibold mb-3">AI Analysis</h3>
              <div className="space-y-3">
                <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Root Cause</h4>
                  <p className="text-sm text-muted-foreground">
                    The component is trying to map over a data array that hasn't been initialized yet.
                    This typically happens when API data is accessed before the request completes.
                  </p>
                </div>

                <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Suggested Fix</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add a loading state check or provide a default empty array.
                  </p>
                  <div className="bg-secondary/50 p-3 rounded-md font-mono text-xs border border-border">
                    <pre className="whitespace-pre-wrap">
                      {`{data?.items?.map(item => ...) || []}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Recent Activity */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Activity</h3>
              <div className="space-y-3">
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                  <div className="flex-1">
                    <p>Alert created - AI analysis started</p>
                    <p className="text-xs text-muted-foreground mt-0.5">2 mins ago</p>
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <div className="flex-1">
                    <p>Code context retrieved</p>
                    <p className="text-xs text-muted-foreground mt-0.5">1 min ago</p>
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0" />
                  <div className="flex-1">
                    <p>Fix suggestion generated</p>
                    <p className="text-xs text-muted-foreground mt-0.5">30 secs ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* 底部操作按钮 */}
        <div className="px-6 py-4 border-t border-border">
          <div className="flex gap-2">
            <Button size="sm">Create PR/MR</Button>
            <Button variant="outline" size="sm">Mark as Resolved</Button>
            <Button variant="ghost" size="sm">
              <X className="w-4 h-4 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});
