import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";

// 简历素材库条目的合法类型（与 schema 的 ResumeItemType 枚举保持一致）。
const RESUME_ITEM_TYPES = [
  "PROFILE",
  "EXPERIENCE",
  "PROJECT",
  "EDUCATION",
  "SKILL",
  "OTHER",
] as const;

// 从请求体里挑出允许写入的字段，做基本清洗。userId 永远取自 session，不信任请求体。
function pickItemData(body: Record<string, unknown>) {
  const type = RESUME_ITEM_TYPES.includes(body.type as (typeof RESUME_ITEM_TYPES)[number])
    ? (body.type as (typeof RESUME_ITEM_TYPES)[number])
    : ("EXPERIENCE" as const);
  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean)
    : [];
  const str = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s : null;
  };
  return {
    type,
    title: typeof body.title === "string" ? body.title.trim() : "",
    org: str(body.org),
    location: str(body.location),
    startDate: str(body.startDate),
    endDate: str(body.endDate),
    description: str(body.description),
    tags,
    link: str(body.link),
    order: Number.isFinite(body.order) ? Number(body.order) : 0,
  };
}

// GET /api/resume-items —— 列出当前用户的简历条目，支持 ?type= 过滤。
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const type = req.nextUrl.searchParams.get("type");
  const validType =
    type && RESUME_ITEM_TYPES.includes(type as (typeof RESUME_ITEM_TYPES)[number])
      ? (type as (typeof RESUME_ITEM_TYPES)[number])
      : undefined;

  const items = await prisma.resumeItem.findMany({
    where: { userId, type: validType },
    orderBy: [{ type: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}

// POST /api/resume-items —— 新建一条简历条目，归到当前登录用户名下。
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求体为空" }, { status: 400 });
  }

  const data = pickItemData(body as Record<string, unknown>);
  if (!data.title) {
    return NextResponse.json({ error: "title 为必填" }, { status: 400 });
  }

  const item = await prisma.resumeItem.create({
    data: { ...data, userId },
  });
  return NextResponse.json(item, { status: 201 });
}
