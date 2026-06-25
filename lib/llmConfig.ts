// 用户自带 LLM 配置：只存浏览器 localStorage，绝不入库。
// 复盘提交时转成请求头随请求发到服务端，服务端用完即弃（Option A）。
// 这里只放纯数据/常量 + 受 window 保护的读写函数，server 端只 import 头名常量。

export type LlmConfig = { apiKey: string; baseUrl: string; model: string };

// 请求头名（前端写入、服务端读取的唯一约定）
export const LLM_HEADERS = {
  key: "x-llm-key",
  baseUrl: "x-llm-base-url",
  model: "x-llm-model",
} as const;

export const DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_MODEL = "gpt-4o-mini";

const STORAGE_KEY = "job-tracker.llm-config";

export function loadLlmConfig(): LlmConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o?.apiKey) return null;
    return {
      apiKey: String(o.apiKey),
      baseUrl: String(o.baseUrl || DEFAULT_BASE_URL),
      model: String(o.model || DEFAULT_MODEL),
    };
  } catch {
    return null;
  }
}

export function saveLlmConfig(c: LlmConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

export function clearLlmConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// 把本地配置转成请求头；没配置就返回空对象（服务端会落到 env 兜底）。
export function llmHeaders(): Record<string, string> {
  const c = loadLlmConfig();
  if (!c) return {};
  return {
    [LLM_HEADERS.key]: c.apiKey,
    [LLM_HEADERS.baseUrl]: c.baseUrl,
    [LLM_HEADERS.model]: c.model,
  };
}
