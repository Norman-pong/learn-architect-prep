import { Elysia, t } from "elysia";

const CaseDimensionSchema = t.Object({
  name: t.String(),
  weight: t.Number(),
  description: t.String(),
  criteria: t.Array(t.String()),
});

const EssayDimensionSchema = t.Object({
  name: t.String(),
  weight: t.Number(),
  description: t.String(),
  criteria: t.Array(t.String()),
  maxScore: t.Number(),
});

const CaseStandardsResponse = t.Object({
  type: t.Literal("case"),
  dimensions: t.Array(CaseDimensionSchema),
  totalWeight: t.Number(),
});

const EssayStandardsResponse = t.Object({
  type: t.Literal("essay"),
  dimensions: t.Array(EssayDimensionSchema),
  totalWeight: t.Number(),
});

const caseDimensions = [
  {
    name: "采分点覆盖度",
    weight: 60,
    description: "是否覆盖参考答案中的关键采分点",
    criteria: [
      "覆盖全部核心采分点 → 高分",
      "覆盖大部分采分点 → 中高分",
      "覆盖部分采分点 → 中低分",
      "遗漏关键采分点 → 低分",
    ],
  },
  {
    name: "技术准确性",
    weight: 20,
    description: "架构选择/技术方案是否正确",
    criteria: [
      "技术方案选型正确、理由充分 → 高分",
      "技术方案基本正确但理由不足 → 中高分",
      "技术方案有偏差但方向正确 → 中低分",
      "技术方案明显错误 → 低分",
    ],
  },
  {
    name: "逻辑完整性",
    weight: 10,
    description: "答题逻辑是否完整、自洽",
    criteria: [
      "逻辑链条完整、推导自洽 → 高分",
      "逻辑基本完整但有小跳跃 → 中高分",
      "逻辑存在明显断裂 → 中低分",
      "逻辑混乱或自相矛盾 → 低分",
    ],
  },
  {
    name: "表达规范",
    weight: 10,
    description: "专业术语、结构清晰度",
    criteria: [
      "术语准确、结构清晰、分点明确 → 高分",
      "术语基本准确但结构一般 → 中高分",
      "术语有误或结构混乱 → 中低分",
      "表达不清、术语错误多 → 低分",
    ],
  },
];

const essayDimensions = [
  {
    name: "切题",
    weight: 30,
    description: "完全覆盖题中所有子论点，不跑题",
    maxScore: 30,
    criteria: [
      "开篇即点题，每段呼应题目要求 → 高分",
      "基本覆盖子论点但个别偏离 → 中高分",
      "部分跑题或遗漏重要子论点 → 中低分",
      "严重跑题或答非所问 → 低分",
    ],
  },
  {
    name: "应用深度与水平",
    weight: 20,
    description: "技术方案选型理由、决策依据、对比分析",
    maxScore: 20,
    criteria: [
      "不止用了什么，还说明为什么选这个 → 高分",
      "有技术选型但理由不够充分 → 中高分",
      "选型简单堆砌，缺乏对比 → 中低分",
      "纯理论堆砌，无具体技术方案 → 低分",
    ],
  },
  {
    name: "实践性",
    weight: 20,
    description: "有具体项目背景、真实数据、个人角色",
    maxScore: 20,
    criteria: [
      "有时间、规模、QPS、团队人数、上线效果 → 高分",
      "有项目背景但数据不够具体 → 中高分",
      "项目背景模糊，数据缺失 → 中低分",
      "纯理论无项目 → 直接不及格",
    ],
  },
  {
    name: "表达能力",
    weight: 15,
    description: "结构清晰、逻辑顺畅、专业术语准确",
    maxScore: 15,
    criteria: [
      "分节序号清晰，段落≤8行，少废话 → 高分",
      "结构基本清晰但个别段落冗长 → 中高分",
      "结构混乱，术语有误 → 中低分",
      "字数不足、字迹潦草 → 低分",
    ],
  },
  {
    name: "综合与分析",
    weight: 15,
    description: "多角度分析、权衡取舍、有反思总结",
    maxScore: 15,
    criteria: [
      "既讲成功也讲不足，体现工程思维 → 高分",
      "有分析但缺乏深度反思 → 中高分",
      "分析片面，无权衡 → 中低分",
      "无反思总结 → 低分",
    ],
  },
];

export const scoringStandardsRoutes = new Elysia({
  prefix: "/api/scoring-standards",
})
  .get(
    "/case",
    () => ({
      type: "case" as const,
      dimensions: caseDimensions,
      totalWeight: caseDimensions.reduce((sum, d) => sum + d.weight, 0),
    }),
    {
      response: CaseStandardsResponse,
    },
  )
  .get(
    "/essay",
    () => ({
      type: "essay" as const,
      dimensions: essayDimensions,
      totalWeight: essayDimensions.reduce((sum, d) => sum + d.weight, 0),
    }),
    {
      response: EssayStandardsResponse,
    },
  );

export default scoringStandardsRoutes;
