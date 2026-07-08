# 贡献指南

欢迎参与 ArchPrep 系统架构设计师备考系统的文档体系建设。本指南说明如何参与 `docs/` 目录下各类文档的编写、评审与维护。

## 1. 文档体系简介

本项目使用 **SDD（Spec-Driven Development）** 文档体系，由 `sdd-pack` 插件提供技能家族支持：

| 技能 | 职责 |
|------|------|
| `sdd-core` | 文档体系规范、目录结构、模板、命名约定 |
| `sdd-input` | 需求输入、Spec 整理、问题澄清 |
| `sdd-prd` | PRD 编写、评审、状态管理 |
| `sdd-phase` | 阶段规划、任务分解、里程碑跟踪 |

所有文档变更应以规范为依据，以 `lore` 记录约束与决策，确保需求、设计与实现之间的可追溯性。

## 2. 目录结构说明

`docs/` 目录结构如下：

```
docs/
├── index.md              # 文档总入口
├── CONTRIBUTING.md       # 贡献指南（本文件）
├── spec/                 # 结构化需求输入
│   ├── _template.md      # Spec 模板
│   └── *.md              # Spec 文件
├── prd/                  # 产品需求文档
│   ├── _template.md      # PRD 模板
│   ├── archive/          # 已归档 PRD
│   └── *.md              # PRD 文件
├── phase/                # 阶段任务文档
│   ├── _template.md      # Phase 模板
│   └── *.md              # Phase 文件
├── architecture/         # 架构文档
│   ├── overview.md       # 架构总览
│   └── *.md              # 专题架构文档
└── reference/            # 参考资料
    ├── README.md         # 参考资料索引
    └── *.md              # 参考资料文件
```

各目录职责：

| 目录 | 职责 | 维护频率 |
|------|------|----------|
| `spec/` | 结构化需求输入、口语化需求整理结果 | 立项/需求输入 |
| `prd/` | 产品需求、功能规格、验收标准 | 按版本/迭代 |
| `phase/` | 阶段任务、实施计划、里程碑跟踪 | 按阶段 |
| `architecture/` | 系统设计、技术架构、模块关系 | 随系统演进 |
| `reference/` | 外部资料、规范文档、接口说明 | 按需更新 |

## 3. 工作流程

### 3.1 修改前：查询约束

在创建或修改文档前，必须先查询相关约束，避免违反已确定的规则或重复已否决方案：

```bash
lore constraints docs/<类型>/<文件> --json
lore rejected docs/<类型>/<文件> --json
lore directives docs/<类型>/<文件> --json
```

处理规则：

- **Constraint**：必须遵守，违反会导致系统不一致。
- **Rejected**：不要重复已否决的方案。
- **Directive**：应当遵循团队约定。

### 3.2 修改中：遵循模板

根据文档类型，使用对应目录下的 `_template.md` 模板：

| 文档类型 | 模板路径 | 必需章节 |
|----------|----------|----------|
| Spec | `docs/spec/_template.md` | 问题陈述、目标用户、v1 功能边界、核心场景、验收标准、非功能需求、未决假设、参考材料 |
| PRD | `docs/prd/_template.md` | 背景与目标、用户与场景、功能需求、非功能需求、验收标准 |
| Phase | `docs/phase/_template.md` | 阶段目标、任务分解、里程碑、风险与问题、验收 |

- 保持结构清晰，善用表格和列表。
- 交叉引用使用相对路径，如 `../prd/YYYY-MM-DD-<prd-name>.md`。
- 如需临时工作空间，可在对应目录下创建 `.working/YYYY-MM-DD-<name>/`，阶段完成后必须清理。

### 3.3 修改后：更新索引并提交

文档修改完成后，必须：

1. 更新 `docs/index.md` 中的对应列表。
2. 更新目录级 `README.md`（如存在）。
3. 使用 `lore commit` 提交变更：

```bash
echo '{
  "intent": "docs: <简短描述>",
  "body": "<详细说明变更内容、原因、影响>",
  "trailers": {
    "Constraint": ["<本次变更引入的硬规则>"],
    "Rejected": ["<被否决方案 | 原因>"],
    "Directive": ["<团队约定>"],
    "Confidence": "high|medium|low",
    "Tested": ["<已验证内容>"],
    "Not-tested": ["<未验证内容>"]
  }
}' | lore commit
```

## 4. 命名规范

### 4.1 Spec / PRD / Phase 命名

格式：`YYYY-MM-DD-<name>.md`

- 日期使用当天日期（`YYYY-MM-DD`）。
- `<name>` 使用小写字母和连字符，简洁描述主题。
- 同一天的多个文档通过 `<name>` 区分。
- PRD 与 Phase 必须一一对应，建议使用相同日期前缀。

示例：

- ✅ `2026-07-08-user-management.md`
- ✅ `2026-07-08-spaced-repetition.md`
- ❌ `2026-7-8-user.md`（日期格式错误）
- ❌ `User_Management.md`（使用了下划线和大写）
- ❌ `PRD-001.md`（缺少日期）

### 4.2 Architecture 命名

格式：`<topic>.md`

- 使用小写字母和连字符。
- 名称应清晰描述文档主题，避免过于宽泛。

示例：

- ✅ `overview.md`
- ✅ `api-design.md`
- ✅ `data-model.md`
- ✅ `security-architecture.md`
- ❌ `architecture.md`（过于宽泛）
- ❌ `API_Design.md`（使用了大写和下划线）

## 5. 文档校验

提交前，必须运行文档校验脚本：

```bash
bash docs-check.sh docs
```

该脚本用于检查文档结构、命名规范、索引一致性等基础质量项。脚本未通过前，不得提交文档变更。

## 6. 前端管理

本项目前端使用 **vite-plus** 工具链管理。所有前端管理命令（安装依赖、启动开发服务器、构建、测试、格式化、代码检查等）统一使用 `vp` 命令执行：

```bash
vp dev            # 启动开发服务器
vp build          # 生产构建
vp test           # 运行测试
vp lint           # 代码检查
vp fmt            # 格式化
vp check --fix    # 自动修复
vp pm <cmd>       # 包管理器相关命令
```

禁止直接使用 `npm install`、`pnpm install`、`yarn`、裸 `vite`、`npx vitest` 或手改 `package.json` 等绕过 `vp` 的方式管理前端项目。

## 7. 质量检查清单

### 创建新文档

- [ ] 查询了 `lore constraints` / `rejected` / `directives`
- [ ] 使用了正确的命名格式
- [ ] 遵循了对应类型的 `_template.md` 模板
- [ ] 包含了所有必需章节
- [ ] PRD 与 Phase 一一对应（如适用）
- [ ] 更新了 `docs/index.md`
- [ ] 更新了目录 `README.md`（如存在）
- [ ] 检查了文档内链接
- [ ] 运行 `bash docs-check.sh docs` 并通过
- [ ] 使用 `lore commit` 提交，包含完整 trailers

### 修改现有文档

- [ ] 查询了 `lore constraints` / `rejected` / `directives`
- [ ] 没有违反 Constraint
- [ ] 没有重复 Rejected 方案
- [ ] 遵循了 Directive
- [ ] 同步更新了相关文档和索引
- [ ] 运行 `bash docs-check.sh docs` 并通过
- [ ] 使用 `lore commit` 提交

---

如有疑问，请先查看 `docs/index.md` 和对应类型的模板文件，或咨询项目维护者。
