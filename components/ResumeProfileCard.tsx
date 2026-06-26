"use client";

import { useEffect, useState } from "react";
import { type ResumeProfile } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border bg-[#0d1322] px-3 py-2 text-sm text-[#E6F1FF] outline-none transition-colors placeholder:text-[#8B9CB8] border-[rgba(139,156,184,0.2)] focus:border-[#00F0FF]";
const labelCls = "mb-1 block text-xs";
const dim = { color: "var(--color-txt-dim)" } as const;
const secondaryBtn = "rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50";
const secondaryStyle = {
  borderColor: "var(--color-line)",
  color: "var(--color-txt-dim)",
} as const;

const EMPTY: ResumeProfile = {
  name: null,
  email: null,
  phone: null,
  location: null,
  github: null,
  linkedin: null,
};

// 个人信息卡片：全局唯一一份，展示 + 编辑。放在 /resumes 页顶部。
export default function ResumeProfileCard() {
  const [profile, setProfile] = useState<ResumeProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 编辑表单本地态
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    github: "",
    linkedin: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/resume-profile");
    const data: ResumeProfile = res.ok ? await res.json() : EMPTY;
    setProfile(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit() {
    setForm({
      name: profile.name ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      location: profile.location ?? "",
      github: profile.github ?? "",
      linkedin: profile.linkedin ?? "",
    });
    setErr(null);
    setEditing(true);
  }

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setErr(null);
    const res = await fetch("/api/resume-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "保存失败");
      return;
    }
    setProfile(await res.json());
    setEditing(false);
  }

  const isEmpty =
    !profile.name &&
    !profile.email &&
    !profile.phone &&
    !profile.location &&
    !profile.github &&
    !profile.linkedin;

  return (
    <section
      className="mb-6 rounded-xl border p-5"
      style={{ borderColor: "var(--color-line)", background: "var(--color-panel)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2
          className="font-display text-sm font-bold uppercase tracking-[0.18em] text-glow"
          style={{ color: "var(--color-neon-cyan)" }}
        >
          个人信息
        </h2>
        {!editing && (
          <button onClick={openEdit} className={secondaryBtn} style={secondaryStyle}>
            {isEmpty ? "+ 填写" : "编辑"}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm" style={dim}>
          加载中…
        </p>
      ) : editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={dim}>
                姓名
              </label>
              <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="张三" />
            </div>
            <div>
              <label className={labelCls} style={dim}>
                所在地
              </label>
              <input className={inputCls} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="深圳" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={dim}>
                邮箱
              </label>
              <input className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="me@example.com" />
            </div>
            <div>
              <label className={labelCls} style={dim}>
                电话
              </label>
              <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="138…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={dim}>
                GitHub 主页
              </label>
              <input
                className={inputCls}
                value={form.github}
                onChange={(e) => set("github", e.target.value)}
                placeholder="https://github.com/你的用户名"
              />
            </div>
            <div>
              <label className={labelCls} style={dim}>
                领英主页
              </label>
              <input
                className={inputCls}
                value={form.linkedin}
                onChange={(e) => set("linkedin", e.target.value)}
                placeholder="https://www.linkedin.com/in/…"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all disabled:opacity-40"
              style={{ color: "#04121a", background: "var(--color-neon-cyan)", boxShadow: "0 0 16px rgba(0,240,255,0.4)" }}
            >
              {saving ? "保存中…" : "保存"}
            </button>
            <button onClick={() => setEditing(false)} className={secondaryBtn} style={secondaryStyle}>
              取消
            </button>
            {err && (
              <span className="text-sm" style={{ color: "#FF2E97" }}>
                {err}
              </span>
            )}
          </div>
        </div>
      ) : isEmpty ? (
        <p className="text-sm" style={{ ...dim, opacity: 0.7 }}>
          // 还没填个人信息。点右上「+ 填写」补上姓名、联系方式、一句话意向，生成简历时会用到。
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {profile.name && (
              <span className="font-display text-base font-semibold" style={{ color: "var(--color-txt)" }}>
                {profile.name}
              </span>
            )}
            {profile.location && (
              <span className="text-sm" style={dim}>
                {profile.location}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs" style={dim}>
            {profile.email && <span>✉ {profile.email}</span>}
            {profile.phone && <span>☎ {profile.phone}</span>}
          </div>
          {(profile.github || profile.linkedin) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {profile.github && (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate transition-colors hover:underline"
                  style={{ color: "var(--color-neon-cyan)" }}
                >
                  GitHub
                </a>
              )}
              {profile.linkedin && (
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate transition-colors hover:underline"
                  style={{ color: "var(--color-neon-cyan)" }}
                >
                  领英
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
