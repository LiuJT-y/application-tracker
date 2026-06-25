// 面试复盘结构化解析（仿 K12 PreferenceParser 那套写法）：
// 用 REVIEW_DIMENSIONS 动态拼 prompt → 调模型链 → 健壮解析 / 兜底，
// 返回 { scores（8 维度 0-100 整数）, strengths, weaknesses, improvement }。
//
// Part 2 起支持「简历上下文注入」：纯增量——只有当传入 resumeText 时才启用富提示词与
// 【岗位背景】【候选人简历】【面试记录】三段式 user message；没有简历时，行为与之前
// 完全一致（system prompt 原样、user message 就是 transcript 本身）。

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

// 复盘上下文：transcript 必填，其余可选；resumeText 决定是否启用富提示词。
export type ReviewContext = {
  transcript: string;
  company?: string | null;
  position?: string | null;
  jdText?: string | null;
  resumeText?: string | null;
};

const RESUME_MAX_CHARS = 4000;

// 基础 system prompt —— 与历史版本逐字一致，保证「无简历」时输出不变。
function baseSystemPrompt(): string {
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

// 有简历时追加的额外要求（让模型结合简历做一致性 / 深度 / 差距分析）。
function resumeAddendum(hasJd: boolean): string {
  const jdLine = hasJd
    ? "\n- 结合【岗位背景】的 JD，点出候选人简历与该岗位要求之间的差距，并体现在 jobMatch 维度与改进建议里。"
    : "";
  return `

你还会看到候选人的【候选人简历】。除上述要求外，请额外做到：
- 判断候选人面试回答与简历所列经历是否一致、有无明显夸大或对不上的地方。
- 评估候选人是否把简历上的真实项目讲透了（背景、动作、量化结果），没讲透要在 weaknesses 指出。
- 针对候选人的实际背景（而非泛泛而谈）给出可执行的改进建议。${jdLine}`;
}

function systemPrompt(ctx: ReviewContext): string {
  const hasResume = !!ctx.resumeText?.trim();
  if (!hasResume) return baseSystemPrompt();
  return baseSystemPrompt() + resumeAddendum(!!ctx.jdText?.trim());
}

// 拼 user message。无简历 → 原样返回 transcript（行为不变）；有简历 → 三段式上下文。
function buildUserMessage(ctx: ReviewContext): string {
  if (!ctx.resumeText?.trim()) return ctx.transcript;

  const parts: string[] = [];
  const bg: string[] = [];
  if (ctx.company) bg.push(`公司：${ctx.company}`);
  if (ctx.position) bg.push(`岗位：${ctx.position}`);
  if (ctx.jdText?.trim()) bg.push(`岗位 JD：\n${ctx.jdText.trim()}`);
  if (bg.length) parts.push(`【岗位背景】\n${bg.join("\n")}`);

  const resume = ctx.resumeText.trim().slice(0, RESUME_MAX_CHARS);
  parts.push(`【候选人简历】\n${resume}`);
  parts.push(`【面试记录】\n${ctx.transcript}`);
  return parts.join("\n\n");
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

// 接受字符串（旧调用）或 ReviewContext（带简历 / 岗位背景）。
export async function parseReview(
  input: string | ReviewContext,
  override?: LlmOverride
): Promise<ParsedReview> {
  const ctx: ReviewContext = typeof input === "string" ? { transcript: input } : input;

  const { content } = await chatJSON(
    [
      { role: "system", content: systemPrompt(ctx) },
      { role: "user", content: buildUserMessage(ctx) },
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
