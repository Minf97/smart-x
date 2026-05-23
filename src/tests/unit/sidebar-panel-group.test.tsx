import type { Item } from "@shared/types/alert";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import "@/localization/i18n";
import SidebarPanel from "@/components/dashboard/sidebar-panel";

const setHoveredIdMock = vi.hoisted(() => vi.fn());
const setSelectedIdMock = vi.hoisted(() => vi.fn());
const alertViewState = vi.hoisted(() => ({
  filteredItems: [] as Item[],
  selectedItem: null as Item | null,
}));
const groupTitlePattern = /TypeError in UserList/;

vi.mock("@/api/alerts", () => ({
  listAlerts: vi.fn(),
  syncAlerts: vi.fn(),
}));

vi.mock("@/components/dashboard/alert-status-dropdown", () => ({
  default: () => <button type="button">status</button>,
}));

vi.mock("@/components/dashboard/project-switcher", () => ({
  default: () => <div>project</div>,
}));

vi.mock("@/components/dashboard/settings-trigger", () => ({
  default: () => <button type="button">settings</button>,
}));

vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: ComponentProps<"aside">) => <aside>{children}</aside>,
  SidebarContent: ({ children }: ComponentProps<"div">) => (
    <div>{children}</div>
  ),
  SidebarHeader: ({ children }: ComponentProps<"div">) => (
    <header>{children}</header>
  ),
  SidebarMenu: ({ children }: ComponentProps<"div">) => <div>{children}</div>,
  SidebarMenuButton: ({
    children,
    isActive: _isActive,
    ...props
  }: ComponentProps<"button"> & { isActive?: boolean }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  SidebarMenuItem: ({ children, ...props }: ComponentProps<"div">) => (
    <div {...props}>{children}</div>
  ),
  SidebarRail: () => null,
}));

vi.mock("@/hooks/use-alerts", () => ({
  ALERTS_QUERY_KEY: ["alerts"],
  useAlertView: () => alertViewState,
}));

vi.mock("@/store/alert-store", () => ({
  useAlertStore: (
    selector: (state: {
      hoveredId: string | null;
      setHoveredId: typeof setHoveredIdMock;
      setSelectedId: typeof setSelectedIdMock;
    }) => unknown
  ) =>
    selector({
      hoveredId: null,
      setHoveredId: setHoveredIdMock,
      setSelectedId: setSelectedIdMock,
    }),
}));

// 构造报警
function buildAlert(): Item {
  return {
    createdAt: "2026-05-23T00:00:00.000Z",
    detail: {
      error: {
        groupKey: "group-1",
        message: "Cannot read properties of undefined",
        rawAlert: {},
        stack: null,
      },
      summary: {
        environment: "production",
        firstSeenAt: "2026-05-23T00:00:00.000Z",
        lastSeenAt: "2026-05-23T00:05:00.000Z",
        occurrenceCount: 4,
        source: "frontend",
        sourceUrl: null,
      },
    },
    groupKey: "group-1",
    id: "al_1",
    isRead: false,
    isSyncedLocal: true,
    priority: "P0",
    projectId: "pj_1",
    readAt: null,
    status: "backlog",
    syncedAt: null,
    title: "TypeError in UserList",
    updatedAt: "2026-05-23T00:05:00.000Z",
  };
}

// 渲染侧栏
function renderSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(<SidebarPanel />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  const alert = buildAlert();

  alertViewState.filteredItems = [alert];
  alertViewState.selectedItem = alert;
  setHoveredIdMock.mockClear();
  setSelectedIdMock.mockClear();
});

test("renders alert group row with count and priority", async () => {
  const user = userEvent.setup();
  renderSidebar();

  expect(screen.getByText("TypeError in UserList")).toBeInTheDocument();
  expect(screen.getByText("x4")).toBeInTheDocument();
  expect(screen.getByText("P0")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: groupTitlePattern }));

  expect(setSelectedIdMock).toHaveBeenCalledWith("al_1");
});
