"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  REVIEW_DIMENSIONS,
  INTERVIEW_STAGES,
  INTERVIEW_FORMATS,
  STATUS_META,
  type Application,
  type InterviewReview,
  type ReviewScores,
} from "@/lib/types";
import { llmHeaders } from "@/lib/llmConfig";
import UserMenu from "./UserMenu";

// HUD 风输入框：深底 + 浅字 + 霓虹聚焦描边
const inputCls =
  "w-full rounded-lg border bg-[#0d1322] px-3 py-2 text-sm text-[#E6F1FF] outline-none transition-colors placeholder:text-[#8B9CB8] border-[rgba(139,156,184,0.2)] focus:border-[#00F0FF]";

// 评分配色复用看板状态色（单一来源）：高分绿 / 中分青 / 低分品红警示。
function scoreColor(s: number) {
  if (s >= 80) return STATUS_META.OFFER.dot; // #00FFA3
  if (s >= 60) return STATUS_META.APPLIED.dot; // #00F0FF
  return "#FF2E97";
}

type QA = { question: string; answer: string };

export default function ReviewPanel() {
  const [apps, setApps] = useState<Application[]>([]);
  const [appId, setAppId] = useState("");
  const [stage, setStage] = useState<string>(INTERVIEW_STAGES[0]);
  const [format, setFormat] = useState<string>(INTERVIEW_FORMATS[0]);
  const [qa, setQa] = useState<QA[]>([{ question: "", answer: "" }]);
  const [stuck, setStuck] = useState("");
  const [feeling, setFeeling] = useState("");

  const [reviews, setReviews] = useState<InterviewReview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 拉岗位列表
  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((list: Application[]) => {
        setApps(list);
        if (list[0]) setAppId(list[0].id);
      });
  }, []);

  // 切换岗位时拉它的历史复盘
  useEffect(() => {
    if (!appId) {
      setReviews([]);
      return;
    }
    fetch(`/api/applications/${appId}/reviews`)
      .then((r) => r.json())
      .then(setReviews);
  }, [appId]);

  function setQaAt(i: number, patch: Partial<QA>) {
    setQa((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addQa() {
    setQa((prev) => [...prev, { question: "", answer: "" }]);
  }
  function removeQa(i: number) {
    setQa((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function submit() {
    if (!appId) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/applications/${appId}/reviews`, {
      method: "POST",
      // llmHeaders() 把设置页存的 key/baseUrl/model 带上；没配置则为空、服务端落 env 兜底
      headers: { "Content-Type": "application/json", ...llmHeaders() },
      body: JSON.stringify({ stage, format, qa, stuck, feeling }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "复盘失败，请重试");
      return;
    }
    const review: InterviewReview = await res.json();
    setReviews((prev) => [review, ...prev]);
    // 清空表单内容（保留岗位/轮次/形式选择）
    setQa([{ question: "", answer: "" }]);
    setStuck("");
    setFeeling("");
  }

  async function remove(id: string) {
    await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  const labelCls = "mb-1 block";
  const labelStyle = { color: "var(--color-txt-dim)" } as const;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="font-display text-xl font-bold uppercase tracking-[0.18em] text-glow"
            style={{ color: "var(--color-neon-cyan)" }}
          >
            AI 面试复盘
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-txt-dim)" }}>
            // 填写面试记录，AI 给出 8 维度评分与改进建议
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/board"
            className="rounded-lg border px-3 py-1.5 text-sm transition-colors"
            style={{ borderColor: "var(--color-line)", color: "var(--color-txt-dim)" }}
          >
            ← 回看板
          </Link>
          <UserMenu />
        </div>
      </div>

      {/* ——— 表单 ——— */}
      <div
        className="space-y-4 rounded-xl border p-5 backdrop-blur-md"
        style={{
          background: "var(--color-panel)",
          borderColor: "var(--color-line)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.28)",
        }}
      >
        <div className="grid grid-cols-3 gap-3">
          <label className="col-span-1 text-sm">
            <span className={labelCls} style={labelStyle}>
              岗位
            </span>
            <select
              className={inputCls}
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
            >
              {apps.length === 0 && <option value="">（暂无岗位）</option>}
              {apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.company} · {a.position}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={labelCls} style={labelStyle}>
              轮次
            </span>
            <select
              className={inputCls}
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {INTERVIEW_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={labelCls} style={labelStyle}>
              形式
            </span>
            <select
              className={inputCls}
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              {INTERVIEW_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* 面试问答（可增删） */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--color-txt-dim)" }}>
              面试问答
            </span>
            <button
              onClick={addQa}
              className="text-xs transition-colors hover:opacity-100"
              style={{ color: "var(--color-neon-cyan)", opacity: 0.8 }}
            >
              + 加一组
            </button>
          </div>
          {qa.map((p, i) => (
            <div
              key={i}
              className="space-y-2 rounded-lg border p-2.5"
              style={{ borderColor: "var(--color-line)" }}
            >
              <div className="flex items-center gap-2">
                <input
                  className={inputCls}
                  placeholder={`问题 ${i + 1}`}
                  value={p.question}
                  onChange={(e) => setQaAt(i, { question: e.target.value })}
                />
                {qa.length > 1 && (
                  <button
                    onClick={() => removeQa(i)}
                    className="shrink-0 rounded px-2 py-1 text-xs transition-colors"
                    style={{ color: "var(--color-txt-dim)" }}
                  >
                    删
                  </button>
                )}
              </div>
              <textarea
                className={`${inputCls} min-h-[60px] resize-y`}
                placeholder="我的回答"
                value={p.answer}
                onChange={(e) => setQaAt(i, { answer: e.target.value })}
              />
            </div>
          ))}
        </div>

        <label className="block text-sm">
          <span className={labelCls} style={labelStyle}>
            卡壳 / 答得不好的地方
          </span>
          <textarea
            className={`${inputCls} min-h-[60px] resize-y`}
            value={stuck}
            onChange={(e) => setStuck(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className={labelCls} style={labelStyle}>
            整体自我感受
          </span>
          <textarea
            className={`${inputCls} min-h-[60px] resize-y`}
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
          />
        </label>

        {error && (
          <p className="text-sm" style={{ color: "#FF2E97" }}>
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={submitting || !appId}
            className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all disabled:opacity-40"
            style={{
              color: "#04121a",
              background: "var(--color-neon-cyan)",
              boxShadow: "0 0 16px rgba(0,240,255,0.4)",
            }}
          >
            {submitting ? "AI 复盘中…" : "开始复盘"}
          </button>
        </div>
      </div>

      {/* ——— 历史复盘 ——— */}
      <div className="mt-8 space-y-4">
        {reviews.length > 0 && (
          <h2
            className="font-display text-[13px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-txt-dim)" }}
          >
            历史复盘（{reviews.length}）
          </h2>
        )}
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} onDelete={() => remove(r.id)} />
        ))}
      </div>
    </>
  );
}

function ReviewCard({
  review,
  onDelete,
}: {
  review: InterviewReview;
  onDelete: () => void;
}) {
  const reduce = useReducedMotion();
  const scores = review.scores as ReviewScores;
  const head = [review.stage, review.format].filter(Boolean).join(" · ");
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="hud-sweep relative overflow-hidden rounded-xl border p-5 backdrop-blur-md"
      style={{
        background: "var(--color-panel)",
        borderColor: "var(--color-line)",
        boxShadow: "inset 0 0 30px rgba(0,0,0,0.28)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm">
          {head && (
            <span className="font-display font-semibold" style={{ color: "var(--color-txt)" }}>
              {head}
            </span>
          )}
          <span className="ml-2 font-mono text-xs" style={{ color: "var(--color-txt-dim)" }}>
            {new Date(review.createdAt).toLocaleString("zh-CN")}
          </span>
        </div>
        <button
          onClick={onDelete}
          className="text-xs transition-colors hover:opacity-100"
          style={{ color: "var(--color-txt-dim)", opacity: 0.7 }}
        >
          删除
        </button>
      </div>

      {/* 8 维度评分条 */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {REVIEW_DIMENSIONS.map((d) => {
          const v = scores?.[d.key] ?? 0;
          const c = scoreColor(v);
          return (
            <div key={d.key}>
              <div className="mb-0.5 flex items-center justify-between text-xs">
                <span style={{ color: "var(--color-txt-dim)" }}>{d.label}</span>
                <span
                  className="font-mono font-semibold"
                  style={{ color: c, textShadow: `0 0 8px ${c}66` }}
                >
                  {v}
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: "rgba(139,156,184,0.1)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${v}%`,
                    background: c,
                    boxShadow: `0 0 8px ${c}99`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {review.strengths && (
          <Field label="优势" value={review.strengths} color={STATUS_META.OFFER.dot} />
        )}
        {review.weaknesses && (
          <Field label="待改进" value={review.weaknesses} color="#FF2E97" />
        )}
        {review.improvement && (
          <Field
            label="改进计划"
            value={review.improvement}
            color={STATUS_META.INTERVIEWING.dot}
          />
        )}
      </dl>
    </motion.div>
  );
}

function Field({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <dt
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color, textShadow: `0 0 8px ${color}55` }}
      >
        {label}
      </dt>
      <dd className="mt-0.5 whitespace-pre-wrap" style={{ color: "var(--color-txt)" }}>
        {value}
      </dd>
    </div>
  );
}
