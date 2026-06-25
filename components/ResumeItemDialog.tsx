"use client";

import { useState } from "react";
import { RESUME_ITEM_ORDER, RESUME_ITEM_META, type ResumeItem } from "@/lib/types";

// 赛博 HUD 风格输入框（沿用 settings 页那套深底类名）。
const inputCls =
  "w-full rounded-lg border bg-[#0d1322] px-3 py-2 text-sm text-[#E6F1FF] outline-none transition-colors placeholder:text-[#8B9CB8] border-[rgba(139,156,184,0.2)] focus:border-[#00F0FF]";
const labelCls = "mb-1 block text-xs";
const dim = { color: "var(--color-txt-dim)" } as const;
const secondaryBtn = "rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50";
const secondaryStyle = {
  borderColor: "var(--color-line)",
  color: "var(--color-txt-dim)",
} as const;

// 新建 = 不传 item；编辑 = 传 item。提交成功后回调 onSaved。
export default function ResumeItemDialog({
  item,
  onClose,
  onSaved,
}: {
  item?: ResumeItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    type: item?.type ?? "EXPERIENCE",
    title: item?.title ?? "",
    org: item?.org ?? "",
    location: item?.location ?? "",
    startDate: item?.startDate ?? "",
    endDate: item?.endDate ?? "",
    description: item?.description ?? "",
    tags: (item?.tags ?? []).join(", "),
    link: item?.link ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit() {
    if (!form.title.trim()) {
      setErr("标题为必填");
      return;
    }
    setSaving(true);
    setErr(null);
    // 逗号（中英文）分隔的标签 → 数组
    const tags = form.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = { ...form, tags };

    const url = isEdit ? `/api/resume-items/${item!.id}` : "/api/resume-items";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "保存失败");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border p-5"
        style={{ borderColor: "var(--color-line)", background: "var(--color-space)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="mb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-glow"
          style={{ color: "var(--color-neon-cyan)" }}
        >
          {isEdit ? "编辑条目" : "新增条目"}
        </h2>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={dim}>
                类型
              </label>
              <select
                className={inputCls}
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              >
                {RESUME_ITEM_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {RESUME_ITEM_META[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} style={dim}>
                标题 *
              </label>
              <input
                className={inputCls}
                placeholder="项目名 / 公司名"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={dim}>
                机构 / 公司 / 学校
              </label>
              <input
                className={inputCls}
                placeholder="如：字节跳动"
                value={form.org}
                onChange={(e) => set("org", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} style={dim}>
                地点
              </label>
              <input
                className={inputCls}
                placeholder="如：深圳"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={dim}>
                开始时间
              </label>
              <input
                className={inputCls}
                placeholder="2024.09"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} style={dim}>
                结束时间
              </label>
              <input
                className={inputCls}
                placeholder="2025.06 / 至今"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls} style={dim}>
              正文 / 要点
            </label>
            <textarea
              className={`${inputCls} min-h-[96px] resize-y`}
              placeholder="一行一条要点，量化成果更佳"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls} style={dim}>
              标签（逗号分隔）
            </label>
            <input
              className={inputCls}
              placeholder="React, TypeScript, 团队协作"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls} style={dim}>
              链接
            </label>
            <input
              className={inputCls}
              placeholder="https://..."
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {err && (
            <span className="mr-auto text-sm" style={{ color: "#FF2E97" }}>
              {err}
            </span>
          )}
          <button onClick={onClose} className={secondaryBtn} style={secondaryStyle}>
            取消
          </button>
          <button
            onClick={submit}
            disabled={saving || !form.title.trim()}
            className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all disabled:opacity-40"
            style={{
              color: "#04121a",
              background: "var(--color-neon-cyan)",
              boxShadow: "0 0 16px rgba(0,240,255,0.4)",
            }}
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
