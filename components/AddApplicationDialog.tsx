"use client";

import { useEffect, useState } from "react";
import { CHANNEL_META, type Application, type ResumeVersionSummary } from "@/lib/types";

// 弹窗保持浅色卡片：深底页面上一张干净的白底弹窗，文字用黑色，输入清晰可读。
const inputCls =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400";

// 新建 = 不传 app；编辑 = 传 app。两种模式共用这张弹窗。
export default function AddApplicationDialog({
  app,
  onClose,
  onCreated,
}: {
  app?: Application | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const isEdit = !!app;
  const [form, setForm] = useState({
    company: app?.company ?? "",
    position: app?.position ?? "",
    city: app?.city ?? "",
    salaryRange: app?.salaryRange ?? "",
    channel: app?.channel ?? "OFFICIAL",
    priority: app?.priority ?? "MEDIUM",
    jobLink: app?.jobLink ?? "",
    resumeVersionId: app?.resumeVersionId ?? "",
  });
  const [versions, setVersions] = useState<ResumeVersionSummary[]>([]);
  const [saving, setSaving] = useState(false);

  // 拉我的简历版本；新建时若未选则预填默认版本（编辑时尊重已有选择）。
  useEffect(() => {
    fetch("/api/resume-versions")
      .then((r) => (r.ok ? r.json() : []))
      .then((vs: ResumeVersionSummary[]) => {
        setVersions(vs);
        if (!isEdit) {
          const def = vs.find((v) => v.isDefault);
          if (def) setForm((p) => ({ ...p, resumeVersionId: def.id }));
        }
      })
      .catch(() => {});
  }, [isEdit]);

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit() {
    if (!form.company || !form.position) return;
    setSaving(true);
    // 空字符串的简历版本 → null（不绑定）。
    const payload = { ...form, resumeVersionId: form.resumeVersionId || null };
    const url = isEdit ? `/api/applications/${app!.id}` : "/api/applications";
    const method = isEdit ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-neutral-200/80 bg-white p-5 text-neutral-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-medium text-neutral-900">
          {isEdit ? "编辑岗位" : "添加岗位"}
        </h2>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className={inputCls}
              placeholder="公司 *"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="岗位 *"
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className={inputCls}
              placeholder="城市"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="薪资范围"
              value={form.salaryRange}
              onChange={(e) => set("salaryRange", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className={inputCls}
              value={form.channel}
              onChange={(e) => set("channel", e.target.value)}
            >
              {Object.entries(CHANNEL_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              className={inputCls}
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              <option value="HIGH">高优先</option>
              <option value="MEDIUM">中</option>
              <option value="LOW">低</option>
            </select>
          </div>
          <input
            className={inputCls}
            placeholder="岗位链接"
            value={form.jobLink}
            onChange={(e) => set("jobLink", e.target.value)}
          />

          {/* 简历版本：列出我的所有版本，选中写入 Application.resumeVersionId */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500">简历版本</label>
            <select
              className={inputCls}
              value={form.resumeVersionId}
              onChange={(e) => set("resumeVersionId", e.target.value)}
            >
              <option value="">不指定</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.isDefault ? "（默认）" : ""}
                </option>
              ))}
            </select>
            {versions.length === 0 && (
              <p className="mt-1 text-xs text-neutral-400">
                还没有简历版本，去「简历管理 → 简历版本」新建后即可在此选择
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={saving || !form.company || !form.position}
            className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
