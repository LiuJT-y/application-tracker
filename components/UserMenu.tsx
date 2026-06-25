"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Me = { email: string; name: string | null };

// 顶栏右侧：当前用户 + 设置入口 + 退出。自洽拉 /api/auth/me。
export default function UserMenu() {
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

  if (!me) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden text-xs sm:inline"
        style={{ color: "var(--color-txt-dim)" }}
        title={me.email}
      >
        {me.name || me.email}
      </span>
      <Link
        href="/settings"
        className="rounded-lg border px-3 py-1.5 text-sm transition-colors"
        style={{ borderColor: "var(--color-line)", color: "var(--color-txt-dim)" }}
      >
        设置
      </Link>
      <button
        onClick={logout}
        className="rounded-lg border px-3 py-1.5 text-sm transition-colors"
        style={{ borderColor: "var(--color-line)", color: "var(--color-txt-dim)" }}
      >
        退出
      </button>
    </div>
  );
}
