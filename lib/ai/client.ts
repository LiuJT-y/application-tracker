// 模型链：按 AI_PROVIDER_ORDER 顺序取第一个配了 key 的 provider 调用，
// 超时 / 报错 / 返回非法时自动落到下一家，全挂则抛错。
// 三家都是 OpenAI 兼容的 chat/completions 接口，配置见 .env.example。

import { LLM_HEADERS } from "@/lib/llmConfig";

type ProviderId = "gpt" | "qwen" | "deepseek";

type ProviderConfig = {
  id: ProviderId;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

// 从环境变量读各 provider 的配置（key 为空的会在调用时跳过）。
function readProviders(): Record<ProviderId, ProviderConfig> {
  return {
    gpt: {
      id: "gpt",
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL,
    },
    qwen: {
      id: "qwen",
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseUrl: process.env.QWEN_BASE_URL,
      model: process.env.QWEN_MODEL,
    },
    deepseek: {
      id: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL,
      model: process.env.DEEPSEEK_MODEL,
    },
  };
}

function providerOrder(): ProviderId[] {
  const raw = process.env.AI_PROVIDER_ORDER ?? "gpt,qwen,deepseek";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderId => s === "gpt" || s === "qwen" || s === "deepseek");
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// 用户在设置页自填、随请求头带来的 LLM 配置（覆盖 env 链）。
export type LlmOverride = { apiKey: string; baseUrl: string; model: string };

// 从请求头解析用户 LLM 配置；三者齐全才生效，否则 undefined（落 env 兜底）。
export function overrideFromHeaders(req: Request): LlmOverride | undefined {
  const apiKey = req.headers.get(LLM_HEADERS.key)?.trim();
  const baseUrl = req.headers.get(LLM_HEADERS.baseUrl)?.trim();
  const model = req.headers.get(LLM_HEADERS.model)?.trim();
  if (apiKey && baseUrl && model) return { apiKey, baseUrl, model };
  return undefined;
}

const TIMEOUT_MS = 60_000;

// base_url 既支持全路径（…/chat/completions），也支持只到 /v1 根；
// 后者自动补上 /chat/completions。
function endpoint(baseUrl: string): string {
  const u = baseUrl.replace(/\/+$/, "");
  return u.endsWith("/chat/completions") ? u : `${u}/chat/completions`;
}

async function callOne(cfg: ProviderConfig, messages: ChatMessage[]): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint(cfg.baseUrl!), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${detail.slice(0, 200)}`);
    }
    const data = await res.json();
    const content: unknown = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("返回内容为空");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

// 按链路依次尝试，返回 { content, provider }。全部失败抛错（含每家的失败原因）。
// override 存在（用户在设置页填了 key）→ 只用它，不走 env 链、失败直接抛错。
export async function chatJSON(
  messages: ChatMessage[],
  override?: LlmOverride
): Promise<{ content: string; provider: string }> {
  if (override?.apiKey && override.baseUrl && override.model) {
    const content = await callOne(
      { id: "gpt", apiKey: override.apiKey, baseUrl: override.baseUrl, model: override.model },
      messages
    );
    return { content, provider: "user" };
  }

  const providers = readProviders();
  const order = providerOrder();
  const errors: string[] = [];

  for (const id of order) {
    const cfg = providers[id];
    if (!cfg.apiKey || !cfg.baseUrl || !cfg.model) {
      errors.push(`${id}: 未配置`);
      continue;
    }
    try {
      const content = await callOne(cfg, messages);
      return { content, provider: id };
    } catch (e) {
      errors.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(`所有模型 provider 均失败 —— ${errors.join(" | ")}`);
}
