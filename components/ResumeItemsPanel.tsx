"use client";

import { useEffect, useMemo, useState } from "react";
import ResumeItemDialog from "@/components/ResumeItemDialog";
import { RESUME_ITEM_ORDER, RESUME_ITEM_META, type ResumeItem } from "@/lib/types";

const dim = { color: "var(--color-txt-dim)" } as const;

// 把起止时间拼成 "2024.09 – 至今"；都没填返回空。
function fmtRange(it: ResumeItem) {
  if (it.startDate && it.endDate) return `${it.startDate} – ${it.endDate}`;
  return it.startDate || it.endDate || "";
}

// 简历总表（素材库）面板：表格 + 类型筛选 + 增删改。
export default function ResumeItemsPanel() {
  const [items, setItems] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | (typeof RESUME_ITEM_ORDER)[number]>("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<ResumeItem | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/resume-items");
    const data = res.ok ? await res.json() : [];
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(
    () => (filter === "ALL" ? items : items.filter((it) => it.type === filter)),
    [items, filter]
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[it.type] = (m[it.type] ?? 0) + 1;
    return m;
  }, [items]);

  function openCreate() {
    setEditing(null);
    setShowDialog(true);
  }
  function openEdit(it: ResumeItem) {
    setEditing(it);
    setShowDialog(true);
  }

  async function remove(it: ResumeItem) {
    if (!window.confirm(`确定删除「${it.title}」？此操作不可恢复。`)) return;
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    await fetch(`/api/resume-items/${it.id}`, { method: "DELETE" }).catch(() => load());
  }

  return (
    <>
      {/* 类型筛选 pill + 新增按钮 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPill
          active={filter === "ALL"}
          label="全部"
          count={items.length}
          color="#00F0FF"
          onClick={() => setFilter("ALL")}
        />
        {RESUME_ITEM_ORDER.map((t) => (
          <FilterPill
            key={t}
            active={filter === t}
            label={RESUME_ITEM_META[t].label}
            count={counts[t] ?? 0}
            color={RESUME_ITEM_META[t].dot}
            onClick={() => setFilter(t)}
          />
        ))}
        <button
          onClick={openCreate}
          className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
          style={{
            color: "#04121a",
            background: "var(--color-neon-cyan)",
            boxShadow: "0 0 16px rgba(0,240,255,0.4)",
          }}
        >
          + 新增条目
        </button>
      </div>

      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "var(--color-line)", background: "var(--color-panel)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left text-xs uppercase tracking-wider"
              style={{ color: "var(--color-txt-dim)", borderBottom: "1px solid var(--color-line)" }}
            >
              <th className="px-4 py-3 font-medium">类型</th>
              <th className="px-4 py-3 font-medium">标题</th>
              <th className="px-4 py-3 font-medium">机构</th>
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">标签</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center" style={dim}>
                  加载中…
                </td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center" style={dim}>
                  {items.length === 0
                    ? "// 还没有任何条目，点右上「+ 新增条目」开始搭建你的简历素材库"
                    : "// 该类型下暂无条目"}
                </td>
              </tr>
            ) : (
              shown.map((it) => {
                const meta = RESUME_ITEM_META[it.type];
                return (
                  <tr
                    key={it.id}
                    className="transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                    style={{ borderBottom: "1px solid var(--color-line)" }}
                  >
                    <td className="px-4 py-3 align-top">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs"
                        style={{
                          color: meta.dot,
                          background: `${meta.dot}1f`,
                          border: `1px solid ${meta.dot}3a`,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: meta.dot }}
                        />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div style={{ color: "var(--color-txt)" }}>
                        {it.link ? (
                          <a
                            href={it.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-colors hover:underline"
                            style={{ color: "var(--color-neon-cyan)" }}
                          >
                            {it.title}
                          </a>
                        ) : (
                          it.title
                        )}
                      </div>
                      {it.description && (
                        <div
                          className="mt-1 line-clamp-2 max-w-md text-xs"
                          style={dim}
                          title={it.description}
                        >
                          {it.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top" style={{ color: "var(--color-txt)" }}>
                      {it.org || <span style={dim}>—</span>}
                      {it.location && (
                        <span className="ml-1 text-xs" style={dim}>
                          · {it.location}
                        </span>
                      )}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 align-top font-mono text-xs"
                      style={dim}
                    >
                      {fmtRange(it) || "—"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {it.tags.length === 0 ? (
                          <span style={dim}>—</span>
                        ) : (
                          it.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded px-1.5 py-0.5 text-xs"
                              style={{
                                color: "var(--color-txt-dim)",
                                border: "1px solid var(--color-line)",
                              }}
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                      <button
                        onClick={() => openEdit(it)}
                        className="rounded-md px-2 py-1 text-xs transition-colors hover:text-[var(--color-neon-cyan)]"
                        style={dim}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => remove(it)}
                        className="ml-1 rounded-md px-2 py-1 text-xs transition-colors hover:text-[#FF2E97]"
                        style={dim}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showDialog && (
        <ResumeItemDialog
          item={editing}
          onClose={() => setShowDialog(false)}
          onSaved={load}
        />
      )}
    </>
  );
}

// 类型筛选 pill：选中时上霓虹色描边 + 淡背景。
function FilterPill({
  active,
  label,
  count,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1 text-xs transition-colors"
      style={
        active
          ? { borderColor: color, color, background: `${color}1f` }
          : { borderColor: "var(--color-line)", color: "var(--color-txt-dim)" }
      }
    >
      {label}
      <span className="ml-1.5 font-mono opacity-70">{count}</span>
    </button>
  );
}
