"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// 重置密码：从 query 读 token → 输新密码 + 确认 → 提交改密 → 引导回登录。
const inputCls =
  "w-full rounded-xl border border-[#E2E5EC] bg-white py-3 px-4 text-sm text-[#1A1D29] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[var(--color-accent)]";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "操作失败，请重试");
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#E9EBF1] p-4">
      <div className="w-full max-w-[440px] rounded-[24px] bg-[#F7F8FA] p-8 shadow-[0_30px_80px_rgba(20,20,50,0.18)] sm:p-10">
        <h1 className="text-2xl font-bold text-[#1A1D29]">
          设置<span style={{ color: "var(--color-accent)" }}>新密码</span>
        </h1>

        {!token ? (
          <div className="mt-7 space-y-5">
            <div className="rounded-xl border border-[#F3D0D0] bg-[#FCECEC] px-4 py-4 text-sm text-[#B4342E]">
              链接无效或缺少参数，请重新发起「忘记密码」。
            </div>
            <Link
              href="/forgot-password"
              className="block text-center text-sm font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              重新发起
            </Link>
          </div>
        ) : done ? (
          <div className="mt-7 space-y-5">
            <div className="rounded-xl border border-[#D7E9DC] bg-[#EAF7EE] px-4 py-4 text-sm text-[#2F7D46]">
              密码已重置，请用新密码登录。
            </div>
            <Link
              href="/login"
              className="block w-full rounded-xl py-3.5 text-center text-sm font-semibold text-white transition-all"
              style={{
                background: "linear-gradient(90deg, var(--color-accent), #c151d6)",
                boxShadow: "0 12px 28px rgba(123,92,255,0.35)",
              }}
            >
              去登录
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <input
              className={inputCls}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="新密码（至少 6 位）"
              autoComplete="new-password"
            />
            <input
              className={inputCls}
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="确认新密码"
              autoComplete="new-password"
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
              {busy ? "提交中…" : "重置密码"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
