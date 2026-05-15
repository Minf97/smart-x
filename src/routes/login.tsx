import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  DEMO_AUTH_EMAIL,
  DEMO_AUTH_PASSWORD,
  isOnboardingComplete,
  signInWithPassword,
} from "@/actions/auth-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_AUTH_EMAIL);
  const [password, setPassword] = useState(DEMO_AUTH_PASSWORD);
  const [error, setError] = useState("");

  // 提交登录
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!signInWithPassword(email, password)) {
      setError("账号或密码不正确");
      return;
    }

    navigate({ to: isOnboardingComplete() ? "/dashboard" : "/onboarding" });
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)] items-center justify-center bg-background px-6">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-lg border bg-card md:grid-cols-[1.1fr_0.9fr]">
        <section className="relative min-h-[420px] overflow-hidden bg-[#101418] p-10 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.22),transparent_28%),radial-gradient(circle_at_80%_55%,rgba(59,130,246,0.2),transparent_32%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[0.68rem] text-emerald-100 uppercase tracking-[0.24em]">
              <ShieldCheck className="size-3" />
              Smart X
            </div>
            <div>
              <h1 className="max-w-md font-semibold text-4xl leading-tight tracking-normal">
                把线上错误带回你的工作台
              </h1>
              <p className="mt-4 max-w-md text-sm text-white/65 leading-6">
                登录后进入新手教程，连接代码仓库，配置 webhook，再用一条 Alert
                跑通从报错到 Code Request 的链路。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-white/55 text-xs">
              <span>Alert</span>
              <span>Analysis</span>
              <span>Code Request</span>
            </div>
          </div>
        </section>

        <section className="p-8 md:p-10">
          <div className="mb-8">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <KeyRound className="size-4" />
            </div>
            <h2 className="mt-4 font-semibold text-2xl">登录 Desktop Agent</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              MVP 阶段先使用本地演示账号，后续替换为正式鉴权。
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-1.5" htmlFor="login-email">
              <span className="font-medium text-sm">邮箱</span>
              <Input
                autoComplete="email"
                className="h-9"
                id="login-email"
                onChange={(event) => setEmail(event.target.value)}
                value={email}
              />
            </label>
            <label className="block space-y-1.5" htmlFor="login-password">
              <span className="font-medium text-sm">密码</span>
              <Input
                autoComplete="current-password"
                className="h-9"
                id="login-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <Button className="h-9 w-full" type="submit">
              进入新手教程
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-6 rounded-md border bg-muted/40 p-3 text-muted-foreground text-xs">
            <p>演示账号：{DEMO_AUTH_EMAIL}</p>
            <p className="mt-1">演示密码：{DEMO_AUTH_PASSWORD}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
});
