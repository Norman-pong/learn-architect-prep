# ArchPrep

> 系统架构设计师（软考高级 038）个人备考系统 — 覆盖学习、习题、写作指导、模拟考四大场景。

`learn-architect-prep` 是面向个人的本地/单容器部署项目,前端 React 19 + antd 6,后端 Elysia + Bun + SQLite,所有 LLM 调用统一经后端代理,核心备考资料以 Markdown / JSON 形式纳入 Git 版本控制。


### 5 分钟跑起来

```bash
git clone https://github.com/Norman-pong/learn-architect-prep.git
cd learn-architect-prep
vp install                 # 装依赖,自动钉 pnpm 11.10
cp .env.example .env       # 至少填 JWT_SECRET 与 AI_ENCRYPT_KEY
vp dev                     # 起 admin(5173) + server(8787)
```

打开 http://localhost:5173 即可使用。完整步骤、环境变量、常见命令见下方 [快速开始](#快速开始) 章节。

---

## 目录

- [项目定位](#项目定位)
- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [仓库结构](#仓库结构)
- [快速开始](#快速开始)
- [常用脚本](#常用脚本)
- [环境变量](#环境变量)
- [AI 集成](#ai-集成)
- [数据资产](#数据资产)
- [开发与运维约定](#开发与运维约定)
- [部署](#部署)
- [文档索引](#文档索引)
- [路线图](#路线图)

---

## 项目定位

系统为**个人单用户**使用设计,非多租户 SaaS,刻意不引入注册、社交、排行榜等机制。

| 功能 | 定位 | 目标 |
|:---|:---|:---|
| 学习 | 知识点学习与记忆 | 按教材 20 章组织知识点,SM-2 间隔重复高效记忆 |
| 习题 | 选择题练习与错题管理 | 题库为主、AI 补充,识别薄弱点并针对性训练 |
| 写作指导 | 论文写作结构化训练 | 模板、范文、AI 评分形成闭环 |
| 模拟考 | 三科全真模拟 | 综合知识 / 案例分析 / 论文 计时评分 + 趋势分析 |

详见 [`docs/architecture/overview.md`](docs/architecture/overview.md)。

---

## 核心特性

- **文档式简洁 UI** — 阅读、练习、写作优先,信息密度高,导航干扰少。
- **AI 后端代理** — 所有 LLM 调用由 Elysia 后端封装,前端不直连,密钥不暴露。
- **静态数据 Git 化** — 知识点、题库、范文、模板全部走 Git,内容可追溯、可回滚。
- **SM-2 间隔重复** — 学习模块基于 SM-2 算法调度复习卡片。
- **三科模拟考** — 综合知识 75 题、案例分析 5 选 4、论文 4 选 1,含计时与评分。
- **AI 多维评分** — 论文按官方 5 个维度评分,案例题 AI 评分。
- **单容器部署** — 后端 + cloudflared 隧道即可对外提供 HTTPS 访问。

---

## 技术栈

| 层级 | 选型 | 说明 |
|:---|:---|:---|
| 前端 | React 19 + TypeScript + Vite(via vite-plus) | 组件化、类型安全、快速 HMR |
| UI 组件 | antd 6 | 表单、表格、模态、布局 |
| 后端 | Elysia + TypeScript | REST API、模块化插件 |
| 运行时 | Bun | 后端执行 + 内建 `bun:sqlite` |
| 数据库 | SQLite(WAL) | 本地持久化用户学习数据 |
| AI | Vercel AI SDK(OpenAI / Anthropic / DeepSeek) | 智能出题、论文评分、答疑、路径生成 |
| 包管理 | pnpm 11.10 | 通过 vite-plus(`vp`)统一管控 |
| 工具链 | vite-plus(OxLint + OxFmt + tsdown + Rolldown) | 单一 CLI 替代 npm/vitest/oxlint 散件 |
| 部署 | cloudflared 隧道 | 本地服务对外 HTTPS 暴露 |

---

## 仓库结构

本仓库是 pnpm workspace,根 `package.json#workspaces` 注册了三个工作区:

```
learn-architect-prep/
├── apps/
│   └── admin/                # @archprep/admin  — React 19 + antd 6 前端 SPA
├── server/                   # @archprep/server — Elysia REST + AI 代理
│   └── src/
│       ├── config/           # 全局配置(端口、CORS、加密等)
│       ├── db/               # SQLite 初始化与 schema
│       ├── middleware/       # 鉴权 / 错误处理
│       └── modules/          # 业务模块(见下)
├── packages/
│   └── shared/               # @archprep/shared — 前后端共享类型
├── data/                     # Git 维护的静态备考资料
│   ├── knowledge/            # 20 章知识点 Markdown
│   ├── quiz/                 # 选择题 / 案例题 / 论文题 题库 JSON
│   ├── writing/              # 论文模板 / 范文 / 写作技巧
│   └── import/               # 真题批量导入数据
├── scripts/                  # 数据导入、E2E 调试脚本
├── docs/                     # SDD 文档(spec / prd / phase / architecture / reference)
├── deploy/                   # cloudflared 配置与部署说明
├── vite.config.ts            # 工作区根级 vp fmt/lint/staged 配置
└── pnpm-workspace.yaml
```

后端业务模块(`server/src/modules/`):

| 模块 | 职责 |
|:---|:---|
| `health` | 健康检查 |
| `auth` | 单用户密码 / JWT |
| `knowledge` | 知识点 CRUD + 复习卡片 |
| `quiz` | 章节练习 / 随机出题 / 错题本 |
| `exam` | 模拟考(综合 / 案例 / 论文) |
| `writing` | 论文草稿 / 模板 / 评分 |
| `ai` | LLM 代理:出题 / 评分 / 答疑 / 路径 |
| `stats` | 仪表盘统计与趋势 |
| `personalization` | 薄弱点识别 + 每日推荐 + 学习路径 |
| `data` | 题库 / 真题批量导入 / 数据迁移 |

---

## 快速开始

### 前置要求

- **Bun** ≥ 1.1(后端运行时)
- **Node.js** ≥ 20(由 `vp` 接管,无需手动 nvm)
- **pnpm** ≥ 11.10(由 `vp install` 自动安装)
- 全局安装 [vite-plus](https://viteplus.dev):`npm i -g vite-plus` 或 `curl …` 见官方文档

### 克隆与安装

```bash
git clone https://github.com/Norman-pong/learn-architect-prep.git
cd learn-architect-prep

# 由 vite-plus 接管 Node 版本 + pnpm 安装依赖
vp install
```

### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env,至少需要 JWT_SECRET 与 AI_ENCRYPT_KEY(随机 32 字节)
```

### 启动开发

```bash
# 一条命令同时拉起 admin(5173) 与 server(8787)
vp dev
```

或分应用:

```bash
# 后端(Bun watch 模式)
cd server && bun run dev

# 前端(vite-plus)
cd apps/admin && vp dev
```

### 首次访问

打开 `http://localhost:5173`,使用 `.env` 中设置的初始密码登录单用户后台。

---

## 常用脚本

所有命令经由 `vp`(vite-plus)统一调度,**不要**直接 `npm` / `pnpm` / `npx vitest`。

| 命令 | 作用 |
|:---|:---|
| `vp install` | 安装工作区依赖 + 同步 pnpm 版本 |
| `vp dev` | 并行启动所有 workspace 的 dev server |
| `vp run -r build` | 构建所有 workspace |
| `vp check` | 全量类型检查 + fmt + lint |
| `vp lint` | 仅 lint |
| `vp fmt` | 仅格式化 |
| `vp test` | 运行测试(由各子包 `vitest` 配置) |
| `vp env doctor` | 工具链自检(Node / pnpm / 原生绑定) |

数据导入脚本位于 `scripts/`,按需 `bun run scripts/<name>.ts`。

---

## 环境变量

完整模板见 [`.env.example`](.env.example)。关键项:

| 变量 | 必填 | 说明 |
|:---|:---:|:---|
| `PORT` | 否 | 后端端口,默认 `8787` |
| `CLOUDFLARED_DOMAIN` | 否 | 配置后 CORS 自动放行该域名 |
| `JWT_SECRET` | 是 | 签发 access / refresh token 的密钥 |
| `AI_ENCRYPT_KEY` | 是 | AES-256 加密存储的 LLM API Key,32 字节 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | 视功能 | 邮件通知(可选) |

> LLM 提供商 API Key(OpenAI / Anthropic / DeepSeek)由后端 AES-256 加密后存于 SQLite,不在 `.env` 中。

---

## AI 集成

所有 AI 能力(智能出题、论文评分、案例评分、知识点答疑、学习路径生成)均由 `server/src/modules/ai` 统一封装,通过 Vercel AI SDK 调度多个 Provider:

- `@ai-sdk/openai`
- `@ai-sdk/anthropic`
- `@ai-sdk/deepseek`

**安全约束**:

- 前端**不**直接调用任何 LLM API,所有请求经 `app.api.v1.ai.*`。
- API Key 在首次写入时 AES-256 加密,数据库中不存明文。
- AI 调用走后端日志,便于成本与失败率统计(`stats` 模块聚合)。

---

## 数据资产

`data/` 目录是 Git 维护的**只读**静态内容,运行期服务以只读方式读取,不在此落盘。

| 类型 | 路径 | 用途 |
|:---|:---|:---|
| 知识点 | `data/knowledge/chapter-XX/*.md` | 每章一目录,每篇一知识点 |
| 知识点索引 | `data/knowledge/index.json` | 章节元数据(标题、分值、顺序) |
| 选择题库 | `data/quiz/questions.json` | 题干 / 选项 / 答案 / 解析 / 章节 / 难度 / 来源 / hash |
| 案例题库 | `data/quiz/cases.json` | 案例分析题(5 选 4) |
| 论文题库 | `data/quiz/essays.json` | 论文题(4 选 1) |
| 论文模板 | `data/writing/templates/*.md` | 结构化论文模板 |
| 论文范文 | `data/writing/samples/*.md` | 10 大高频主题范文 |
| 写作技巧 | `data/writing/tips/*.json` | 段落 / 章节 / 摘要等结构化技巧数据 |
| 真题导入 | `data/import/*.json` | 历年真题批量导入数据 |

内容更新流程:编辑 `data/` 下文件 → 提交 → 重启服务(或等待热加载) → 题库 hash 变更触发客户端缓存失效。

---

## 开发与运维约定

- **Git 提交**:遵循仓库内 `.lore/`,推荐使用 `lore commit` 走 JSON trailer;查询历次改动用 `lore log <path>`,溯源某行用 `lore why <file>:<line>`。
- **前后端管理**:任何 `npm` / `pnpm` / `nvm` / `npx vitest` / 直接 `vite` 命令都应替换为 `vp` 指令,见 `~/.omp/agent/rules/frontend-use-vp.md`。
- **代码规范**:fmt / lint / 检查 / 类型 全走 `vp check`;`vite.config.ts` 顶部 `fmt` / `lint` 块已忽略 `data/`、`*.json`、`*.md`、`.agents/`、`.lore/`。
- **staged pre-commit**:`{apps,server,packages}/**/*.{ts,tsx,js,jsx}` 自动跑 `vp check --fix`。
- **AI 调用**:新增 AI 能力先在 `modules/ai` 注册 provider 与 prompt 模板,不要在前端直接调 SDK。
- **数据迁移**:表结构变更在 `server/src/db/schema.ts` 集中维护,版本号自增。

---

## 部署

详见 [`deploy/README.md`](deploy/README.md)。简要流程:

1. `vp run -r build` 构建前后端
2. 用 Bun 启动后端:`bun run server/dist/index.js`
3. 用 cloudflared 暴露:`cloudflared tunnel --url http://localhost:8787`
4. 生产建议使用 `cloudflared tunnel login` 持久化 named tunnel

---

## 文档索引

`docs/` 目录使用 SDD(Spec-Driven Development)体系:

- [`docs/index.md`](docs/index.md) — 文档总入口
- [`docs/spec/2026-07-08-archprep.md`](docs/spec/2026-07-08-archprep.md) — 需求澄清结果
- [`docs/prd/2026-07-08-archprep.md`](docs/prd/2026-07-08-archprep.md) — 产品需求文档
- [`docs/architecture/overview.md`](docs/architecture/overview.md) — 架构总览
- [`docs/architecture/decisions.md`](docs/architecture/decisions.md) — 架构决策记录(ADR)
- [`docs/phase/`](docs/phase/) — 5 个阶段任务拆分(基础设施 / 学习+习题 / 题库+AI / 写作+模考 / 个性化)
- [`docs/reference/调研报告.md`](docs/reference/调研报告.md) — 软考高级 / 038 教材调研
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — 文档贡献规范

---

## 路线图

按 `docs/phase/` 阶段推进:

| 阶段 | 主题 | 状态 |
|:---|:---|:---:|
| Phase 1 | 基础设施 + 单用户鉴权 + 部署 | 未开始 |
| Phase 2 | 学习 + 习题核心(知识点 / SM-2 / 选择题 / 错题本) | 未开始 |
| Phase 3 | 题库批量导入 + AI 选题 / 评分 | 未开始 |
| Phase 4 | 论文模板 / 工作台 / 模拟考 | 未开始 |
| Phase 5 | 搜索 / 提醒 / 推荐 / 成本展示 | 未开始 |

---

## 许可证

本仓库为个人学习项目,数据资产(教材知识点、题库、范文)版权归原作者所有,仅供本人备考与个人学习使用。
