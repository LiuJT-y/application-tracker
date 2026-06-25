// 面试复盘的模型层：按 AI_PROVIDER_ORDER 组成 GPT → Qwen → DeepSeek 的优先级链，
// 取第一个配置了 key 的来调；失败自动落到下一个。沿用 K12 项目 AIService 的兜底链思路。

import { OpenAICompatClient, type ProviderConfig } from "./openaiCompatClient";
import { REVIEW_SYSTEM_PROMPT, buildReviewUserMessage } from "./reviewPrompt";
import { REVIEW_DIMENSIONS, type ReviewScores } from "@/lib/types";

export type InterviewReviewResult = {
  scores: ReviewScores;
  strengths: string;
  weaknesses: string;
  improvement: string;
};

// 各 provider 的默认端点 / 模型，均可被环境变量覆盖。
function providerConfigs(): Record<string, ProviderConfig> {
  return {
    gpt: {
      label: "GPT",
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl:
        process.env.OPENAI_BASE_URL ??
        "https://api.openai.com/v1/chat/completions",
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    },
    qwen: {
      label: "Qwen",
      apiKey: process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY,
      baseUrl:
        process.env.QWEN_BASE_URL ??
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      model: process.env.QWEN_MODEL ?? "qwen-plus",
    },
    deepseek: {
      label: "DeepSeek",
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl:
        process.env.DEEPSEEK_BASE_URL ??
        "https://api.deepseek.com/chat/completions",
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    },
  };
}

// 按 AI_PROVIDER_ORDER 顺序，返回已配置好 key 的 client 链。
function configuredClients(): OpenAICompatClient[] {
  const order = (process.env.AI_PROVIDER_ORDER ?? "gpt,qwen,deepseek")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const configs = providerConfigs();
  return order
    .map((name) => configs[name])
    .filter((c): c is ProviderConfig => Boolean(c))
    .map((c) => new OpenAICompatClient(c))
    .filter((client) => client.isConfigured);
}

export async function reviewInterview(args: {
  company?: string | null;
  position?: string | null;
  jdText?: string | null;
  transcript: string;
}): Promise<InterviewReviewResult> {
  const clients = configuredClients();
  if (clients.length === 0) {
    throw new Error(
      "未配置任何模型 API Key，请在 .env 里设置 OPENAI_API_KEY / DASHSCOPE_API_KEY / DEEPSEEK_API_KEY 之一"
    );
  }

  const userMessage = buildReviewUserMessage(args);

  for (const client of clients) {
    const raw = await client.chatJson(REVIEW_SYSTEM_PROMPT, userMessage);
    const normalized = raw ? normalizeResult(raw) : null;
    if (normalized) {
      console.log(`[aiService] 面试复盘使用 ${client.label} 成功`);
      return normalized;
    }
    console.warn(`[aiService] ${client.label} 复盘失败，尝试下一个`);
  }

  throw new Error("所有模型均调用失败，请稍后重试或检查 API Key / 网络");
}

// 校验并归一化模型输出：补全 8 维度、clamp 到 0-100、文本字段统一成字符串。
// 缺 scores 或所有维度都不是数字 → 返回 null，让上层落到下一个 provider。
function normalizeResult(
  raw: Record<string, unknown>
): InterviewReviewResult | null {
  const rawScores = raw.scores;
  if (!rawScores || typeof rawScores !== "object") return null;

  const scoresObj = rawScores as Record<string, unknown>;
  const scores = {} as ReviewScores;
  let anyValid = false;
  for (const dim of REVIEW_DIMENSIONS) {
    if (Number.isFinite(Number(scoresObj[dim.key]))) anyValid = true;
    scores[dim.key] = clampScore(scoresObj[dim.key]);
  }
  if (!anyValid) return null;

  return {
    scores,
    strengths: toText(raw.strengths),
    weaknesses: toText(raw.weaknesses),
    improvement: toText(raw.improvement),
  };
}

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// 模型可能把优势 / 建议返回成数组，统一拼成多行字符串。
function toText(v: unknown): string {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : String(x)))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof v === "string") return v.trim();
  if (v == null) return "";
  return String(v);
}
