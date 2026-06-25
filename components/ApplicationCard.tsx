"use client";

import {
  CHANNEL_META,
  PRIORITY_META,
  STATUS_META,
  type Application,
} from "@/lib/types";

// 匹配分发光环形进度（轻量 SVG，别为这个引 recharts）
function ScoreRing({ score }: { score: number }) {
  const r = 15;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;
  // 高分电光绿、中分青、低分压暗
  const color = pct >= 80 ? "#00FFA3" : pct >= 60 ? "#00F0FF" : "#8B9CB8";
  return (
    <div className="relative h-8 w-8 shrink-0">
      <svg viewBox="0 0 40 40" className="h-8 w-8 -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="rgba(139,156,184,0.16)"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold"
        style={{ color }}
      >
        {pct}
      </span>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function ApplicationCard({
  app,
  dragging = false,
  onDelete,
}: {
  app: Application;
  dragging?: boolean;
  onDelete?: () => void;
}) {
  const meta = STATUS_META[app.status];
  const isRejected = app.status === "REJECTED";
  const applied = formatDate(app.appliedAt);

  return (
    <div
      className="hud-sweep group relative overflow-hidden rounded-xl border p-2.5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "rgba(13,19,34,0.6)",
        borderColor: dragging
          ? meta.dot
          : isRejected
            ? "rgba(138,43,58,0.28)"
            : "rgba(139,156,184,0.16)",
        borderLeft: `2px solid ${meta.dot}`,
        // 拖起时：辉光增强 + 轻微放大 + 拖影（走 transform/box-shadow，不触发重排）
        boxShadow: dragging
          ? `0 10px 30px rgba(0,0,0,0.5), 0 0 24px ${meta.dot}66, inset 0 0 24px rgba(0,0,0,0.25)`
          : isRejected
            ? "none"
            : `inset 0 0 24px rgba(0,0,0,0.25)`,
        transform: dragging ? "scale(1.04)" : undefined,
        opacity: isRejected && !dragging ? 0.62 : 1,
      }}
    >
      {/* 角标装饰：右上小直角，hover 时淡出，让位给删除按钮 */}
      <span
        className="pointer-events-none absolute right-0 top-0 h-3 w-3 opacity-40 transition-opacity group-hover:opacity-0"
        style={{
          borderTop: `1.5px solid ${meta.dot}`,
          borderRight: `1.5px solid ${meta.dot}`,
        }}
      />

      {/* 删除按钮：hover 显示。stopPropagation 防止触发 dnd 拖拽 */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="删除这条投递"
          aria-label="删除"
          className="absolute right-1 top-1 z-10 hidden h-5 w-5 items-center justify-center rounded-md text-[13px] leading-none transition-colors group-hover:flex hover:brightness-125"
          style={{ color: "#FF2E97", background: "rgba(10,14,26,0.85)" }}
        >
          ×
        </button>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className="truncate font-display text-[13px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-txt)" }}
          >
            {app.company}
          </div>
          <div className="mt-1 truncate text-xs" style={{ color: "var(--color-txt-dim)" }}>
            {app.position}
            {app.currentStage ? ` · ${app.currentStage}` : ""}
          </div>
        </div>
        {app.matchScore != null && <ScoreRing score={app.matchScore} />}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {/* 状态霓虹小标签 */}
        <span
          className="rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{
            color: meta.dot,
            background: `${meta.dot}1a`,
            boxShadow: isRejected ? "none" : `0 0 8px ${meta.dot}26`,
          }}
        >
          {meta.en}
        </span>

        {app.city && (
          <span className="text-[11px]" style={{ color: "var(--color-txt-dim)" }}>
            {app.city}
          </span>
        )}
        {applied && (
          <span className="font-mono text-[11px]" style={{ color: "var(--color-txt-dim)" }}>
            {applied}
          </span>
        )}

        <span className="ml-auto text-[11px]">
          {app.priority === "HIGH" ? (
            <span style={{ color: PRIORITY_META.HIGH.color }}>● 高优先</span>
          ) : (
            <span style={{ color: "var(--color-txt-dim)" }}>
              {CHANNEL_META[app.channel] ?? ""}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
