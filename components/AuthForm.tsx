"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// HUD 风输入框（与 ReviewPanel 一致）：深底 + 浅字 + 霓虹聚焦描边
const inputCls =
  "w-full rounded-lg border bg-[#0d1322] px-3 py-2.5 text-sm text-[#E6F1FF] outline-none transition-colors placeholder:text-[#8B9CB8] border-[rgba(139,156,184,0.2)] focus:border-[#00F0FF]";

type Mode = "login" | "register";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const isLogin = mode === "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isLogin ? { email, password } : { email, password, name }
      ),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "操作失败，请重试");
      setBusy(false);
      return;
    }
    // 登录成功 → 回到来源页或看板；refresh 让 layout/middleware 重新取登录态。
    const redirect = params.get("redirect") || "/board";
    router.replace(redirect);
    router.refresh();
  }

  return (
    <div className="mx-auto mt-24 w-full max-w-sm px-6">
      <h1
        className="font-display text-2xl font-bold uppercase tracking-[0.18em] text-glow"
        style={{ color: "var(--color-neon-cyan)" }}
      >
        {isLogin ? "登录" : "注册"}
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--color-txt-dim)" }}>
        // 秋招投递记录工具
      </p>

      <form
        onSubmit={submit}
        className="mt-6 space-y-3 rounded-xl border p-5"
        style={{
          borderColor: "var(--color-line)",
          background: "var(--color-panel)",
        }}
      >
        {!isLogin && (
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--color-txt-dim)" }}>
              昵称（可选）
            </label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="怎么称呼你"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs" style={{ color: "var(--color-txt-dim)" }}>
            邮箱
          </label>
          <input
            className={inputCls}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: "var(--color-txt-dim)" }}>
            密码
          </label>
          <input
            className={inputCls}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isLogin ? "••••••••" : "至少 6 位"}
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: "#FF2E97" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all disabled:opacity-60"
          style={{
            color: "#04121a",
            background: "var(--color-neon-cyan)",
            boxShadow: "0 0 16px rgba(0,240,255,0.4)",
          }}
        >
          {busy ? "处理中…" : isLogin ? "登录" : "注册并进入"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm" style={{ color: "var(--color-txt-dim)" }}>
        {isLogin ? "还没有账号？" : "已有账号？"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="transition-colors"
          style={{ color: "var(--color-neon-cyan)" }}
        >
          {isLogin ? "去注册" : "去登录"}
        </Link>
      </p>
    </div>
  );
}
