import type React from "react";
import DragWindowRegion from "@/components/drag-window-region";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <DragWindowRegion title="electron-shadcn" />
      <main className="h-screen p-2 pb-20">{children}</main>
    </TooltipProvider>
  );
}
