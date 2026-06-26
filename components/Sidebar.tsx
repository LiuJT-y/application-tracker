"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// 全站左侧固定竖向侧边栏（HUD 风 + 紫色高亮）。
// Logo → 带图标导航（usePathname 高亮，紫胶囊 + 左光条）→ 底部用户卡 + 图标行。
// 用户信息 / 退出逻辑由原 UserMenu 并入这里，单一来源。

type Me = { email: string; name: string | null };

// 轻量内联图标（不引图标库），统一 currentColor + 1.6 描边。
const ICON = {
  resumes: (
    <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6" />
  ),
  insights: (
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  ),
  review: (
    <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2zM8 9h8M8 13h5" />
  ),
  board: (
    <path d="M3 3h7v18H3zM14 3h7v11h-7z" />
  ),
} as const;

const NAV: { href: string; label: string; icon: keyof typeof ICON }[] = [
  { href: "/resumes", label: "简历管理", icon: "resumes" },
  { href: "/insights", label: "数据洞察", icon: "insights" },
  { href: "/review", label: "AI 复盘", icon: "review" },
  { href: "/board", label: "投递看板", icon: "board" },
];

function NavIcon({ name }: { name: keyof typeof ICON }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
    >
      {ICON[name]}
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const displayName = me?.name || me?.email?.split("@")[0] || "未登录";

  return (
    <aside
      className="fixed left-0 top-0 z-30 flex h-screen w-[220px] flex-col border-r px-4 py-5 backdrop-blur-md"
      style={{
        borderColor: "var(--color-line)",
        background: "rgba(10,14,26,0.72)",
      }}
    >
      {/* Logo */}
      <Link href="/board" className="mb-8 flex items-center gap-2 px-2">
        <span
          className="grid h-8 w-8 place-items-center rounded-lg text-lg font-bold"
          style={{
            color: "#fff",
            background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
            boxShadow: "0 0 14px rgba(123,92,255,0.5)",
          }}
        >
          ✕
        </span>
        <span
          className="font-display text-base font-bold tracking-[0.08em] text-glow"
          style={{ color: "var(--color-txt)" }}
        >
          Offer<span style={{ color: "var(--color-accent)" }}>Gate</span>
        </span>
      </Link>

      {/* 导航 */}
      <nav className="flex flex-col gap-1.5">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
              style={
                active
                  ? {
                      color: "#fff",
                      background:
                        "linear-gradient(100deg, rgba(123,92,255,0.32), rgba(168,85,247,0.18))",
                      boxShadow: "0 0 16px rgba(123,92,255,0.25)",
                    }
                  : { color: "var(--color-txt-dim)" }
              }
            >
              {/* 左侧光条（仅高亮项） */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r"
                  style={{
                    background: "var(--color-accent)",
                    boxShadow: "0 0 8px var(--color-accent)",
                  }}
                />
              )}
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 底部：用户卡 + 图标行 */}
      <div className="mt-auto">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors"
          style={{ borderColor: "var(--color-line)" }}
          title={me?.email ?? ""}
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold"
            style={{
              color: "#fff",
              background:
                "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block truncate text-sm font-medium"
              style={{ color: "var(--color-txt)" }}
            >
              {displayName}
            </span>
            <span className="block text-[11px]" style={{ color: "var(--color-txt-dim)" }}>
              Administrator
            </span>
          </span>
          <span style={{ color: "var(--color-txt-dim)" }}>›</span>
        </Link>

        <div
          className="mt-3 flex items-center gap-1 border-t pt-3"
          style={{ borderColor: "var(--color-line)" }}
        >
          {/* 通知（占位） */}
          <button
            type="button"
            title="通知"
            aria-label="通知"
            className="grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-[rgba(139,156,184,0.1)]"
            style={{ color: "var(--color-txt-dim)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </button>
          {/* 设置 */}
          <Link
            href="/settings"
            title="设置"
            aria-label="设置"
            className="grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-[rgba(139,156,184,0.1)]"
            style={{ color: "var(--color-txt-dim)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          {/* 退出 */}
          <button
            type="button"
            onClick={logout}
            title="退出登录"
            aria-label="退出登录"
            className="grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-[rgba(255,46,151,0.12)] hover:text-[var(--color-neon-magenta)]"
            style={{ color: "var(--color-txt-dim)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
