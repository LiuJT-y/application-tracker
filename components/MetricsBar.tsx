"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { InsightsResponse } from "@/lib/types";

// 看板顶部紧凑指标条：总投递 / 进面率 / Offer 数。
// 数字全部来自现有 GET /api/insights 的 funnel，不新建聚合逻辑：
//   总投递 = funnel.applied.count
//   进面率 = funnel.interview.pct（相对总投递，已在服务端算好）
//   Offer 数 = funnel.offer.count
export default function MetricsBar() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  const funnel = data?.funnel ?? [];
  const find = (key: string) => funnel.find((f) => f.key === key);
  const total = find("applied")?.count ?? null;
  const interviewPct = find("interview")?.pct ?? null;
  const offers = find("offer")?.count ?? null;

  const items = [
    {
      label: "总投递",
      value: total == null ? "—" : String(total),
      color: "var(--color-neon-cyan)",
      // 装饰性折线（非真实时间序列），各卡不同走势以做区分
      spark: [6, 10, 7, 13, 9, 16, 12, 20, 17, 24],
    },
    {
      label: "进面率",
      value: interviewPct == null ? "—" : `${interviewPct}%`,
      color: "var(--color-accent)",
      spark: [14, 10, 16, 12, 18, 13, 19, 15, 22, 18],
    },
    {
      label: "Offer 数",
      value: offers == null ? "—" : String(offers),
      color: "var(--color-neon-green)",
      spark: [4, 6, 5, 9, 7, 11, 9, 14, 12, 16],
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: reduce ? 0 : i * 0.08 }}
          className="hud-sweep relative overflow-hidden rounded-xl border p-3 backdrop-blur-md"
          style={{
            background: "var(--color-panel)",
            borderColor: "var(--color-line)",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.28)",
          }}
        >
          {/* 装饰 sparkline：贴在卡片右下，低饱和不抢数字 */}
          <Sparkline points={it.spark} color={it.color} idx={i} />

          <div className="relative">
            <div
              className="text-[11px] uppercase tracking-wider"
              style={{ color: "var(--color-txt-dim)" }}
            >
              {it.label}
            </div>
            <div
              className="mt-1 font-display text-2xl font-bold tabular-nums animate-pulse-glow"
              style={{ color: it.color }}
            >
              {it.value}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// 轻量装饰折线（手写 SVG，不引 recharts）：把 points 映射到 100x32 视窗，
// 末端加一个发光圆点，底部铺一层同色渐变。纯视觉，不代表真实数据。
function Sparkline({
  points,
  color,
  idx,
}: {
  points: number[];
  color: string;
  idx: number;
}) {
  const w = 100;
  const h = 32;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / span) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = coords[coords.length - 1];
  const gid = `spark-fill-${idx}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none absolute bottom-2 right-0 h-9 w-2/3 opacity-70"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}
