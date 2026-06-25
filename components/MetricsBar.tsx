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
    },
    {
      label: "进面率",
      value: interviewPct == null ? "—" : `${interviewPct}%`,
      color: "var(--color-neon-purple)",
    },
    {
      label: "Offer 数",
      value: offers == null ? "—" : String(offers),
      color: "var(--color-neon-green)",
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
        </motion.div>
      ))}
    </div>
  );
}
