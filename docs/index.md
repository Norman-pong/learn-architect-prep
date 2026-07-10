# 项目文档索引

> 修改记录：执行 `lore log docs/index.md`

本文档是 ArchPrep（系统架构设计师备考系统）的文档总入口。项目使用 SDD（Spec-Driven Development）文档体系，由 sdd-pack 插件提供技能家族（sdd-core/sdd-input/sdd-prd/sdd-phase）管理。

## 快速导航

### 核心文档

| 文档类型 | 最新文档 | 状态 | 说明 |
|---------|---------|------|------|
| Spec | [ArchPrep Spec](spec/2026-07-08-archprep.md) | 已提纯 PRD | 需求澄清结果，两轮交互式问答产出 |
| PRD | [ArchPrep PRD](prd/2026-07-08-archprep.md) | 草稿 | 系统架构设计师备考系统，四大功能（学习/习题/写作指导/模拟考） |
| 架构总览 | [架构总览](architecture/overview.md) | 草稿 | vite-plus 全栈架构，AI 服务层，数据架构 |
| ADR | [架构决策记录](architecture/decisions.md) | — | 待 sdd-prd 阶段2产出 |

## 结构化需求输入（Spec）

| 日期 | 文档名称 | 状态 | 对应 PRD | 说明 |
|------|---------|------|---------|------|
| [2026-07-08](spec/2026-07-08-archprep.md) | [ArchPrep Spec](spec/2026-07-08-archprep.md) | 已提纯 PRD | [PRD](prd/2026-07-08-archprep.md) | 两轮需求澄清，11项功能边界，4个核心场景 |

## 需求文档（PRD）

| 日期 | 文档名称 | 状态 | 对应 Phase | 说明 |
|------|---------|------|-----------|------|
| [2026-07-08](prd/2026-07-08-archprep.md) | [ArchPrep PRD v0.4](prd/2026-07-08-archprep.md) | 草稿 | [Phase 1-5](phase/2026-07-08-foundation.md) | 四大功能+注册制+AI SDK多模型+模拟考单/全模块 |
| [2026-07-09](prd/2026-07-09-frontend-refactor-to-base-ui.md) | [前端栈重构 PRD](prd/2026-07-09-frontend-refactor-to-base-ui.md) | 草稿 | [Phase F](phase/2026-07-09-frontend-refactor.md) | antd 6 → Base UI + Tailwind v4 + TanStack 全家桶 + Eden Treaty 主路径，业务功能不变 |

## 已归档 PRD（archive）

| 日期 | 文档名称 | 状态 | 对应 Phase | 说明 |
|------|---------|------|-----------|------|
| [2026-07-09](prd/archive/2026-07-09-p1-foundation-archive.md) | [Phase 1 归档子 PRD](prd/archive/2026-07-09-p1-foundation-archive.md) | 已归档 | [Phase 1](phase/2026-07-08-foundation.md) | 主 PRD §0.2 §0.3 不全勾；分阶段归档已交付项：FR-US-01/02/03 + FR-SY-01/02 + 6 项技术约束 |

## 阶段文档（Phase）

| 日期 | 阶段名称 | 状态 | 对应 PRD | 说明 |
|------|---------|------|---------|------|
| [2026-07-08](phase/2026-07-08-foundation.md) | [Phase 1: 基础设施与用户](phase/2026-07-08-foundation.md) | 已完成 | [ArchPrep PRD](prd/2026-07-08-archprep.md) | 用户模块+部署基础 |
| [2026-07-08](phase/2026-07-08-learning-quiz.md) | [Phase 2: 学习与习题核心](phase/2026-07-08-learning-quiz.md) | 未开始 | [ArchPrep PRD](prd/2026-07-08-archprep.md) | 知识点+SM-2+选择题+错题本 |
| [2026-07-08](phase/2026-07-08-quizbank-ai.md) | [Phase 3: 题库与AI集成](phase/2026-07-08-quizbank-ai.md) | 未开始 | [ArchPrep PRD](prd/2026-07-08-archprep.md) | 题库拉取+AI选题+AI评分 |
| [2026-07-08](phase/2026-07-08-writing-exam.md) | [Phase 4: 写作指导与模拟考](phase/2026-07-08-writing-exam.md) | 未开始 | [ArchPrep PRD](prd/2026-07-08-archprep.md) | 论文模板+工作台+模拟考 |
| [2026-07-08](phase/2026-07-08-personalization.md) | [Phase 5: 个性化与P1增强](phase/2026-07-08-personalization.md) | 未开始 | [ArchPrep PRD](prd/2026-07-08-archprep.md) | 搜索+提醒+推荐+成本展示 |
| [2026-07-09](phase/2026-07-09-frontend-refactor.md) | [Phase F: 前端栈重构](phase/2026-07-09-frontend-refactor.md) | 已完成 | [前端栈重构 PRD](prd/2026-07-09-frontend-refactor-to-base-ui.md) | antd 6 → Base UI + Tailwind v4，与 Phase 2-5 并行，不改业务逻辑 |

## 架构文档（Architecture）

| 文档名称 | 主题 | 最后更新 | 说明 |
|---------|------|---------|------|
| [架构总览](architecture/overview.md) | 系统架构 | 2026-07-10 | vite-plus 全栈架构，AI 服务层，数据架构 |
| [架构决策记录](architecture/decisions.md) | ADR | 2026-07-08 | 架构决策记录（待填充） |

## 参考资料（Reference）

| 文档名称 | 主题 | 说明 |
|---------|------|------|
| [参考资料索引](reference/README.md) | 外部资料 | 官方教材、考试大纲、GitHub真题资源 |

## 文档统计

- Spec 总数：1
- PRD 总数：2（含前端栈重构）
- 已归档 PRD：1（Phase 1 基础设施与用户模块）
- Phase 总数：6（含 Phase F）
- 架构文档：2
- 参考资料：1

最后更新：2026-07-10
