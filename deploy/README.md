# ArchPrep 部署说明

ArchPrep 采用**本机部署 + cloudflared 隧道**的方式暴露外网 HTTPS 访问。服务默认监听本地 `http://localhost:8787`。

## 快速体验（临时公网 URL）

无需注册 Cloudflare 域名，即可生成一个临时隧道用于测试：

```bash
cloudflared tunnel --url http://localhost:8787
```

终端会打印类似 `https://<random>.trycloudflare.com` 的 HTTPS 地址，可在公网临时访问。

## 安装 cloudflared

### macOS

```bash
brew install cloudflared
```

### Linux（Debian/Ubuntu）

```bash
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### Windows

从 [Cloudflare 官方 Releases](https://github.com/cloudflare/cloudflared/releases) 下载对应架构的 `.exe`，放入 PATH 即可。

## 创建持久 named tunnel（推荐）

1. 登录 Cloudflare 账号：

```bash
cloudflared tunnel login
```

该命令会生成 `/Users/<you>/.cloudflared/cert.pem` 并打开浏览器授权。

2. 创建隧道：

```bash
cloudflared tunnel create archprep
```

记录输出中的 tunnel-id，例如 `8d1f2c3e-...`。

3. 在 Cloudflare 控制台为隧道添加 DNS 路由（例如 `archprep.yourdomain.com`），指向该 tunnel。

4. 编辑 `deploy/cloudflared.yml`，替换：

- `tunnel: <your-tunnel-id>` 为上一步得到的 tunnel-id
- `credentials-file` 为上一步生成的 credentials 文件路径（通常为 `~/.cloudflared/<tunnel-id>.json`）
- `hostname` 为你的真实域名

5. 启动隧道：

```bash
cloudflared tunnel --config deploy/cloudflared.yml run archprep
```

或作为系统服务运行（推荐长期运行）：

```bash
cloudflared service install
cloudflared tunnel --config deploy/cloudflared.yml run archprep
```

## 验证

- 本地服务已启动：`bun --watch server/src/index.ts`（监听 8787）
- 访问 `https://<your-domain>`，应能看到 ArchPrep 服务响应
- 检查响应头确认 HTTPS：`curl -I https://<your-domain>/health`

## 安全注意事项

- 仅通过 cloudflared 的 HTTPS 地址访问外网，不要直接暴露 `localhost:8787` 到公网。
- CORS 仅允许已知来源（本机、cloudflared 域名），禁止设置为 `*`。
- `.env` 文件不要提交到 Git；参考根目录 `.env.example` 配置环境变量。
