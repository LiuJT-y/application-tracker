"use client";

import { useState } from "react";
import Link from "next/link";

// 忘记密码：输邮箱 → 提交后固定提示「如果该邮箱已注册，重置链接已发送」（防枚举）。
// 浅色卡片，与登录页同一套 accent。
const inputCls =
  "w-full rounded-xl border border-[#E2E5EC] bg-white py-3 px-4 text-sm text-[#1A1D29] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[var(--color-accent)]";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "操作失败，请重试");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#E9EBF1] p-4">
      <div className="w-full max-w-[440px] rounded-[24px] bg-[#F7F8FA] p-8 shadow-[0_30px_80px_rgba(20,20,50,0.18)] sm:p-10">
        <h1 className="text-2xl font-bold text-[#1A1D29]">
          忘记<span style={{ color: "var(--color-accent)" }}>密码?</span>
        </h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          输入注册邮箱，我们会给你发送重置链接。
        </p>

        {sent ? (
          <div className="mt-7 space-y-5">
            <div className="rounded-xl border border-[#D7E9DC] bg-[#EAF7EE] px-4 py-4 text-sm text-[#2F7D46]">
              如果该邮箱已注册，重置链接已发送。请检查收件箱（30 分钟内有效）。
            </div>
            <Link
              href="/login"
              className="block text-center text-sm font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              返回登录
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <input
              className={inputCls}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              autoComplete="email"
            />
            {error && <p className="text-sm text-[#E5484D]">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{
                background: "linear-gradient(90deg, var(--color-accent), #c151d6)",
                boxShadow: "0 12px 28px rgba(123,92,255,0.35)",
              }}
            >
              {busy ? "发送中…" : "发送重置链接"}
            </button>
            <Link
              href="/login"
              className="block text-center text-sm font-medium text-[#6B7280] transition-colors hover:text-[#374151]"
            >
              返回登录
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
