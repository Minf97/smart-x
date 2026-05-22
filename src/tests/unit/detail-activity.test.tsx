import type { Item } from "@shared/types/alert";
import type { CodeRequest } from "@shared/types/project";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import DetailActivity from "@/components/detail-content/activity";
import "@/localization/i18n";

// 构造报警
function buildItem(): Item {
  return {
    createdAt: "2026-05-22T09:00:00.000Z",
    detail: {
      error: {
        message: "boom",
      },
      feedbackSignals: [
        {
          action: "dismiss",
          alertId: "ENG-1",
          createdAt: "2026-05-22T09:10:00.000Z",
          groupKey: "group-1",
          id: "feedback-1",
          reason: "Not user visible",
        },
      ],
      summary: {
        source: "sentry",
      },
    },
    groupKey: "group-1",
    id: "ENG-1",
    isRead: false,
    isSyncedLocal: true,
    priority: "P1",
    projectId: "project-1",
    status: "dismiss",
    title: "Client error",
    updatedAt: "2026-05-22T09:10:00.000Z",
  };
}

// 构造请求
function buildRequest(): CodeRequest {
  return {
    baseBranch: "main",
    branchName: "alert/eng-1",
    createdAt: "2026-05-22T09:05:00.000Z",
    provider: "github",
    remoteId: "101",
    repoName: "demo/app",
    state: "open",
    title: "[ENG-1] Client error",
    updatedAt: "2026-05-22T09:05:00.000Z",
    url: "https://github.com/demo/app/pull/101",
  };
}

test("renders activity from real alert records", () => {
  render(<DetailActivity item={buildItem()} request={buildRequest()} />);

  expect(screen.getByText("Alert created")).toBeInTheDocument();
  expect(screen.getByText("Alert")).toBeInTheDocument();
  expect(screen.getByText("GitHub PR/MR created")).toBeInTheDocument();
  expect(screen.getByText("PR/MR")).toBeInTheDocument();
  expect(screen.getByText("Alert dismissed")).toBeInTheDocument();
  expect(screen.getByText("Feedback")).toBeInTheDocument();
  expect(screen.getByText("Not user visible")).toBeInTheDocument();
  expect(screen.queryByText("Code context retrieved")).not.toBeInTheDocument();
  expect(
    screen.queryByText("Fix suggestion generated")
  ).not.toBeInTheDocument();
});
