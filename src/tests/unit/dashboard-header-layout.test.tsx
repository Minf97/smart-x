import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { useAutoModeStore } from "@/store/auto-mode-store";

const navigateMock = vi.hoisted(() => vi.fn());
const setSearchMock = vi.hoisted(() => vi.fn());
const autoModeNamePattern = /Auto Mode|自动模式/;

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/actions/auth-session", () => ({
  resetAuthSession: vi.fn(),
}));

vi.mock("@/components/dashboard/filter-bar", () => ({
  default: () => <div>filters</div>,
}));

vi.mock("@/components/header-lang-toggle", () => ({
  default: () => <button type="button">lang</button>,
}));

vi.mock("@/components/toggle-theme", () => ({
  default: () => <button type="button">theme</button>,
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: () => <button type="button">sidebar</button>,
}));

vi.mock("@/store/alert-store", () => ({
  useAlertStore: (selector: (state: unknown) => unknown) =>
    selector({
      search: "",
      setSearch: setSearchMock,
    }),
}));

import "@/localization/i18n";
import HeaderBar from "@/components/dashboard/header-bar";

beforeEach(() => {
  navigateMock.mockClear();
  setSearchMock.mockClear();
  useAutoModeStore.setState({ enabled: false });
});

test("opens onboarding guide from dashboard header", async () => {
  const user = userEvent.setup();
  render(<HeaderBar />);

  await user.click(screen.getByRole("button", { name: "接入指引" }));

  expect(navigateMock).toHaveBeenCalledWith({ to: "/onboarding" });
});

test("toggles automatic mode from dashboard header", async () => {
  const user = userEvent.setup();
  const { container } = render(<HeaderBar />);
  const button = screen.getByRole("button", { name: autoModeNamePattern });

  await user.click(button);

  expect(useAutoModeStore.getState().enabled).toBe(true);
  expect(button).toHaveAttribute("aria-pressed", "true");
  expect(container.querySelector(".animate-spin")).toBeInTheDocument();
});
