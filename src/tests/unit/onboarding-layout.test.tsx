import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => navigateMock,
}));

vi.mock("@/actions/auth-session", () => ({
  completeOnboarding: vi.fn(),
  isSignedIn: () => true,
}));

vi.mock("@/actions/shell", () => ({
  copyText: vi.fn(),
}));

vi.mock("@/api/alerts", () => ({
  syncAlerts: vi.fn(),
}));

vi.mock("@/components/dashboard/create-project-dialog", () => ({
  default: () => null,
}));

vi.mock("@/hooks/use-projects", () => ({
  useProjects: () => ({
    currentProject: null,
  }),
}));

import { OnboardingPage } from "@/routes/onboarding";

// 查询环境
function renderOnboarding() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

  return render(<OnboardingPage />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

test("enables page scroll for onboarding content", () => {
  const { container } = renderOnboarding();
  const page = container.firstElementChild;

  expect(page).toHaveClass("h-full", "overflow-y-auto");
  expect(
    screen.getByRole("heading", {
      name: "先跑通一条 Alert，再进入工作台",
    })
  ).toBeInTheDocument();
});
