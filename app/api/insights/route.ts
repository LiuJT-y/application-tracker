import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";
import { reachedIndex } from "@/lib/insights";
import {
  STAGE_INDEX,
  CHANNEL_META,
  type Status,
  type FunnelStage,
  type RateRow,
  type InsightsResponse,
} from "@/lib/types";

// 百分比：1 位小数，分母为 0 返回 null（前端显示「—」）。
function pct(num: number, den: number): number | null {
  if (den === 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

// 按某个 key 分组算面试率。only 已计算好 farthest 的投递（且已过滤为「最远≥APPLIED」）。
function ratesBy(
  rows: { farthest: number; groupKey: string; label: string }[]
): RateRow[] {
  const map = new Map<string, { label: string; total: number; interviewed: number }>();
  for (const r of rows) {
    const g = map.get(r.groupKey) ?? { label: r.label, total: 0, interviewed: 0 };
    g.total += 1;
    if (r.farthest >= STAGE_INDEX.INTERVIEWING) g.interviewed += 1;
    map.set(r.groupKey, g);
  }
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      label: v.label,
      total: v.total,
      interviewed: v.interviewed,
      rate: pct(v.interviewed, v.total),
    }))
    .sort((a, b) => b.total - a.total);
}

// GET /api/insights —— 漏斗 / 渠道面试率 / 简历版本面试率。
// 按每条投递「当前面板状态」聚合（REJECTED 用 currentStage 还原面试进度），
// 不翻 StatusEvent 历史，避免把拖错又拖回的中间态算进去。
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const apps = await prisma.application.findMany({
    where: { userId },
    include: {
      resumeVersion: { select: { id: true, name: true } },
    },
  });

  // 每条投递算出当前到达的阶段，并保留分组所需字段。
  const enriched = apps.map((a) => ({
    farthest: reachedIndex(a.status as Status, a.currentStage),
    channel: a.channel as string,
    resumeId: a.resumeVersion?.id ?? null,
    resumeName: a.resumeVersion?.name ?? null,
  }));

  // 「投出去的」= 最远≥APPLIED；SAVED 收藏未投不计入总投递与各分母。
  const applied = enriched.filter((e) => e.farthest >= STAGE_INDEX.APPLIED);
  const total = applied.length;

  const countAtLeast = (idx: number) =>
    applied.filter((e) => e.farthest >= idx).length;

  const funnel: FunnelStage[] = [
    { key: "applied", label: "总投递", count: total },
    { key: "resume", label: "简历通过", count: countAtLeast(STAGE_INDEX.OA) },
    {
      key: "interview",
      label: "面试邀请",
      count: countAtLeast(STAGE_INDEX.INTERVIEWING),
    },
    { key: "offer", label: "Offer", count: countAtLeast(STAGE_INDEX.OFFER) },
  ].map((s) => ({ ...s, pct: pct(s.count, total) }));

  const channelRates = ratesBy(
    applied.map((e) => ({
      farthest: e.farthest,
      groupKey: e.channel,
      label: CHANNEL_META[e.channel] ?? e.channel,
    }))
  );

  const resumeRates = ratesBy(
    applied.map((e) => ({
      farthest: e.farthest,
      groupKey: e.resumeId ?? "__none__",
      label: e.resumeName ?? "未指定",
    }))
  );

  const body: InsightsResponse = { funnel, channelRates, resumeRates };
  return NextResponse.json(body);
}
