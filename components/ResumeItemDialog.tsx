"use client";

import { useState } from "react";
import { RESUME_ITEM_META, type ResumeItem, type ResumeItemType } from "@/lib/types";

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

// 可在下拉里选的类型（移除 PROFILE —— 已由「个人信息」卡片独立管理）。
const SELECTABLE_TYPES: ResumeItemType[] = [
  "EXPERIENCE",
  "PROJECT",
  "EDUCATION",
  "SKILL",
  "OTHER",
];

// 半宽短字段（标题单独处理；bullets 是整宽，不在这里）。标签 / 链接已移除。
type ShortField = "org" | "location" | "role" | "degree" | "startDate" | "endDate";

type TypeConfig = {
  titleLabel: string;
  titlePlaceholder: string;
  shorts: ShortField[]; // 按显示顺序的半宽字段
  showBullets: boolean;
  bulletsLabel: string;
  bulletsPlaceholder: string;
  bulletsRequired: boolean;
  labels?: Partial<Record<ShortField, string>>;
  placeholders?: Partial<Record<ShortField, string>>;
  selects?: Partial<Record<ShortField, readonly string[]>>; // 该字段渲染成下拉
};

const DEFAULT_LABELS: Record<ShortField, string> = {
  org: "机构 / 公司 / 学校",
  location: "地点",
  role: "角色",
  degree: "学位 / 专业",
  startDate: "开始时间",
  endDate: "结束时间",
};

const DEFAULT_PH: Record<ShortField, string> = {
  org: "如：字节跳动",
  location: "如：深圳",
  role: "如：独立开发 / 后端",
  degree: "如：计算机科学硕士",
  startDate: "2024.09",
  endDate: "2025.06 / 至今",
};

// 简历写法的要点提示
const RESUME_BULLET_PH = "按简历写法，一条一句，突出可量化的成果";

// 各类型显示哪些字段（对照表）。标签 / 链接已全部移除。
const TYPE_CONFIG: Record<ResumeItemType, TypeConfig> = {
  EXPERIENCE: {
    titleLabel: "标题（职位）",
    titlePlaceholder: "如：后端开发工程师",
    shorts: ["role", "org", "location", "startDate", "endDate"],
    labels: { role: "用工类型", org: "公司 / 机构" },
    selects: { role: ["实习", "全职", "兼职"] },
    showBullets: true,
    bulletsLabel: "主要工作和成绩",
    bulletsPlaceholder: RESUME_BULLET_PH,
    bulletsRequired: false,
  },
  PROJECT: {
    titleLabel: "标题（项目名）",
    titlePlaceholder: "如：秋招投递追踪器",
    shorts: ["role", "org", "startDate", "endDate"],
    labels: { org: "组织" },
    showBullets: true,
    bulletsLabel: "主要工作和成绩",
    bulletsPlaceholder: RESUME_BULLET_PH,
    bulletsRequired: false,
  },
  EDUCATION: {
    titleLabel: "标题（学校）",
    titlePlaceholder: "如：清华大学",
    shorts: ["degree", "role", "location", "startDate", "endDate"],
    labels: { degree: "学历", role: "专业", location: "地点（可选）" },
    placeholders: { degree: "如：硕士 / 本科", role: "如：计算机科学" },
    showBullets: true,
    bulletsLabel: "要点（可选，如 GPA / 荣誉）",
    bulletsPlaceholder: "如：GPA 3.9/4.0、国家奖学金",
    bulletsRequired: false,
  },
  SKILL: {
    titleLabel: "标题（分类名）",
    titlePlaceholder: "如：编程语言",
    shorts: [],
    showBullets: true,
    bulletsLabel: "具体技能",
    bulletsPlaceholder: "如：TypeScript",
    bulletsRequired: true,
  },
  OTHER: {
    titleLabel: "标题",
    titlePlaceholder: "",
    shorts: ["org", "location", "startDate", "endDate"],
    showBullets: true,
    bulletsLabel: "要点",
    bulletsPlaceholder: "一条一句",
    bulletsRequired: false,
  },
  // 个人简介已由「个人信息」卡片接管；仅在编辑遗留 PROFILE 条目时兜底显示较全字段。
  PROFILE: {
    titleLabel: "标题",
    titlePlaceholder: "",
    shorts: ["org", "location", "startDate", "endDate"],
    showBullets: true,
    bulletsLabel: "要点",
    bulletsPlaceholder: "一条一句",
    bulletsRequired: false,
  },
};

// 旧 description 单段 → 多条要点（去掉行首项目符号）。仅在编辑遗留无 bullets 的条目时兜底回填。
function splitDesc(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[◦•·\-–—*]+\s*/u, "").trim())
    .filter(Boolean);
}

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

  // 编辑遗留的、不在可选列表里的类型（如 PROFILE）时，把它临时加进下拉，避免被迫改类型。
  const typeOptions = item && !SELECTABLE_TYPES.includes(item.type)
    ? [item.type, ...SELECTABLE_TYPES]
    : SELECTABLE_TYPES;

  const [type, setType] = useState<ResumeItemType>(item?.type ?? "EXPERIENCE");
  // 所有标量字段都放在 form 里，切换类型时内容保留（只是显隐变化）。
  const [form, setForm] = useState({
    title: item?.title ?? "",
    org: item?.org ?? "",
    location: item?.location ?? "",
    role: item?.role ?? "",
    degree: item?.degree ?? "",
    startDate: item?.startDate ?? "",
    endDate: item?.endDate ?? "",
  });
  // 要点：多条可增删；编辑时优先用 bullets，没有则从旧 description 拆分兜底。
  const initialBullets =
    item?.bullets && item.bullets.length > 0
      ? item.bullets
      : item?.description
        ? splitDesc(item.description)
        : [];
  const [bullets, setBullets] = useState<string[]>(initialBullets.length ? initialBullets : [""]);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cfg = TYPE_CONFIG[type];

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  // —— bullets 操作 ——
  function setBullet(i: number, v: string) {
    setBullets((p) => p.map((b, idx) => (idx === i ? v : b)));
  }
  function addBullet() {
    setBullets((p) => [...p, ""]);
  }
  function removeBullet(i: number) {
    setBullets((p) => (p.length <= 1 ? [""] : p.filter((_, idx) => idx !== i)));
  }
  function moveBullet(i: number, dir: -1 | 1) {
    setBullets((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function submit() {
    const cleanBullets = bullets.map((b) => b.trim()).filter(Boolean);

    if (!form.title.trim()) {
      setErr("标题为必填");
      return;
    }
    if (cfg.showBullets && cfg.bulletsRequired && cleanBullets.length === 0) {
      setErr(`「${cfg.bulletsLabel}」至少填一条`);
      return;
    }

    setSaving(true);
    setErr(null);

    const str = (v: string) => (v.trim() ? v.trim() : null);
    const has = (f: ShortField) => cfg.shorts.includes(f);

    // 整套字段都显式给值：隐藏的字段写 null/空，确保切换类型后清掉不相关的旧数据。
    // 标签 / 链接已从表单移除，保存时一并清空（tags:[]、link:null）。
    const payload = {
      type,
      title: form.title.trim(),
      org: has("org") ? str(form.org) : null,
      location: has("location") ? str(form.location) : null,
      role: has("role") ? str(form.role) : null,
      degree: has("degree") ? str(form.degree) : null,
      startDate: has("startDate") ? str(form.startDate) : null,
      endDate: has("endDate") ? str(form.endDate) : null,
      link: null,
      bullets: cfg.showBullets ? cleanBullets : [],
      tags: [],
      description: null, // 要点已统一走 bullets，清掉遗留单段文本
    };

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
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl border p-5"
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
          {/* 类型 + 标题始终显示 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={dim}>
                类型
              </label>
              <select
                className={inputCls}
                value={type}
                onChange={(e) => setType(e.target.value as ResumeItemType)}
              >
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {RESUME_ITEM_META[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} style={dim}>
                {cfg.titleLabel} *
              </label>
              <input
                className={inputCls}
                placeholder={cfg.titlePlaceholder}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>
          </div>

          {/* 按类型显示的半宽短字段（auto-flow，无空洞） */}
          {cfg.shorts.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {cfg.shorts.map((f) => {
                const opts = cfg.selects?.[f];
                return (
                  <div key={f}>
                    <label className={labelCls} style={dim}>
                      {cfg.labels?.[f] ?? DEFAULT_LABELS[f]}
                    </label>
                    {opts ? (
                      <select
                        className={inputCls}
                        value={form[f]}
                        onChange={(e) => set(f, e.target.value)}
                      >
                        <option value="">请选择</option>
                        {opts.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={inputCls}
                        placeholder={cfg.placeholders?.[f] ?? DEFAULT_PH[f]}
                        value={form[f]}
                        onChange={(e) => set(f, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 要点：多条可增删、调顺序 */}
          {cfg.showBullets && (
            <div>
              <label className={labelCls} style={dim}>
                {cfg.bulletsLabel}
                {cfg.bulletsRequired ? " *" : ""}
              </label>
              <div className="space-y-2">
                {bullets.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-4 shrink-0 text-center font-mono text-xs" style={dim}>
                      {i + 1}
                    </span>
                    <input
                      className={`${inputCls} flex-1`}
                      placeholder={cfg.bulletsPlaceholder}
                      value={b}
                      onChange={(e) => setBullet(i, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => moveBullet(i, -1)}
                      disabled={i === 0}
                      title="上移"
                      className="shrink-0 rounded px-1.5 py-1 text-xs transition-colors hover:text-[var(--color-neon-cyan)] disabled:opacity-30"
                      style={dim}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBullet(i, 1)}
                      disabled={i === bullets.length - 1}
                      title="下移"
                      className="shrink-0 rounded px-1.5 py-1 text-xs transition-colors hover:text-[var(--color-neon-cyan)] disabled:opacity-30"
                      style={dim}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBullet(i)}
                      title="删除这条"
                      className="shrink-0 rounded px-1.5 py-1 text-xs transition-colors hover:text-[#FF2E97]"
                      style={dim}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addBullet}
                className="mt-2 rounded-lg border px-3 py-1 text-xs transition-colors hover:border-[var(--color-neon-cyan)] hover:text-[var(--color-neon-cyan)]"
                style={secondaryStyle}
              >
                + 添加一条
              </button>
            </div>
          )}
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
