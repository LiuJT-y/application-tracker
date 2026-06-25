import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";
import { reachedIndex } from "@/lib/insights";
import { STAGE_INDEX, type Status, type ResumeVersionSummary } from "@/lib/types";

// 百分比：1 位小数，分母 0 返回 null。
function pct(num: number, den: number): number | null {
  if (den === 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

// GET /api/resume-versions —— 列出我的简历版本，带条目数 / 关联投递数 / 面试率。
// 面试率复用 insights 的 reachedIndex：分母 = 关联投递中「最远≥已投递」，分子 = 「最远≥面试」。
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const versions = await prisma.resumeVersion.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    include: {
      items: { orderBy: { order: "asc" }, select: { itemId: true } },
      applications: { select: { status: true, currentStage: true } },
      // 只取 PDF 元信息（文件名 / 大小），绝不 select data 字节，否则列表会爆内存。
      file: { select: { filename: true, size: true } },
      _count: { select: { applications: true } },
    },
  });

  const result: ResumeVersionSummary[] = versions.map((v) => {
    const reached = v.applications.map((a) =>
      reachedIndex(a.status as Status, a.currentStage)
    );
    const total = reached.filter((r) => r >= STAGE_INDEX.APPLIED).length;
    const interviewed = reached.filter((r) => r >= STAGE_INDEX.INTERVIEWING).length;
    return {
      id: v.id,
      name: v.name,
      note: v.note,
      isDefault: v.isDefault,
      source: v.source as ResumeVersionSummary["source"],
      itemCount: v.items.length,
      applicationCount: v._count.applications,
      total,
      interviewed,
      rate: pct(interviewed, total),
      itemIds: v.items.map((i) => i.itemId),
      pdf: v.file ? { filename: v.file.filename, size: v.file.size } : null,
      createdAt: v.createdAt.toISOString(),
    };
  });

  return NextResponse.json(result);
}

// POST /api/resume-versions —— 新建版本（name、note、isDefault、有序 itemIds）。
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求体为空" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name 为必填" }, { status: 400 });
  }
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  const isDefault = body.isDefault === true;
  const rawIds = Array.isArray(body.itemIds) ? (body.itemIds as unknown[]).map(String) : [];

  // 只认属于当前用户的条目，按传入顺序去重。
  const owned = rawIds.length
    ? await prisma.resumeItem.findMany({
        where: { id: { in: rawIds }, userId },
        select: { id: true },
      })
    : [];
  const ownedSet = new Set(owned.map((o) => o.id));
  const itemIds = rawIds.filter((id, i) => ownedSet.has(id) && rawIds.indexOf(id) === i);

  const created = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      // 同一事务里把我其它版本的 isDefault 清掉，保证至多一个默认。
      await tx.resumeVersion.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.resumeVersion.create({
      data: {
        userId,
        name,
        note,
        isDefault,
        source: "COMPOSED",
        items: {
          create: itemIds.map((itemId, i) => ({ itemId, order: i, userId })),
        },
      },
    });
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
