# ArchPrep 设计系统

> 单一作者长期使用的备考工具。设计目标是在最少装饰下呈现最大信息密度,移动端优先,且随主题平滑切换。

---

## 一、概述

ArchPrep 是个人备考系统(系统架构设计师 / 软考高级 / 038)。所有色彩、间距、字号、交互均通过 Token + Tailwind v4 工具类落地,避免硬编码、避免组件层级漂移。本设计系统约束当前重构后的 Base UI + Tailwind v4 + TanStack 栈。

---

## 二、品牌定位

- **不是 SaaS,不是社交产品,是单人备考工具**。
- **知识密度 > 装饰**:任何 hover/focus 装饰都必须服务于"我现在该看哪、读哪、写哪"。
- **暗色优先不强求,但必须平滑切换**:浅色适合白天阅读,深色适合夜间刷题,切换需要 150ms 过渡无闪烁。
- **移动端是真实使用场景,不是兜底**:大量在通勤地铁、午休碎片时间访问,要保证触控、视口、安全区全部合规。

---

## 三、色板

| Token | 类 | 用途 |
|:---|:---|:---|
| `--background` / `--foreground` | `bg-background` `text-foreground` | 全局背景与默认前景 |
| `--card` / `--card-foreground` | `bg-card` `text-card-foreground` | 卡片背景(默认白/深灰) |
| `--primary` / `--primary-foreground` | `bg-primary` `text-primary-foreground` | 主按钮、当前激活态、高亮文本 |
| `--primary-hover` | `bg-primary-hover` | 主按钮 hover |
| `--primary-subtle` | `bg-primary-subtle` | 选中态低饱和背景(选项勾选、轻提示) |
| `--muted` / `--muted-foreground` | `bg-muted` `text-muted-foreground` | 二级文本、占位符、辅助标签 |
| `--accent` / `--accent-foreground` | `bg-accent` `text-accent-foreground` | 链接 hover、行内强调 |
| `--success` / `--success-foreground` / `--success-subtle` | `text-success` `bg-success-subtle` | 答对、保存成功 |
| `--warning` / `--warning-foreground` / `--warning-subtle` | `text-warning` `bg-warning-subtle` | 草稿未保存、限时提醒 |
| `--destructive` / `--destructive-foreground` / `--destructive-subtle` | `text-destructive` `bg-destructive-subtle` | 错误、删除、答错 |
| `--sidebar-*` | `bg-sidebar` `text-sidebar-foreground` 等 | 侧栏的 7 个独立语义色,主题感知 |
| `--border` / `--input` / `--ring` | `border-border` `border-input` `ring-ring` | 描边、输入框边框、焦点环 |
| `--popover` / `--overlay` | `bg-popover` `bg-overlay` | 浮层与遮罩 |
| `--header-*` | `bg-header` `text-header-foreground` | 顶栏(预留,目前未启用) |
| `--chart-1..5` | 由图表组件内引用 | 5 色图表序列,确保明暗对比稳定 |

**使用铁律**:
- 永远不要写 `text-blue-600`、`bg-emerald-50` 这类 Tailwind 调色板硬编码。
- 状态色统一映射:绿→`success`、黄→`warning`、红→`destructive`、主色→`primary`。

---

## 四、字号与排版

| 角色 | Tailwind 类 | 行高 |
|:---|:---|:---|
| **页面 H1**(`SectionPageLayout` 标题) | `text-lg sm:text-xl lg:text-2xl font-bold tracking-tight` | 默认 1.2 |
| **模块小标题** | `text-base sm:text-lg font-semibold` | 1.3 |
| **正文 / 段落** | `text-sm leading-relaxed` | 1.6 |
| **辅助文本 / 标签** | `text-xs text-muted-foreground` | 1.5 |
| **数值 / KPI** | `text-2xl sm:text-3xl font-semibold tabular-nums` | 1.1 |

**字体栈**:中文优先 `PingFang SC` → `Microsoft YaHei` → `Noto Sans CJK SC` → 兜底无衬线,等宽 `JetBrains Mono` / `SF Mono`。

**排版禁忌**:中文正文不要加 `tracking-tight`,会破坏字符间距;CJK fallback 必须显式声明,浏览器默认在多语种混排时降级到 Linux 上不可读的字形。

---

## 五、间距 / 圆角 / 阴影

| 场景 | 间距 | 圆角 | 阴影 |
|:---|:---|:---|:---|
| **页面主容器** | `space-y-4 px-4 py-6 sm:px-6 lg:px-8` | — | — |
| **卡片** | `p-4 sm:p-5 lg:p-6` | `rounded-lg` | `shadow-sm` |
| **按钮 / Pill** | `h-9`(`h-11 sm:h-9` 移动) | `rounded-md` | `shadow-sm`(主按钮) |
| **浮层 Save Bar** | `sticky bottom-0 px-4 py-3` | `rounded-t-lg` 或无 | `shadow-lg` |
| **Dialog / 模态** | `p-6 gap-4` | `rounded-lg`(`max-sm:rounded-none`) | `shadow-lg`(桌面)/无(移动全屏) |
| **Toast** | 内建 `sonner`,无需另设 | — | — |
| **Sidebar** | `px-3 py-4 gap-2` | — | — |

**阴影使用约定**:内容层 = `shadow-sm`,浮层 = `shadow-lg`,模态 = `shadow-lg`,绝不在卡片嵌套卡片再叠一层 `shadow-lg` 制造"云母片"。

---

## 六、布局

- **桌面(>= 768px)**:左侧固定 64 / 16 宽侧栏(`w-64`/`w-16`),主区域自适应,`transition-[margin-left] duration-200` 做折叠动画。
- **移动(< 768px)**:无侧栏,左上一个浮动按钮打开 `Drawer`(从 left 滑入,自动包含 `safe-area-inset`)。
- **页面骨架**:`SectionPageLayout`(标题 + 描述 + actions + 内容组),内容组 `space-y-4`。
- **表格**:外层 `overflow-x-auto`(或带虚拟滚动的 `overflow-x-auto overflow-y-auto`),列多时优先隐藏低优先级列(`hidden sm:table-cell`)。
- **弹窗**:桌面居中,移动全屏(`max-sm:fixed max-sm:inset-0 max-sm:max-w-none`)。
- **章节目录**:在 `learn` / `knowledge` 用桌面侧栏 + 移动 Drawer 双形态。

---

## 七、移动端契约

> 这是本设计系统最重要的一节。任何"看起来工作"的桌面布局,都不等于移动端可用。

| 规则 | 实现 |
|:---|:---|
| **视口高度不要用 `100vh`** | 全局使用 `--app-h` CSS 变量,由 `useViewportHeight()` hook 注入到根容器,布局类写成 `h-[calc(var(--app-h)-3.5rem)]` |
| **触控目标 ≥ 44px** | `Input` `h-11 sm:h-9`;`Button` 默认 `h-9` 但含 icon-only 时按 44px 处理;`Select` 触发器同样 |
| **Dialog 全屏** | `max-sm:fixed max-sm:inset-0 max-sm:m-0 max-sm:max-w-none max-sm:rounded-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:h-full` |
| **Drawer 安全区** | 内容 padding `pt-[max(env(safe-area-inset-top),0.5rem)] pb-[max(env(safe-area-inset-bottom),0.5rem)]` |
| **表格容器** | 必须包在 `overflow-x-auto` div 内,列数过多时优先隐藏次要列 |
| **字号响应式** | 标题 `text-lg sm:text-xl lg:text-2xl`,大数字 `text-2xl sm:text-3xl`,禁止纯 `text-2xl` 不做 `sm:` 缩放 |
| **底部 sticky bar** | 必须 `bg-background` 或 `bg-card` + `border-t` + `shadow-sm` + `z-10`,避免内容穿透 |
| **iOS 输入法** | 使用 `--app-h` 自动收缩;不要用 `100vh` 锁死高度,否则键盘弹起时底部提交按钮看不见 |

---

## 八、可访问性

- **焦点环**:全局 `:focus-visible` 应用 `box-shadow: var(--shadow-focus)`,与 `ring-ring` 视觉一致。
- **icon-only 按钮必须 `aria-label`**:`<MenuFoldOutlined />`、复制、收藏、报错按钮都必须显式说明用途。
- **暗色模式对比度**:`oklch()` 调色板默认提供 >= 4.5:1 对比度,正文 / 背景 / 边线全部落在 WCAG AA 之上。
- **键盘可达**:Dialog/Drawer/Sheet/Dropdown 全部默认 trap focus,Esc 关闭(由 Base UI 提供)。
- **动画克制**:仅做 150ms 颜色 / 阴影过渡;不要做旋转、缩放等装饰动画(iOS 用户系统设置可能要求减弱动画)。

---

## 九、交互模式

- **Dialog**:右上角 × 关闭按钮 + Esc + 点击 backdrop 关闭(三选一即可关闭)。
- **Drawer**:`side="left"` 打开后点击内容区按钮自动 `onOpenChange(false)` 关闭(由调用方传回调)。
- **Toast**:`sonner` 统一封装,成功默认 3s,错误默认 5s,持久错误提供 `dismiss`。
- **加载态**:所有 data fetching 用 `Skeleton`(占位卡片)+ `Skeleton-line`,无满屏 spinner。
- **空态**:`EmptyState`(图标 + 一句话 + 主操作)统一组件,禁止裸 `<div>暂无数据</div>`。
- **错误态**:`EmptyState variant="error"` 或 inline `text-destructive`,结合 toast。
- **表单提交**:disable 按钮 + `aria-busy`,不引入乐观锁(单人单设备场景无并发)。
- **删除二次确认**:`Dialog` 标题明确写"删除 X",描述给出不可逆警告,默认焦点在"取消"。

---

## 十、反模式

| 反模式 | 修正 |
|:---|:---|
| 硬编码颜色 `text-blue-600` `bg-emerald-50` | 改用 `text-primary` `bg-success-subtle` 等主题 token |
| `h-[calc(100vh-Xrem)]` | 改用 `h-[calc(var(--app-h)-Xrem)]` + `useViewportHeight()` 包裹 |
| 双重 padding / 双重 space-y | 一个布局组件只承担一种间距语义,内层卡片不再加外层 padding |
| icon-only 按钮缺 `aria-label` | 必须有 `aria-label="复制" / "删除" / ...` |
| `text-2xl` 不做响应式 | 改成 `text-lg sm:text-xl lg:text-2xl` 或 `text-base sm:text-lg md:text-2xl` |
| `<Link onClick={() => undefined}>` 在侧栏 | 桌面端无操作时传 `NOOP` 具名常量,意图明确;移动端关闭 Drawer |
| 直接读 `window.location.pathname` | 用 `useRouterState((s) => s.location.pathname)`,保证 TanStack Router 一致 |
| `setInterval` 直接放在 React 组件里做倒计时 | 用统一的 `useCountdown` hook,StrictMode 安全且 cleanup 完整 |
| Skeleton 用 `<Skeleton>` 却不挂 `role="status"` | 至少加 `aria-label="加载中"` |
| 把多个色 hard-code 进 dashboard card | 走 `--chart-1..5` 或 `--success/warning/destructive` 语义 token |

---

## 十一、路线图

1. **EmptyState 统一**:目前散落在多个 feature 中(`error-book`、`weakness-panel`、`qa-page` 都有自制的"暂无数据"),抽到 `components/ui/empty-state.tsx` 并接入全部 6+ 个空态场景。
2. **Skeleton 复用层**:除了当前 `<Skeleton>` 行/块,补一组 `<SkeletonCard>` `<SkeletonList>` 用于列表与卡片加载,与 `Skeleton` 颜色/动效统一。
3. **字体 fallback 显式声明**:在 `theme.css` 的 `--font-sans` 显式加入 `PingFang SC`,`Microsoft YaHei`,`Noto Sans CJK SC`,并在 `@font-face` 加入思源黑体自托管(可选),Linux/容器部署时不再回退到不可读字形。

---

## 维护说明

- 改色板动 `--primary` 等基础 token → 必须同时验证按钮 / 链接 / 当前激活态 / 选中态 4 处视觉。
- 新增组件 → 优先从现有 `components/ui/*` 组合,不要写 inline style。
- 改 sidebar → 必须 `< lg 与 >= lg 两个 viewport 都在 Playwright 里跑一次截图。
- 提交前 `vp check` 必跑,失败原地修,不要遗留。
