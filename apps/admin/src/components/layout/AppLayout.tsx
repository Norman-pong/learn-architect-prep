import { useLocation, useNavigate, Outlet } from "react-router";
import { Layout, Menu, Button, Avatar, Typography, Space } from "antd";
import {
  HomeOutlined,
  BookOutlined,
  EditOutlined,
  FileTextOutlined,
  SettingOutlined,
  MoonOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { useTheme } from "../../theme/AppThemeProvider";

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: "/", icon: <HomeOutlined />, label: "首页" },
  { key: "/learn", icon: <BookOutlined />, label: "学习" },
  { key: "/quiz", icon: <EditOutlined />, label: "习题" },
  { key: "/writing", icon: <FileTextOutlined />, label: "论文" },
  { key: "/settings", icon: <SettingOutlined />, label: "设置" },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggle } = useTheme();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme={mode === "dark" ? "dark" : "light"} width={200}>
        <div style={{ padding: 16, textAlign: "center" }}>
          <Title level={5} style={{ margin: 0 }}>
            ArchPrep
          </Title>
        </div>
        <Menu
          theme={mode === "dark" ? "dark" : "light"}
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            background: mode === "dark" ? "#141414" : "#fff",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Space>
            <Button icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />} onClick={toggle} />
            <Avatar size="small" shape="circle">
              U
            </Avatar>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
