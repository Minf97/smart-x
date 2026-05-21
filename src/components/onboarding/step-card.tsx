import type { ReactNode } from "react";

interface StepCardProps {
  action?: ReactNode;
  children?: ReactNode;
  description: string;
  icon: ReactNode;
  progress: number;
  stepLabel: string;
  title: string;
}

// 单步卡片
export function StepCard({
  action,
  children,
  description,
  icon,
  progress,
  stepLabel,
  title,
}: StepCardProps) {
  return (
    <section className="smartx-step-enter mx-auto w-full max-w-3xl overflow-hidden rounded-lg border bg-card shadow-[0_24px_80px_rgb(0_0_0/0.08)]">
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="p-6 sm:p-8">
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-background text-foreground shadow-sm">
              {icon}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[0.68rem] text-muted-foreground uppercase tracking-[0.18em]">
                {stepLabel}
              </p>
              <h2 className="mt-2 font-semibold text-2xl tracking-normal">
                {title}
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground text-sm leading-6">
                {description}
              </p>
            </div>
          </div>
        </div>
        {children ? <div className="mt-6">{children}</div> : null}
        {action ? <div className="mt-7 flex justify-end">{action}</div> : null}
      </div>
    </section>
  );
}
