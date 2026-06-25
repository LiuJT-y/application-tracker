"use client";

import { useState } from "react";
import { CHANNEL_META } from "@/lib/types";

// 弹窗保持浅色卡片：深底页面上一张干净的白底弹窗，文字用黑色，输入清晰可读。
const inputCls =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400";

export default function AddApplicationDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    company: "",
    position: "",
    city: "",
    salaryRange: "",
    channel: "OFFICIAL",
    priority: "MEDIUM",
    jobLink: "",
  });
  const [saving, setSaving] = useState(false);

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit() {
    if (!form.company || !form.position) return;
    setSaving(true);
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
        <h2 className="mb-4 text-base font-medium text-neutral-900">添加岗位</h2>

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
