# 前端重构架构决策记录

日期：2026-07-09
状态：已决策

## ADR-001: UI 库选择 — antd 6 → Base UI + Tailwind v4
- **日期**: 2026-07-09
- **状态**: 已决策
- **背景**: 当前管理后台基于 antd 6，组件体积大、tree-shaking 效果差，生产包 gzip 后约 280KB；样式定制受 antd 设计令牌约束，与 React 19 的兼容性也需要额外补丁。
- **决策**: 采用 Base UI 作为无样式 headless 组件库，组合 Tailwind v4 进行原子化样式，使用 CVA（class-variance-authority）管理组件变体。
- **理由**:
  - 预期生产包 gzip 后降至约 80KB，减少约 200KB 首次加载；
  - 样式完全可控，无需覆盖 antd 全局 token 或 !important；
  - Base UI 与 React 19 完全兼容，无需兼容性 polyfill。
- **备选方案**: 继续使用 antd 6（已拒绝，bundle 与定制成本高）；迁移至 shadcn/ui（已拒绝，仍依赖 Radix 且风格预设与项目方向不符）。
- **影响**: 所有新增组件必须基于 Base UI + Tailwind v4；旧 antd 组件按页面逐步替换，禁止在重构后的页面中引入新 antd 依赖。

## ADR-002: HTTP 入口 — fetchWithAuth → Eden Treaty
- **日期**: 2026-07-09
- **状态**: 已决策
- **背景**: `apps/admin/src/api/client.ts` 约 120 行手写 `fetchWithAuth`，并自行维护 in-flight refresh 队列与 token 重试逻辑，存在竞态条件与重复代码。
- **决策**: 采用 Eden Treaty (`treaty<App>`) 作为主 fetcher，从 Elysia server App 类型推导全部路由、请求与响应类型。
- **理由**:
  - 编译时类型安全，后端接口变更立即在 admin 端触发类型错误；
  - 零手写 URL，避免字符串拼接与路径漂移；
  - token 注入集中在 `headers()` 回调，统一处理 401 与刷新。
- **备选方案**: 继续维护手写 fetchWithAuth（已拒绝，错误成本高）；迁移到 tRPC（已拒绝，server 端为 REST/Elysia 生态，tRPC 引入额外传输层）。
- **影响**: 删除 `api/client.ts` 中手写 fetcher；所有服务端调用改为 `api.api.v1.*` 形式；token 注入逻辑迁移到 Eden Treaty 配置。

## ADR-003: 状态层 — 手写订阅 → zustand
- **日期**: 2026-07-09
- **状态**: 已决策
- **背景**: `apps/admin/src/store/theme.ts` 约 93 行手写 `Set<subscriber>` 订阅模式，状态变更时全量通知，易产生不必要的重渲染；无持久化与开发工具支持。
- **决策**: 使用 zustand 管理所有客户端状态（auth / ui-prefs / theme），按 store 拆分，通过 selector 订阅精确字段。
- **理由**:
  - selector 窄选避免不必要 rerender，提升列表页性能；
  - `persist` 中间件一行实现本地持久化；
  - Redux DevTools 集成，支持时间旅行与状态快照。
- **备选方案**: 继续手写订阅模式（已拒绝，维护成本高）；使用 Jotai（已拒绝，原子化模型适合分散状态，当前业务更适应单一 store 树）。
- **影响**: 删除手写 `store/theme.ts` 订阅代码；新增 `authStore`、`uiStore`、`themeStore`；组件通过 `useStore(selector)` 读取状态。

## ADR-004: 路由 — react-router 6 → TanStack Router
- **日期**: 2026-07-09
- **状态**: 已决策
- **背景**: `App.tsx` 中 21 条手写 `<Route>` 配置，无类型安全，路由参数与 search params 全靠运行时推断；权限守卫放在 `useEffect` 中，存在首屏闪烁。
- **决策**: 迁移至 TanStack Router，采用文件式路由自动代码分割，使用 `beforeLoad` 作为 auth gate。
- **理由**:
  - 全链路类型安全的 `<Link>` 与 `useSearch`；
  - 文件式路由自动按路由代码分割，降低首屏 bundle；
  - `beforeLoad` 在路由切换前执行，比 `useEffect` 守卫更可靠，避免未授权页面闪烁。
- **备选方案**: 继续 react-router 6（已拒绝，无类型安全）；迁移至 Next.js App Router（已拒绝，项目为 Vite SPA，引入 Next.js 成本过高）。
- **影响**: 删除 `App.tsx` 中手写路由表；路由定义迁移到 `src/routes/*`；所有导航链接替换为 TanStack Router 的 `Link`/`navigate`。

## ADR-005: 数据层 — useEffect fetch → TanStack Query
- **日期**: 2026-07-09
- **状态**: 已决策
- **背景**: 代码库中约 30 处裸 `useEffect + fetch + cancelled` 守卫，无缓存复用、无后台刷新、无统一错误处理；手动维护 loading/error 状态导致模板代码冗余。
- **决策**: 使用 TanStack Query 接管所有服务端状态，配置 `QueryCache.onError` 集中处理 401，设置 `staleTime: 10s`，retry 排除 401/403。
- **理由**:
  - 自动缓存、去重与后台刷新，减少重复请求；
  - `staleTime: 10s` 避免同页高频请求；
  - retry 逻辑排除 401/403，避免无效重试触发账号锁定。
- **备选方案**: 继续使用手写 useEffect fetch（已拒绝，可维护性差）；使用 SWR（已拒绝，TanStack Query 与 Router 同属 TanStack 生态，一致性更好）。
- **影响**: 所有 `useEffect` 数据获取替换为 `useQuery`/`useMutation`；删除手动 `cancelled` 守卫；服务端错误统一收敛到 `QueryCache.onError`。

## ADR-006: 主题持久化 — localStorage → cookie
- **日期**: 2026-07-09
- **状态**: 已决策
- **背景**: 当前主题偏好存储在 `localStorage`，在 cloudflared 隧道等场景下偶发丢失，导致 SSR 首屏无法读取主题，出现白闪/暗闪。
- **决策**: 主题偏好改用 cookie (`ap-theme`) 持久化，SSR 首屏可读取，避免闪烁。
- **理由**:
  - cookie 随请求携带，SSR 渲染时已知主题，避免客户端切换导致的闪烁；
  - 不受 cloudflared 隧道 localStorage 同步异常影响；
  - 作用域与过期时间可控，便于多子域共享。
- **备选方案**:
  - localStorage（已拒绝，隧道兼容性差，SSR 不可读）；
  - sessionStorage（已拒绝，标签页关闭丢失，同样不可 SSR）。
- **影响**: 更新 `themeStore` 使用 cookie 读写；后端/中间件在 SSR 时读取 `ap-theme` 注入到 HTML；移除 localStorage 主题键。
