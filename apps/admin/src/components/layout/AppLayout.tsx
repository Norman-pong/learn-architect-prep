import { useLocation, useNavigate, Outlet } from "react-router";
import { Avatar, Button, Layout, Menu, Space, Typography } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { useState } from "react";

import { clearTokens } from "../../api/client";
import { cycleThemeMode, type ThemeMode } from "../../store/theme";
import { useTheme } from "../../theme/AppThemeProvider";

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: "/", icon: <HomeOutlined />, label: "首页" },
  { key: "/learn", icon: <BookOutlined />, label: "学习" },
  { key: "/quiz", icon: <EditOutlined />, label: "习题" },
  { key: "/writing", icon: <FileTextOutlined />, label: "论文" },
  {
    key: "/settings",
    icon: <SettingOutlined />,
    label: "设置",
    children: [{ key: "/settings/ai", label: "AI 配置" }],
  },
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

/**
 * Top-level admin shell.
 *
 * Responsive behaviour:
 *  - On screens narrower than `md` (768px) the Sider auto-collapses
 *    and a hamburger trigger in the Header lets the user reveal it
 *    as a temporary drawer-style overlay.
 *  - On wider screens the Sider stays expanded inline.
 *  - Content padding shrinks on narrow viewports so tables and cards
 *    can breathe; see `apps/admin/src/index.css` for the
 *    `overflow-x: hidden` that prevents horizontal scrolling.
 */
export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode } = useTheme();

  // `null` means "auto: antd decides via breakpoint". Forcing a value
  // is only needed after the user explicitly toggles the hamburger.
  const [collapsed, setCollapsed] = useState<boolean | null>(null);

  const siderCollapsed = collapsed ?? false;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        theme="light"
        breakpoint="md"
        collapsible
        collapsed={siderCollapsed}
        trigger={null}
        onBreakpoint={(broken) => setCollapsed(broken)}
        width={208}
        collapsedWidth={0}
        style={{ borderRight: "1px solid var(--sd-sider-border)" }}
      >
        <div style={{ padding: 16, textAlign: "center" }}>
          <Title level={5} style={{ margin: 0 }}>
            {siderCollapsed ? "A" : "ArchPrep"}
          </Title>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          className="app-header"
          style={{
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--sd-header-border)",
          }}
        >
          <Button
            type="text"
            icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!siderCollapsed)}
            aria-label={siderCollapsed ? "展开侧栏" : "收起侧栏"}
          />
          <Space>
            <Button
              icon={THEME_ICON[mode]}
              onClick={() => cycleThemeMode()}
              aria-label={`主题:${THEME_LABEL[mode]},点击切换`}
              title={`主题: ${THEME_LABEL[mode]}（点击循环切换）`}
            />
            <Button
              danger
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                clearTokens();
                navigate("/login");
              }}
              aria-label="退出登录"
              title="退出登录"
            >
              退出
            </Button>
            <Avatar size="small" shape="circle">
              U
            </Avatar>
          </Space>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
