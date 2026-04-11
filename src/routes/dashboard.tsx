import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Bell, Filter, Grid3x3, List, Search, Settings } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ToggleTheme from "@/components/toggle-theme";

// Mock 数据 - 报警列表
const mockAlerts = [
  {
    id: "1",
    title: "TypeError: Cannot read property",
    source: "Frontend App",
    level: "P0",
    status: "Active",
    timestamp: "2 mins ago",
    color: "red",
  },
  {
    id: "2",
    title: "API Timeout /api/users",
    source: "Backend API",
    level: "P1",
    status: "Active",
    timestamp: "5 mins ago",
    color: "orange",
  },
  {
    id: "3",
    title: "Memory leak detected",
    source: "Node Service",
    level: "P2",
    status: "Investigating",
    timestamp: "15 mins ago",
    color: "yellow",
  },
  {
    id: "4",
    title: "Database connection failed",
    source: "PostgreSQL",
    level: "P0",
    status: "Active",
    timestamp: "1 hour ago",
    color: "red",
  },
  {
    id: "5",
    title: "Rate limit exceeded",
    source: "API Gateway",
    level: "P3",
    status: "Resolved",
    timestamp: "2 hours ago",
    color: "green",
  },
];

function DashboardPage() {
  const [selectedAlert, setSelectedAlert] = useState(mockAlerts[0]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

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
      Active: "bg-red-500/10 text-red-500",
      Investigating: "bg-blue-500/10 text-blue-500",
      Resolved: "bg-green-500/10 text-green-500",
    };
    return colors[status as keyof typeof colors] || "bg-gray-500/10 text-gray-500";
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 - 报警列表 */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* 顶部标题栏 */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              AI Alert Dashboard
            </h1>
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              className="pl-9 bg-secondary/50"
            />
          </div>
        </div>

        {/* 过滤器和视图切换 */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            All statuses
          </Button>

          <div className="flex gap-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="w-8 h-8"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="w-8 h-8"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <ToggleTheme />
          </div>
        </div>

        {/* 报警列表 */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {mockAlerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`w-full p-3 rounded-lg mb-2 text-left transition-all duration-200 cursor-pointer hover:bg-secondary/80 ${
                  selectedAlert.id === alert.id
                    ? "bg-secondary border-2 border-primary/50"
                    : "bg-secondary/30 border-2 border-transparent"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        <AlertCircle className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.source}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={getPriorityColor(alert.level)}>
                    {alert.level}
                  </Badge>
                  <Badge variant="secondary" className={getStatusColor(alert.status)}>
                    {alert.status}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mt-2">{alert.timestamp}</p>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* 底部用户信息 */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                AI
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">AI Agent Active</p>
              <p className="text-xs text-muted-foreground">Monitoring 5 sources</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 - 报警详情 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-red-500/10 text-red-500">
                    <AlertCircle className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-semibold">{selectedAlert.title}</h2>
                  <p className="text-sm text-muted-foreground">{selectedAlert.source}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className={getPriorityColor(selectedAlert.level)}>
                  {selectedAlert.level}
                </Badge>
                <Badge variant="secondary" className={getStatusColor(selectedAlert.status)}>
                  {selectedAlert.status}
                </Badge>
              </div>
            </div>

            <Button variant="outline" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 详情内容 */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                Alert Info
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Source:</span>
                  <span>{selectedAlert.source}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Level:</span>
                  <span>{selectedAlert.level}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span>{selectedAlert.timestamp}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Stack Trace */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                Stack Trace
              </h3>
              <div className="bg-secondary/50 p-4 rounded-lg font-mono text-sm">
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
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                AI Analysis
              </h3>
              <div className="space-y-4">
                <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Root Cause</h4>
                  <p className="text-sm text-muted-foreground">
                    The component is trying to map over a data array that hasn't been initialized yet.
                    This typically happens when API data is accessed before the request completes.
                  </p>
                </div>

                <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Suggested Fix</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add a loading state check or provide a default empty array.
                  </p>
                  <div className="bg-secondary/50 p-3 rounded font-mono text-xs">
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
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                Recent Activity
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                  <div>
                    <p className="text-sm">Alert created - AI analysis started</p>
                    <p className="text-xs text-muted-foreground">2 mins ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <p className="text-sm">Code context retrieved</p>
                    <p className="text-xs text-muted-foreground">1 min ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                  <div>
                    <p className="text-sm">Fix suggestion generated</p>
                    <p className="text-xs text-muted-foreground">30 secs ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* 底部操作按钮 */}
        <div className="p-6 border-t border-border">
          <div className="flex gap-3">
            <Button className="flex-1">Create PR/MR</Button>
            <Button variant="outline" className="flex-1">Mark as Resolved</Button>
            <Button variant="ghost">Dismiss</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});
