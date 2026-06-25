// 面试复盘结构化解析（仿 K12 PreferenceParser 那套写法）：
// 用 REVIEW_DIMENSIONS 动态拼 prompt → 调模型链 → 健壮解析 / 兜底，
// 返回 { scores（8 维度 0-100 整数）, strengths, weaknesses, improvement }。

import { chatJSON, type LlmOverride } from "./client";
import {
  REVIEW_DIMENSIONS,
  type ReviewDimension,
  type ReviewScores,
} from "@/lib/types";

export type ParsedReview = {
  scores: ReviewScores;
  strengths: string;
  weaknesses: string;
  improvement: string;
};

function systemPrompt(): string {
  const dims = REVIEW_DIMENSIONS.map((d) => `  "${d.key}": <0-100 整数>, // ${d.label}`).join("\n");
  return `你是一名资深的校招面试官与职业教练。请根据用户提供的面试复盘记录，客观评估这次面试表现。

只输出一个 JSON 对象，不要任何额外文字或 Markdown 围栏，结构严格如下：
{
  "scores": {
${dims}
  },
  "strengths": "<这次面试的突出优势，2-4 句>",
  "weaknesses": "<明显的不足与待改进点，2-4 句>",
  "improvement": "<针对待改进点的具体行动建议，2-4 句>"
}

评分要求：每个维度 0-100 的整数；信息不足以判断的维度给 60 左右的中性分，不要编造细节。所有文本用中文。`;
}

// 剥掉可能的 ```json 围栏后再 parse。
function safeParse(raw: string): unknown {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // 兜底：截取第一个 { 到最后一个 }，去掉模型偶尔带的前后缀。
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 60; // 缺字段 / 非法值兜底
  return Math.max(0, Math.min(100, Math.round(n)));
}

function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function parseReview(
  transcript: string,
  override?: LlmOverride
): Promise<ParsedReview> {
  const { content } = await chatJSON(
    [
      { role: "system", content: systemPrompt() },
      { role: "user", content: transcript },
    ],
    override
  );

  const obj = safeParse(content) as Record<string, unknown>;
  const rawScores = (obj?.scores ?? {}) as Record<string, unknown>;

  const scores = Object.fromEntries(
    REVIEW_DIMENSIONS.map((d) => [d.key, clampScore(rawScores[d.key])])
  ) as ReviewScores;

  return {
    scores,
    strengths: asText(obj?.strengths),
    weaknesses: asText(obj?.weaknesses),
    improvement: asText(obj?.improvement),
  };
}

// 给个空类型守卫导出，方便别处复用维度键。
export type { ReviewDimension };
