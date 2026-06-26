"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  STATUS_META,
  type InsightsResponse,
  type FunnelStage,
  type RateRow,
} from "@/lib/types";

// 漏斗各层配色复用看板状态色（单一来源）：APPLIED→OA→INTERVIEWING→OFFER。
const FUNNEL_COLORS = [
  STATUS_META.APPLIED.dot,
  STATUS_META.OA.dot,
  STATUS_META.INTERVIEWING.dot,
  STATUS_META.OFFER.dot,
];

const DIM = "#8B9CB8";

function fmtPct(v: number | null): string {
  return v === null ? "—" : `${v}%`;
}

export default function InsightsView() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("接口出错"))))
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="flex items-center gap-2 font-display text-2xl font-bold tracking-[0.12em] text-glow"
            style={{ color: "var(--color-txt)" }}
          >
            <span style={{ color: "var(--color-accent)" }}>✦</span>
            数据洞察
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-txt-dim)" }}>
            // 按「每条投递最远到达过的阶段」统计，挂掉但到过面试的投递也算进面试率
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: STATUS_META.REJECTED.text }}>
          {error}
        </p>
      )}
      {!error && !data && (
        <p className="text-sm" style={{ color: "var(--color-txt-dim)" }}>
          加载中…
        </p>
      )}

      {data && (
        <div className="space-y-5">
          <Card title="转化漏斗">
            <Funnel stages={data.funnel} />
          </Card>
          <Card title="渠道面试率">
            <RateChart rows={data.channelRates} color={STATUS_META.APPLIED.dot} />
          </Card>
          <Card title="简历版本面试率">
            <RateChart rows={data.resumeRates} color={STATUS_META.OFFER.dot} />
          </Card>
        </div>
      )}
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="hud-sweep relative overflow-hidden rounded-xl border p-5 backdrop-blur-md"
      style={{
        background: "var(--color-panel)",
        borderColor: "var(--color-line)",
        boxShadow: "inset 0 0 30px rgba(0,0,0,0.28)",
      }}
    >
      <h2
        className="mb-4 font-display text-[13px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-txt-dim)" }}
      >
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

// 漏斗：发光横条，宽度 = 相对总投递的百分比；数字带 neon glow。
function Funnel({ stages }: { stages: FunnelStage[] }) {
  if (stages[0]?.count === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-txt-dim)" }}>
        还没有投出去的记录
      </p>
    );
  }
  return (
    <div className="space-y-3.5">
      {stages.map((s, i) => {
        const color = FUNNEL_COLORS[i] ?? FUNNEL_COLORS[0];
        return (
          <div key={s.key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span style={{ color: "var(--color-txt-dim)" }}>{s.label}</span>
              <span className="font-mono tabular-nums">
                <span
                  className="text-base font-semibold"
                  style={{ color, textShadow: `0 0 10px ${color}66` }}
                >
                  {s.count}
                </span>
                <span className="ml-2" style={{ color: "var(--color-txt-dim)" }}>
                  {fmtPct(s.pct)}
                </span>
              </span>
            </div>
            <div
              className="h-6 w-full overflow-hidden rounded-md"
              style={{ background: "rgba(139,156,184,0.08)" }}
            >
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{
                  width: `${s.pct ?? 0}%`,
                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                  boxShadow: `0 0 12px ${color}80`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 面试率横向柱状图（Recharts，暗色 HUD 主题）。空分组时给提示。
function RateChart({ rows, color }: { rows: RateRow[]; color: string }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-txt-dim)" }}>
        暂无数据
      </p>
    );
  }
  // rate 为 null（分母 0）时按 0 画条，但标签显示「—」。
  const chartData = rows.map((r) => ({
    label: r.label,
    rate: r.rate ?? 0,
    display: fmtPct(r.rate),
    total: r.total,
    interviewed: r.interviewed,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 48)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 8, right: 40, top: 4, bottom: 4 }}
      >
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={90}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: DIM }}
        />
        <Tooltip
          cursor={{ fill: "rgba(139,156,184,0.08)" }}
          contentStyle={{
            background: "#0d1322",
            border: "1px solid rgba(139,156,184,0.2)",
            borderRadius: 8,
            color: "#E6F1FF",
            fontSize: 12,
          }}
          labelStyle={{ color: DIM }}
          formatter={(_v, _n, p) => [
            `${p.payload.display}（${p.payload.interviewed}/${p.payload.total}）`,
            "面试率",
          ]}
        />
        <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={20}>
          {chartData.map((_, i) => (
            <Cell
              key={i}
              fill={color}
              style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
            />
          ))}
          <LabelList
            dataKey="display"
            position="right"
            style={{ fontSize: 12, fill: DIM }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
