import { useIsMobile } from "../../hooks/useIsMobile";
import { useState, useCallback } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/auth";
import { cycleThemeMode, useThemeMode, type ThemeMode } from "../../stores/theme";
import { clearAuth } from "../../lib/api";
import {
  HomeOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  EditOutlined,
  BarChartOutlined,
  DesktopOutlined,
  SettingOutlined,
  CloudUploadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined,
  LogoutOutlined,
  LineChartOutlined,
  FileTextOutlined,
} from "../../components/ui/icons";
import { Button, buttonVariants } from "../../components/ui/button";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "../../components/ui/drawer";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "../../components/ui/tooltip";

/* ── Nav data ── */

interface NavItem {
  label: string;
  to?: string;
  icon: React.ReactNode;
  children?: { label: string; to: string }[];
  active?: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  { label: "首页", to: "/", icon: <HomeOutlined /> },
  { label: "学习", to: "/learn", icon: <BookOutlined /> },
  {
    label: "题库",
    icon: <QuestionCircleOutlined />,
    children: [
      { label: "问答", to: "/qa" },
      { label: "测验", to: "/quiz" },
      { label: "错题本", to: "/error-book" },
      { label: "薄弱点", to: "/weakness" },
      { label: "题库管理", to: "/quiz-bank" },
    ],
  },
  { label: "搜索", to: "/search", icon: <SearchOutlined /> },
  { label: "复习", to: "/review", icon: <EditOutlined /> },
  { label: "写作", to: "/writing", icon: <FileTextOutlined /> },
  { label: "数据迁移", to: "/data-transfer", icon: <CloudUploadOutlined /> },
  {
    label: "考试",
    icon: <DesktopOutlined />,
    children: [
      { label: "综合", to: "/exam/comp" },
      { label: "案例", to: "/exam/case" },
      { label: "论文", to: "/exam/essay" },
      { label: "历史", to: "/exam/history" },
    ],
  },
  { label: "进度", to: "/progress", icon: <LineChartOutlined /> },
  { label: "统计", to: "/stats", icon: <BarChartOutlined /> },
  { label: "设置", to: "/settings/ai", icon: <SettingOutlined /> },
];

const THEME_ICON: Record<ThemeMode, React.ReactNode> = {
  system: <DesktopOutlined />,
  light: <SunOutlined />,
  dark: <MoonOutlined />,
};

const THEME_LABEL: Record<ThemeMode, string> = {
  system: "跟随系统",
  light: "浅色",
  dark: "深色",
};

/* ── Sidebar no-op for desktop fixed sidebar ── */
const NOOP = () => undefined;

/* ── Sub-components ── */

function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [mode] = useThemeMode();
  const label = THEME_LABEL[mode];

  const handleClick = useCallback(() => {
    cycleThemeMode();
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={handleClick}
              className={cn(
                buttonVariants({ variant: "ghost", size: collapsed ? "icon" : "default" }),
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed ? "h-9 w-9" : "w-full justify-start gap-3 px-3",
              )}
              aria-label={label}
            />
          }
        >
          <span className="shrink-0 text-[1.1rem]">{THEME_ICON[mode]}</span>
          {!collapsed && <span className="text-sm">{label}</span>}
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    useAuthStore.getState().reset();
    clearAuth();
    navigate({ to: "/login" });
  }, [navigate]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                buttonVariants({ variant: "ghost", size: collapsed ? "icon" : "default" }),
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed ? "h-9 w-9" : "w-full justify-start gap-3 px-3",
              )}
              aria-label="退出登录"
            />
          }
        >
          <span className="shrink-0 text-[1.1rem]">
            <LogoutOutlined />
          </span>
          {!collapsed && <span className="text-sm">退出</span>}
        </TooltipTrigger>
        <TooltipContent side="right">退出登录</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={item.to!}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      <span className="text-[1.1rem]">{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function NavGroup({
  item,
  activePrefix,
  collapsed,
  onNavigate,
  pathname,
}: {
  item: NavItem;
  activePrefix: boolean;
  collapsed: boolean;
  onNavigate: () => void;
  pathname: string;
}) {
  const [open, setOpen] = useState(activePrefix);

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        size={collapsed ? "icon" : "default"}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`navgroup-${item.label}`}
        className={cn(
          "w-full justify-start gap-3 px-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          collapsed && "justify-center px-2",
        )}
      >
        <span className="text-[1.1rem]">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left text-sm">{item.label}</span>
            <span className={cn("text-xs transition-transform", open ? "rotate-90" : "")}>▶</span>
          </>
        )}
      </Button>
      {open && !collapsed && (
        <div id={`navgroup-${item.label}`} className="ml-4 flex flex-col gap-1 border-l pl-2">
          {item.children!.map((child) => (
            <Link
              key={child.to}
              to={child.to}
              onClick={onNavigate}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                activePrefix && pathname.startsWith(child.to)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-full flex-col gap-2 px-3 py-4">
      <div className="mb-4 flex items-center gap-2 px-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>AP</AvatarFallback>
        </Avatar>
        {!collapsed && <span className="text-lg font-semibold">ArchPrep</span>}
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {navItems.map((item) =>
          item.children ? (
            <NavGroup
              key={item.label}
              item={item}
              activePrefix={item.children.some((c) => pathname.startsWith(c.to))}
              collapsed={collapsed}
              onNavigate={onNavigate}
              pathname={pathname}
            />
          ) : (
            <NavLink
              key={item.label}
              item={item}
              active={pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to!))}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ),
        )}
      </nav>
      <div className="flex flex-col gap-1">
        <ThemeToggle collapsed={collapsed} />
        <LogoutButton collapsed={collapsed} />
      </div>
    </div>
  );
}

/* ── Main shell ── */

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {isMobile && (
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-header px-3 text-header-foreground">
          <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
            <DrawerTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="打开菜单">
                  <MenuFoldOutlined />
                </Button>
              }
            />
            <DrawerContent side="left" className="w-72">
              <DrawerHeader className="sr-only">
                <DrawerTitle>导航</DrawerTitle>
              </DrawerHeader>
              <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
              <DrawerClose className="sr-only">关闭</DrawerClose>
            </DrawerContent>
          </Drawer>
          <span className="text-sm font-semibold tracking-tight">ArchPrep</span>
        </header>
      )}
      <div className="flex min-h-0 flex-1">
        {!isMobile && (
          <aside
            className={cn(
              "sticky top-0 z-40 h-screen border-r bg-sidebar transition-[width]",
              collapsed ? "w-16" : "w-64",
            )}
          >
            <SidebarContent collapsed={collapsed} onNavigate={NOOP} />
          </aside>
        )}
        {!isMobile && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "fixed bottom-4 z-50 hidden rounded-full border bg-background p-2 shadow-sm lg:block",
              collapsed ? "left-20" : "left-72",
            )}
            aria-label="切换边栏"
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
