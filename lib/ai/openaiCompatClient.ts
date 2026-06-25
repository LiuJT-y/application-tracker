// OpenAI 兼容的通用 client：GPT / Qwen / DeepSeek 三家共用一套。
// 端口自 K12 项目 AIService 的写法（各 provider 走 /chat/completions + response_format json_object）。

export type ProviderConfig = {
  label: string;
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
};

const TIMEOUT_MS = 30000;

export class OpenAICompatClient {
  constructor(private readonly config: ProviderConfig) {}

  get label() {
    return this.config.label;
  }

  get isConfigured() {
    return Boolean(this.config.apiKey);
  }

  // 调用模型并解析为 JSON 对象；任何失败（网络 / 超时 / 非 JSON）都返回 null，交由上层走兜底链。
  async chatJson(
    systemPrompt: string,
    userMessage: string
  ): Promise<Record<string, unknown> | null> {
    if (!this.config.apiKey) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(this.config.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch {
      return null; // 网络错误或超时（AbortError）
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) return null;

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return null;
    }

    const content = (data as { choices?: { message?: { content?: unknown } }[] })
      ?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;

    try {
      const parsed = JSON.parse(content);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
}
