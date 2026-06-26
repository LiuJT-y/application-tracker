"use client";

import { useState } from "react";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import ResumeProfileCard from "@/components/ResumeProfileCard";
import ResumeItemsPanel from "@/components/ResumeItemsPanel";
import ResumeVersionsPanel from "@/components/ResumeVersionsPanel";
import ResumeGalleryPanel from "@/components/ResumeGalleryPanel";

const secondaryBtn = "rounded-lg border px-3 py-1.5 text-sm transition-colors";
const secondaryStyle = {
  borderColor: "var(--color-line)",
  color: "var(--color-txt-dim)",
} as const;

type Tab = "items" | "versions" | "gallery";

const TABS: { key: Tab; label: string }[] = [
  { key: "items", label: "总表" },
  { key: "versions", label: "简历版本" },
  { key: "gallery", label: "PDF 画廊" },
];

export default function ResumesPage() {
  const [tab, setTab] = useState<Tab>("items");

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      {/* 页头：标题 + 回看板 + UserMenu，跟 settings 页一致 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="font-display text-xl font-bold uppercase tracking-[0.18em] text-glow"
            style={{ color: "var(--color-neon-cyan)" }}
          >
            简历管理
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-txt-dim)" }}>
            // 素材库总表 + 简历版本组合
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/board" className={secondaryBtn} style={secondaryStyle}>
            ← 回看板
          </Link>
          <UserMenu />
        </div>
      </div>

      {/* 个人信息：全局唯一一份，独立于总表条目 */}
      <ResumeProfileCard />

      {/* 子导航 tab */}
      <div
        className="mb-5 flex items-center gap-1 border-b"
        style={{ borderColor: "var(--color-line)" }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="-mb-px border-b-2 px-4 py-2 text-sm transition-colors"
              style={{
                borderColor: active ? "var(--color-neon-cyan)" : "transparent",
                color: active ? "var(--color-neon-cyan)" : "var(--color-txt-dim)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "items" && <ResumeItemsPanel />}
      {tab === "versions" && <ResumeVersionsPanel />}
      {tab === "gallery" && <ResumeGalleryPanel />}
    </main>
  );
}
