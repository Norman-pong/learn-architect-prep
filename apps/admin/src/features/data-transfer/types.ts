export interface ImportPreview {
  reviewCards: number;
  quizRecords: number;
  examRecords: number;
  writings: number;
  notes: number;
  studySessions: number;
  aiConfigs: number;
  aiUsage: number;
}

export const previewLabels: Record<keyof ImportPreview, string> = {
  reviewCards: "复习卡片",
  quizRecords: "练习记录",
  examRecords: "模拟考记录",
  writings: "论文",
  notes: "笔记",
  studySessions: "学习会话",
  aiConfigs: "AI 配置",
  aiUsage: "AI 使用记录",
};

export interface ImportResult {
  imported: number;
  errors: string[];
}
