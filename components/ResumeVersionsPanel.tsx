"use client";

import { useEffect, useState } from "react";
import ResumeVersionDialog from "@/components/ResumeVersionDialog";
import ResumePdfControl from "@/components/ResumePdfControl";
import { type ResumeVersionSummary } from "@/lib/types";

const dim = { color: "var(--color-txt-dim)" } as const;
const secondaryBtn = "rounded-md px-2 py-1 text-xs transition-colors";

// 简历版本面板：版本卡片（名称 / 条目数 / 关联投递数 / 面试率 / 默认徽章）+ 增删改 + 设默认。
export default function ResumeVersionsPanel() {
  const [versions, setVersions] = useState<ResumeVersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<ResumeVersionSummary | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/resume-versions");
    setVersions(res.ok ? await res.json() : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setShowDialog(true);
  }
  function openEdit(v: ResumeVersionSummary) {
    setEditing(v);
    setShowDialog(true);
  }

  async function remove(v: ResumeVersionSummary) {
    if (
      !window.confirm(
        `确定删除版本「${v.name}」？关联的 ${v.applicationCount} 条投递会解除该版本绑定（投递本身保留）。此操作不可恢复。`
      )
    )
      return;
    setVersions((prev) => prev.filter((x) => x.id !== v.id));
    await fetch(`/api/resume-versions/${v.id}`, { method: "DELETE" }).catch(() => load());
  }

  async function setDefault(v: ResumeVersionSummary) {
    // 乐观更新：本地把默认切到这一版。
    setVersions((prev) => prev.map((x) => ({ ...x, isDefault: x.id === v.id })));
    await fetch(`/api/resume-versions/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    }).catch(() => load());
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm" style={dim}>
          // 从素材库条目组合不同版本，设默认 → 看板新建投递自动用它，AI 复盘也按它分析
        </p>
        <button
          onClick={openCreate}
          className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
          style={{
            color: "#04121a",
            background: "var(--color-neon-cyan)",
            boxShadow: "0 0 16px rgba(0,240,255,0.4)",
          }}
        >
          + 新建版本
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={dim}>
          加载中…
        </p>
      ) : versions.length === 0 ? (
        <div
          className="rounded-xl border border-dashed py-16 text-center text-sm"
          style={{ borderColor: "var(--color-line)", color: "var(--color-txt-dim)" }}
        >
          // 还没有简历版本，点右上「+ 新建版本」从素材库条目组合一版
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex flex-col rounded-xl border p-4"
              style={{
                borderColor: v.isDefault ? "rgba(0,240,255,0.4)" : "var(--color-line)",
                background: "var(--color-panel)",
                boxShadow: v.isDefault ? "0 0 16px rgba(0,240,255,0.12)" : undefined,
              }}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3
                  className="min-w-0 truncate font-display text-sm font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-txt)" }}
                  title={v.name}
                >
                  {v.name}
                </h3>
                {v.isDefault && (
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase"
                    style={{
                      color: "var(--color-neon-cyan)",
                      background: "rgba(0,240,255,0.12)",
                      boxShadow: "0 0 8px rgba(0,240,255,0.25)",
                    }}
                  >
                    默认
                  </span>
                )}
              </div>

              {v.note ? (
                <p className="mb-3 line-clamp-2 text-xs" style={dim} title={v.note}>
                  {v.note}
                </p>
              ) : (
                <p className="mb-3 text-xs" style={{ ...dim, opacity: 0.5 }}>
                  // 无备注
                </p>
              )}

              {/* 统计 */}
              <div className="mt-auto grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
                <Stat label="条目" value={String(v.itemCount)} />
                <Stat label="关联投递" value={String(v.applicationCount)} />
                <Stat
                  label="面试率"
                  value={v.rate == null ? "—" : `${v.rate}%`}
                  hint={v.total > 0 ? `${v.interviewed}/${v.total}` : undefined}
                />
              </div>

              {/* PDF 上传 / 预览（Part 3a） */}
              <ResumePdfControl version={v} onChanged={load} />

              {/* 操作 */}
              <div className="mt-3 flex items-center gap-1">
                {!v.isDefault && (
                  <button
                    onClick={() => setDefault(v)}
                    className={secondaryBtn}
                    style={dim}
                  >
                    设为默认
                  </button>
                )}
                <button
                  onClick={() => openEdit(v)}
                  className={`${secondaryBtn} hover:text-[var(--color-neon-cyan)]`}
                  style={dim}
                >
                  编辑
                </button>
                <button
                  onClick={() => remove(v)}
                  className={`${secondaryBtn} ml-auto hover:text-[#FF2E97]`}
                  style={dim}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDialog && (
        <ResumeVersionDialog
          version={editing}
          onClose={() => setShowDialog(false)}
          onSaved={load}
        />
      )}
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-base font-semibold" style={{ color: "var(--color-txt)" }}>
        {value}
      </div>
      <div className="text-[10px]" style={dim}>
        {label}
        {hint ? ` ${hint}` : ""}
      </div>
    </div>
  );
}
