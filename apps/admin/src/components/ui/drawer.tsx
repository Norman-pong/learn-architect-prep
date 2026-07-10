import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const Drawer = BaseDialog.Root;
const DrawerClose = BaseDialog.Close;

const DrawerTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ asChild, ...props }, ref) => (
  // @ts-expect-error Base UI runtime prop
  <BaseDialog.Trigger ref={ref} asChild={asChild} {...props} />
));
DrawerTrigger.displayName = "DrawerTrigger";

const drawerVariants = cva("fixed z-50 gap-4 bg-card p-6 shadow-lg duration-300 ease-in-out", {
  variants: {
    side: {
      top: "inset-x-0 top-0 border-b border-border",
      bottom: "inset-x-0 bottom-0 border-t border-border",
      left: "inset-y-0 left-0 h-full w-3/4 border-r border-border sm:max-w-sm",
      right: "inset-y-0 right-0 h-full w-3/4 border-l border-border sm:max-w-sm",
    },
  },
  defaultVariants: {
    side: "right",
  },
});

interface DrawerContentProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof drawerVariants> {}

const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ className, side, children, ...props }, ref) => (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className={cn("fixed inset-0 z-50 bg-overlay")} />
      <BaseDialog.Popup
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(drawerVariants({ side }), className)}
        {...props}
      >
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  ),
);
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <BaseDialog.Title
      ref={ref as React.Ref<HTMLHeadingElement>}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <BaseDialog.Description
    ref={ref as React.Ref<HTMLParagraphElement>}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  drawerVariants,
};
