import type {
  Writing,
  WritingSummary,
  ThesisSectionKey,
  ThesisSections,
  AiScoreSummary,
} from "@archprep/shared";

export type { Writing, WritingSummary };

export interface Template {
  id: string;
  title: string;
  description: string;
  file: string;
  sections: string[];
  word_count: { min: number; max: number };
}

export interface TemplateSection {
  id: string;
  name: string;
  word_count: { min: number; max: number };
  weight: string;
}

export interface TemplateDetail {
  title: string;
  sections: TemplateSection[];
  word_count: { total: { min: number; max: number } };
  content: string;
}

export interface Sample {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  word_count: number;
  year: string;
  tags: string[];
  file: string;
}

export interface WritingTip {
  version: number;
  updatedAt: string;
  guidelines: Guideline[];
  word_count: Record<string, { min: number; max: number }>;
  hash: string;
}

export interface Guideline {
  id: string;
  title: string;
  importance: "high" | "medium" | "low";
  content: string;
  template?: string;
  checklist?: string[];
  examples?: { bad: string; good: string }[];
  dimensions?: string[];
  required?: string[];
  optional?: string[];
  tips?: string[];
  suggested_points?: string[];
}

export interface Topic {
  year: number;
  session: string;
  title: string;
  theme: string;
  frequency: string;
}

export interface HistoricalTopic {
  year: number;
  title: string;
}

export interface HighFrequencyTheme {
  rank: number;
  theme: string;
  frequency: string;
}

export interface YearTopics {
  version: number;
  updatedAt: string;
  periods: Record<string, string>;
  topics: Topic[];
  historical_before_2018: HistoricalTopic[];
  high_frequency_themes: HighFrequencyTheme[];
  strategy: {
    quick_judgment: string[];
    selection_principles: string[];
    preparation_plan: string;
  };
  hash: string;
}

export interface TechDecision {
  id: string;
  name: string;
  description: string;
}

export interface MasterProject {
  id: string;
  name: string;
  industry: string;
  scale: string;
  role: string;
  tech_decisions: TechDecision[];
  quantifiable_metrics: {
    before: Record<string, string | number>;
    after: Record<string, string | number>;
  };
  applicable_themes: string[];
}

export interface MasterProjects {
  version: number;
  updatedAt: string;
  projects: MasterProject[];
  hash: string;
}

export type { ThesisSectionKey, ThesisSections, AiScoreSummary };
