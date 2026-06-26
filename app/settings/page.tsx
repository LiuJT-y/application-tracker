"use client";

import { useEffect, useState } from "react";
import {
  loadLlmConfig,
  saveLlmConfig,
  clearLlmConfig,
  LLM_HEADERS,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
} from "@/lib/llmConfig";

const inputCls =
  "w-full rounded-lg border bg-[#0d1322] px-3 py-2.5 text-sm text-[#E6F1FF] outline-none transition-colors placeholder:text-[#8B9CB8] border-[rgba(139,156,184,0.2)] focus:border-[#00F0FF]";
const labelCls = "mb-1 block text-xs";
const dim = { color: "var(--color-txt-dim)" } as const;
const secondaryBtn =
  "rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50";
const secondaryStyle = {
  borderColor: "var(--color-line)",
  color: "var(--color-txt-dim)",
} as const;

// 三家 OpenAI 兼容接口的 Base URL / Model 预设（不含 key，key 永远由用户自填）。
const PROVIDER_PRESETS = [
  { label: "GPT", baseUrl: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
  {
    label: "Qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen-plus",
  },
  { label: "DeepSeek", baseUrl: "https://api.deepseek.com/chat/completions", model: "deepseek-chat" },
] as const;

type TestState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "ok"; provider: string }
  | { kind: "err"; msg: string };

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: "idle" });

  const [apiToken, setApiToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 载入本地已存配置 + 拉插件 token
  useEffect(() => {
    const c = loadLlmConfig();
    if (c) {
      setApiKey(c.apiKey);
      setBaseUrl(c.baseUrl);
      setModel(c.model);
    }
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setApiToken(u?.apiToken ?? null))
      .catch(() => {});
  }, []);

  function save() {
    saveLlmConfig({
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
      model: model.trim() || DEFAULT_MODEL,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function clear() {
    clearLlmConfig();
    setApiKey("");
    setBaseUrl("");
    setModel("");
    setTest({ kind: "idle" });
  }

  // 用当前表单值（未必已保存）发测试请求
  async function runTest() {
    setTest({ kind: "busy" });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey.trim()) {
      headers[LLM_HEADERS.key] = apiKey.trim();
      headers[LLM_HEADERS.baseUrl] = baseUrl.trim() || DEFAULT_BASE_URL;
      headers[LLM_HEADERS.model] = model.trim() || DEFAULT_MODEL;
    }
    try {
      const res = await fetch("/api/ai/test", { method: "POST", headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setTest({ kind: "ok", provider: data.provider });
      else setTest({ kind: "err", msg: data.error ?? "测试失败" });
    } catch (e) {
      setTest({ kind: "err", msg: e instanceof Error ? e.message : "网络错误" });
    }
  }

  async function copyToken() {
    if (!apiToken) return;
    await navigator.clipboard.writeText(apiToken).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1
          className="flex items-center gap-2 font-display text-2xl font-bold tracking-[0.12em] text-glow"
          style={{ color: "var(--color-txt)" }}
        >
          <span style={{ color: "var(--color-accent)" }}>✦</span>
          设置
        </h1>
        <p className="mt-1 text-sm" style={dim}>
          // LLM key 只存你浏览器本地，不上传、不入库
        </p>
      </div>

      {/* LLM 配置 */}
      <section
        className="space-y-3 rounded-xl border p-5"
        style={{ borderColor: "var(--color-line)", background: "var(--color-panel)" }}
      >
        <h2 className="text-sm font-medium" style={{ color: "var(--color-txt)" }}>
          AI 复盘模型（OpenAI 兼容接口）
        </h2>

        {/* 一键填 Base URL / Model；key 仍需自填。任选其一即可。 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs" style={dim}>
            快速选择：
          </span>
          {PROVIDER_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setBaseUrl(p.baseUrl);
                setModel(p.model);
                setTest({ kind: "idle" });
              }}
              className={secondaryBtn}
              style={secondaryStyle}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div>
          <label className={labelCls} style={dim}>
            API Key
          </label>
          <div className="flex gap-2">
            <input
              className={inputCls}
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className={secondaryBtn}
              style={secondaryStyle}
            >
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls} style={dim}>
            Base URL
          </label>
          <input
            className={inputCls}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={DEFAULT_BASE_URL}
          />
        </div>

        <div>
          <label className={labelCls} style={dim}>
            模型
          </label>
          <input
            className={inputCls}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULT_MODEL}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            className="rounded-lg px-3 py-2 text-sm font-medium transition-all"
            style={{
              color: "#04121a",
              background: "var(--color-neon-cyan)",
              boxShadow: "0 0 16px rgba(0,240,255,0.4)",
            }}
          >
            保存
          </button>
          <button
            type="button"
            onClick={runTest}
            disabled={test.kind === "busy"}
            className={secondaryBtn}
            style={secondaryStyle}
          >
            {test.kind === "busy" ? "测试中…" : "测试连接"}
          </button>
          <button type="button" onClick={clear} className={secondaryBtn} style={secondaryStyle}>
            清除
          </button>

          {saved && (
            <span className="text-sm" style={{ color: "var(--color-neon-green)" }}>
              已保存
            </span>
          )}
          {test.kind === "ok" && (
            <span className="text-sm" style={{ color: "var(--color-neon-green)" }}>
              连接正常（{test.provider}）
            </span>
          )}
          {test.kind === "err" && (
            <span className="text-sm" style={{ color: "#FF2E97" }}>
              {test.msg}
            </span>
          )}
        </div>
      </section>

      {/* 插件 token */}
      <section
        className="mt-5 space-y-3 rounded-xl border p-5"
        style={{ borderColor: "var(--color-line)", background: "var(--color-panel)" }}
      >
        <h2 className="text-sm font-medium" style={{ color: "var(--color-txt)" }}>
          Chrome 插件接入 Token
        </h2>
        <p className="text-xs" style={dim}>
          // 插件 POST /api/applications 时带上 <code>Authorization: Bearer &lt;token&gt;</code> 即可把岗位存到你的账号
        </p>
        <div className="flex gap-2">
          <input className={inputCls} readOnly value={apiToken ?? "加载中…"} />
          <button
            type="button"
            onClick={copyToken}
            disabled={!apiToken}
            className={secondaryBtn}
            style={secondaryStyle}
          >
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </section>
    </main>
  );
}
