"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// 登录 / 注册：OfferGate 风格分屏 —— 左浅色表单面板 + 右城市配图(/1.png)。
// 这是一块独立的「浅色」表面（区别于全站深色 HUD），故面板用浅色硬编码，
// 紫色强调统一取 --color-accent；逻辑沿用原 fetch /api/auth/{mode}。
// 右上「EN / 中文」下拉切换本页文案（仅前端展示，不落库）。
type Mode = "login" | "register";
type Lang = "en" | "zh";

// 浅色输入框：白底 + 深字 + 左图标内缩 + 紫色聚焦描边
const inputCls =
  "w-full rounded-xl border border-[#E2E5EC] bg-white py-3 pl-11 pr-11 text-sm text-[#1A1D29] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[var(--color-accent)]";

// 文案表：英文 / 中文。标题拆成 head + accent（accent 部分上紫）。
const T = {
  en: {
    tagline: "Your Journey, Our AI.",
    login: { head: "Welcome ", accent: "back!", sub: "Sign in to continue your journey" },
    register: { head: "Create ", accent: "account!", sub: "Create an account to start your journey" },
    google: "Continue with Google",
    or: "or",
    nameLabel: "Name (optional)",
    namePh: "How should we call you",
    emailLabel: "Email",
    emailPh: "Enter your email",
    pwLabel: "Password",
    pwPhLogin: "Enter your password",
    pwPhReg: "At least 6 characters",
    forgot: "Forgot password?",
    submitLogin: "Log In",
    submitReg: "Sign Up",
    busy: "Processing…",
    switchLogin: "Don't have an account? ",
    switchReg: "Already have an account? ",
    signup: "Sign up",
    login_: "Log in",
    features: [
      { title: "Track Smarter", desc: "Manage all applications in one place" },
      { title: "AI Match", desc: "Let AI find the best opportunities for you" },
      { title: "Stay Ahead", desc: "Get interview insights and tips" },
    ],
    quoteHead: ["Your future", "is unlimited."],
    quoteSub: "We're here to help you build it.",
  },
  zh: {
    tagline: "你的旅程，AI 同行。",
    login: { head: "欢迎", accent: "回来!", sub: "登录以继续你的求职旅程" },
    register: { head: "创建", accent: "账号!", sub: "注册一个账号，开启你的求职旅程" },
    google: "使用 Google 继续",
    or: "或",
    nameLabel: "昵称（可选）",
    namePh: "怎么称呼你",
    emailLabel: "邮箱",
    emailPh: "请输入邮箱",
    pwLabel: "密码",
    pwPhLogin: "请输入密码",
    pwPhReg: "至少 6 位",
    forgot: "忘记密码？",
    submitLogin: "登录",
    submitReg: "注册",
    busy: "处理中…",
    switchLogin: "还没有账号？",
    switchReg: "已有账号？",
    signup: "去注册",
    login_: "去登录",
    features: [
      { title: "智能追踪", desc: "一处管理所有投递进度" },
      { title: "AI 匹配", desc: "AI 帮你匹配最合适的机会" },
      { title: "保持领先", desc: "获取面试洞察与改进建议" },
    ],
    quoteHead: ["你的未来", "无可限量。"],
    quoteSub: "我们在这里，助你实现。",
  },
} satisfies Record<Lang, unknown>;

const FEATURE_ICONS = [
  <path key="a" d="M4 20V10M10 20V4M16 20v-7" />,
  <path key="b" d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />,
  <path key="c" d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />,
];

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const isLogin = mode === "login";

  const [lang, setLang] = useState<Lang>("en");
  const [langOpen, setLangOpen] = useState(false);
  const t = T[lang];
  const head = isLogin ? t.login : t.register;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
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
      setError(data.error ?? (lang === "zh" ? "操作失败，请重试" : "Something went wrong, try again"));
      setBusy(false);
      return;
    }
    // 成功 → 回到来源页或看板；refresh 让 layout/proxy 重新取登录态。
    const redirect = params.get("redirect") || "/board";
    router.replace(redirect);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#E9EBF1] p-0 lg:p-8">
      <div className="flex w-full max-w-[1380px] overflow-hidden bg-[#F7F8FA] shadow-[0_30px_80px_rgba(20,20,50,0.18)] lg:min-h-[760px] lg:rounded-[28px]">
        {/* ───────── 左：表单面板 ───────── */}
        <div className="flex w-full flex-col px-7 py-8 sm:px-12 lg:w-1/2 lg:px-14 lg:py-10">
          {/* 顶部：Logo + 语言切换 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded-lg text-base font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
                }}
              >
                ✕
              </span>
              <div className="leading-tight">
                <div className="text-lg font-bold text-[#1A1D29]">
                  Offer<span style={{ color: "var(--color-accent)" }}>Gate</span>
                </div>
                <div className="text-[11px] text-[#9CA3AF]">{t.tagline}</div>
              </div>
            </div>

            {/* 语言下拉：点击展开 EN / 中文 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-[#E2E5EC] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] transition-colors hover:border-[var(--color-accent)]"
              >
                🌐 {lang === "en" ? "EN" : "中文"}
                <span className="text-[#9CA3AF]">▾</span>
              </button>
              {langOpen && (
                <>
                  {/* 点外部关闭 */}
                  <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1.5 w-28 overflow-hidden rounded-xl border border-[#E2E5EC] bg-white py-1 shadow-lg">
                    {(["en", "zh"] as Lang[]).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setLang(l);
                          setLangOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-[#F3F0FF]"
                        style={
                          lang === l
                            ? { color: "var(--color-accent)", fontWeight: 600 }
                            : { color: "#374151" }
                        }
                      >
                        {l === "en" ? "English" : "中文"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 标题 */}
          <div className="mt-12">
            <h1 className="text-4xl font-bold tracking-tight text-[#1A1D29]">
              {head.head}
              <span style={{ color: "var(--color-accent)" }}>{head.accent}</span>
            </h1>
            <p className="mt-2 text-sm text-[#6B7280]">{head.sub}</p>
          </div>

          {/* Google（暂未接入，视觉占位 + 禁用） */}
          <button
            type="button"
            disabled
            title={lang === "zh" ? "Google 登录暂未接入" : "Google sign-in not available yet"}
            className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#E2E5EC] bg-white py-3 text-sm font-medium text-[#374151] transition-colors disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            {t.google}
          </button>

          {/* or 分隔 */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#E2E5EC]" />
            <span className="text-xs text-[#9CA3AF]">{t.or}</span>
            <span className="h-px flex-1 bg-[#E2E5EC]" />
          </div>

          {/* 表单 */}
          <form onSubmit={submit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#374151]">
                  {t.nameLabel}
                </label>
                <div className="relative">
                  <FieldIcon>
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="7" r="4" />
                  </FieldIcon>
                  <input
                    className={inputCls}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePh}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#374151]">
                {t.emailLabel}
              </label>
              <div className="relative">
                <FieldIcon>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </FieldIcon>
                <input
                  className={inputCls}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPh}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#374151]">
                {t.pwLabel}
              </label>
              <div className="relative">
                <FieldIcon>
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </FieldIcon>
                <input
                  className={inputCls}
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? t.pwPhLogin : t.pwPhReg}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "隐藏密码" : "显示密码"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                    {showPw ? (
                      <>
                        <path d="M2 2l20 20M6.7 6.7A10.5 10.5 0 0 0 1 12s4 7 11 7a10 10 0 0 0 5.3-1.5M9.9 4.2A10.8 10.8 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2" />
                        <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  title={lang === "zh" ? "暂未开放" : "Not available yet"}
                  className="text-sm font-medium"
                  style={{ color: "var(--color-accent)" }}
                >
                  {t.forgot}
                </button>
              </div>
            )}

            {error && (
              <p className="text-sm" style={{ color: "#E5484D" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-accent), #c151d6)",
                boxShadow: "0 12px 28px rgba(123,92,255,0.35)",
              }}
            >
              {busy ? t.busy : isLogin ? t.submitLogin : t.submitReg}
            </button>
          </form>

          {/* 切换登录/注册 */}
          <p className="mt-5 text-center text-sm text-[#6B7280]">
            {isLogin ? t.switchLogin : t.switchReg}
            <Link
              href={isLogin ? "/register" : "/login"}
              className="font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              {isLogin ? t.signup : t.login_}
            </Link>
          </p>

          {/* 底部三特性卡 */}
          <div className="mt-auto grid grid-cols-3 gap-3 pt-9">
            {t.features.map((f, i) => (
              <div key={f.title} className="text-center">
                <span
                  className="mx-auto grid h-11 w-11 place-items-center rounded-xl"
                  style={{ background: "#EFEAFE", color: "var(--color-accent)" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    {FEATURE_ICONS[i]}
                  </svg>
                </span>
                <div className="mt-2 text-[13px] font-semibold text-[#1A1D29]">
                  {f.title}
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-[#9CA3AF]">
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ───────── 右：城市配图 + 引言 ───────── */}
        <div className="relative hidden w-1/2 lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/1.png"
            alt={lang === "zh" ? "城市夜景" : "City skyline"}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,12,45,0.7)] via-transparent to-transparent" />
          {/* 引言文案 */}
          <div className="absolute inset-x-0 bottom-0 p-12 text-white">
            <div className="font-serif text-5xl leading-none opacity-80">&ldquo;</div>
            <h2 className="mt-1 text-3xl font-bold leading-tight">
              {t.quoteHead[0]}
              <br />
              {t.quoteHead[1]}
            </h2>
            <p className="mt-2 text-sm text-white/80">{t.quoteSub}</p>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-white/70">
                <span>01</span>
                <span className="h-px w-10 bg-white/50" />
                <span>03</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-white/40 text-white/80">
                  ←
                </span>
                <span
                  className="grid h-10 w-10 place-items-center rounded-full text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 表单左侧内嵌图标（绝对定位）
function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
        {children}
      </svg>
    </span>
  );
}

// Google 多色 G
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
