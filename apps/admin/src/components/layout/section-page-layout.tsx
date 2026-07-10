import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionPageLayoutProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionPageLayout({
  title,
  description,
  actions,
  children,
  className,
}: SectionPageLayoutProps) {
  return (
    <div className={cn("space-y-4 px-4 py-6 sm:px-6 lg:px-8", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
