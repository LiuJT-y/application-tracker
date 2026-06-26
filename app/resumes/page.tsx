"use client";

import { useState } from "react";
import ResumeProfileCard from "@/components/ResumeProfileCard";
import ResumeItemsPanel from "@/components/ResumeItemsPanel";
import ResumeVersionsPanel from "@/components/ResumeVersionsPanel";
import ResumeGalleryPanel from "@/components/ResumeGalleryPanel";

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
      {/* 页头：标题（导航 / 用户菜单已移到全站侧边栏） */}
      <div className="mb-6">
        <h1
          className="flex items-center gap-2 font-display text-2xl font-bold tracking-[0.12em] text-glow"
          style={{ color: "var(--color-txt)" }}
        >
          <span style={{ color: "var(--color-accent)" }}>✦</span>
          简历管理
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-txt-dim)" }}>
          // 素材库总表 + 简历版本组合
        </p>
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
