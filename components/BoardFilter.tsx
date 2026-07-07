"use client";

import { useState } from "react";
import {
  CHANNEL_META,
  PRIORITY_META,
  type Application,
} from "@/lib/types";

// 看板筛选 + 排序状态（纯前端，与搜索叠加 AND）。
export type BoardFilters = {
  channels: string[];
  priorities: string[];
  cities: string[];
  versions: string[]; // resumeVersionName；null 版本用 NONE_VERSION 代表
};
export type BoardSort = "default" | "priority-desc" | "priority-asc";

export const NONE_VERSION = "__none__";
export const EMPTY_FILTERS: BoardFilters = {
  channels: [],
  priorities: [],
  cities: [],
  versions: [],
};

// 已激活的条件数（筛选各维度已选值之和 + 排序非默认算 1），给按钮徽章用。
export function activeCount(filters: BoardFilters, sort: BoardSort): number {
  const f =
    filters.channels.length +
    filters.priorities.length +
    filters.cities.length +
    filters.versions.length;
  return f + (sort !== "default" ? 1 : 0);
}

const CHANNEL_ORDER = ["REFERRAL", "OFFICIAL", "HEADHUNTER", "SOCIAL", "OTHER"];
const PRIORITY_ORDER = ["HIGH", "MEDIUM", "LOW"];

// 去重 + 排序取动态选项
function uniqSorted(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) =>
    a.localeCompare(b, "zh")
  );
}

export default function BoardFilter({
  apps,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
}: {
  apps: Application[];
  filters: BoardFilters;
  onFiltersChange: (f: BoardFilters) => void;
  sort: BoardSort;
  onSortChange: (s: BoardSort) => void;
}) {
  const [open, setOpen] = useState(false);

  const cities = uniqSorted(apps.map((a) => a.city));
  const versions = uniqSorted(apps.map((a) => a.resumeVersionName));
  const hasNoneVersion = apps.some((a) => !a.resumeVersionName);

  const count = activeCount(filters, sort);

  // 在某个维度里切换一个值
  function toggle(key: keyof BoardFilters, value: string) {
    const cur = filters[key];
    const next = cur.includes(value)
      ? cur.filter((v) => v !== value)
      : [...cur, value];
    onFiltersChange({ ...filters, [key]: next });
  }

  function clearAll() {
    onFiltersChange(EMPTY_FILTERS);
    onSortChange("default");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="筛选 / 排序"
        aria-label="筛选 / 排序"
        className="relative grid h-9 w-9 place-items-center rounded-lg border transition-colors"
        style={{
          borderColor: count > 0 ? "var(--color-accent)" : "var(--color-line)",
          color: count > 0 ? "var(--color-accent)" : "var(--color-txt-dim)",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
        {count > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* 点面板外关闭 */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 z-20 mt-2 w-64 rounded-xl border p-3 shadow-xl"
            style={{ background: "#0d1322", borderColor: "var(--color-line)" }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span
                className="font-display text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-txt)" }}
              >
                筛选 / 排序
              </span>
              {count > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] transition-colors hover:text-[var(--color-accent)]"
                  style={{ color: "var(--color-txt-dim)" }}
                >
                  清除全部
                </button>
              )}
            </div>

            <Section title="渠道">
              {CHANNEL_ORDER.map((c) => (
                <Pill
                  key={c}
                  active={filters.channels.includes(c)}
                  onClick={() => toggle("channels", c)}
                >
                  {CHANNEL_META[c] ?? c}
                </Pill>
              ))}
            </Section>

            <Section title="优先级">
              {PRIORITY_ORDER.map((p) => (
                <Pill
                  key={p}
                  active={filters.priorities.includes(p)}
                  onClick={() => toggle("priorities", p)}
                  dot={PRIORITY_META[p]?.color}
                >
                  {PRIORITY_META[p]?.label ?? p}
                </Pill>
              ))}
            </Section>

            {cities.length > 0 && (
              <Section title="城市">
                {cities.map((c) => (
                  <Pill
                    key={c}
                    active={filters.cities.includes(c)}
                    onClick={() => toggle("cities", c)}
                  >
                    {c}
                  </Pill>
                ))}
              </Section>
            )}

            {(versions.length > 0 || hasNoneVersion) && (
              <Section title="简历版本">
                {versions.map((v) => (
                  <Pill
                    key={v}
                    active={filters.versions.includes(v)}
                    onClick={() => toggle("versions", v)}
                  >
                    {v}
                  </Pill>
                ))}
                {hasNoneVersion && (
                  <Pill
                    active={filters.versions.includes(NONE_VERSION)}
                    onClick={() => toggle("versions", NONE_VERSION)}
                  >
                    未指定
                  </Pill>
                )}
              </Section>
            )}

            {/* 排序：单选 */}
            <div
              className="mt-3 border-t pt-3"
              style={{ borderColor: "var(--color-line)" }}
            >
              <div
                className="mb-1.5 text-[10px] uppercase tracking-wide"
                style={{ color: "var(--color-txt-dim)" }}
              >
                排序
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["default", "默认"],
                    ["priority-desc", "优先级 ↓"],
                    ["priority-asc", "优先级 ↑"],
                  ] as [BoardSort, string][]
                ).map(([value, label]) => (
                  <Pill
                    key={value}
                    active={sort === value}
                    onClick={() => onSortChange(value)}
                  >
                    {label}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <div
        className="mb-1.5 text-[10px] uppercase tracking-wide"
        style={{ color: "var(--color-txt-dim)" }}
      >
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-[var(--color-accent)] bg-[rgba(123,92,255,0.15)] text-[var(--color-accent)]"
          : "border-[var(--color-line)] text-[var(--color-txt-dim)] hover:border-[var(--color-accent)]"
      }`}
    >
      {dot && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: dot }}
        />
      )}
      {children}
    </button>
  );
}
