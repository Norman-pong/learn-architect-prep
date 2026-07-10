import * as React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cn } from "../../lib/utils";

const TooltipProvider = BaseTooltip.Provider;
const Tooltip = BaseTooltip.Root;

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ asChild, ...props }, ref) => (
  // @ts-expect-error Base UI runtime prop
  <BaseTooltip.Trigger ref={ref} asChild={asChild} {...props} />
));
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: "top" | "bottom" | "left" | "right";
    sideOffset?: number;
  }
>(({ className, side, sideOffset = 4, ...props }, ref) => (
  <BaseTooltip.Portal>
    <BaseTooltip.Positioner side={side} sideOffset={sideOffset}>
      <BaseTooltip.Popup
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          "z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
          className,
        )}
        {...props}
      >
        <BaseTooltip.Arrow className="fill-popover stroke-border">
          <svg width="20" height="10" viewBox="0 0 20 10">
            <path d="M10 0L20 10H0L10 0Z" />
          </svg>
        </BaseTooltip.Arrow>
      </BaseTooltip.Popup>
    </BaseTooltip.Positioner>
  </BaseTooltip.Portal>
));
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
