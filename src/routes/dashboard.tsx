import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { isOnboardingComplete, isSignedIn } from "@/actions/auth-session";
import AutoModeRunner from "@/components/dashboard/auto-mode-runner";
import DetailHeader from "@/components/dashboard/detail-header";
import FooterBar from "@/components/dashboard/footer-bar";
import HeaderBar from "@/components/dashboard/header-bar";
import SidebarPanel from "@/components/dashboard/sidebar-panel";
import DetailContent from "@/components/detail-content";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardBootstrap } from "@/hooks/use-alerts";

function DashboardLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Spinner className="size-4" />
    </div>
  );
}

interface DashboardErrorProps {
  error: Error;
  retry: () => void;
}

function DashboardError({ error, retry }: DashboardErrorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border p-6">
        <p className="font-semibold text-sm">{t("dashboard.loadFailed")}</p>
        <p className="mt-2 text-muted-foreground text-sm">{error.message}</p>
        <Button
          className="mt-4"
          onClick={() => {
            retry();
          }}
          size="sm"
        >
          {t("dashboard.retry")}
        </Button>
      </div>
    </div>
  );
}

function DashboardGate() {
  const navigate = useNavigate();
  const signedIn = isSignedIn();
  const onboarded = isOnboardingComplete();

  useEffect(() => {
    if (!signedIn) {
      navigate({ to: "/login" });
      return;
    }

    if (!onboarded) {
      navigate({ to: "/onboarding" });
    }
  }, [navigate, onboarded, signedIn]);

  if (!(signedIn && onboarded)) {
    return <DashboardLoading />;
  }

  return <DashboardPage />;
}

function DashboardPage() {
  const { error, loading, refetch } = useDashboardBootstrap();

  if (loading) {
    return <DashboardLoading />;
  }

  if (error) {
    return (
      <DashboardError
        error={error}
        retry={() => {
          refetch().catch(() => undefined);
        }}
      />
    );
  }

  return (
    <SidebarProvider defaultOpen>
      {/* 主容器 */}
      <div className="flex h-screen w-full bg-background">
        {/* 侧栏区 */}
        <SidebarPanel />

        {/* 主内容 */}
        <SidebarInset>
          <div className="flex h-full flex-col">
            <AutoModeRunner />
            <HeaderBar />
            <DetailHeader />
            <div className="flex-1 overflow-auto">
              <DetailContent />
            </div>
            <FooterBar />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardGate,
});
