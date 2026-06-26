import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

const RESUME_ITEM_TYPES = [
  "PROFILE",
  "EXPERIENCE",
  "PROJECT",
  "EDUCATION",
  "SKILL",
  "OTHER",
] as const;

// PATCH /api/resume-items/:id —— 更新一条简历条目。
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求体为空" }, { status: 400 });
  }

  // 只认归属当前用户的条目，否则 404（杜绝越权改别人的）。
  const existing = await prisma.resumeItem.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "条目不存在" }, { status: 404 });
  }

  // 只挑允许更新的字段，剥掉客户端传的 id / userId。
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s : null;
  };
  const patch: Prisma.ResumeItemUpdateInput = {};
  if ("type" in b && RESUME_ITEM_TYPES.includes(b.type as (typeof RESUME_ITEM_TYPES)[number])) {
    patch.type = b.type as (typeof RESUME_ITEM_TYPES)[number];
  }
  if ("title" in b && typeof b.title === "string" && b.title.trim()) {
    patch.title = b.title.trim();
  }
  if ("org" in b) patch.org = str(b.org);
  if ("location" in b) patch.location = str(b.location);
  if ("role" in b) patch.role = str(b.role);
  if ("degree" in b) patch.degree = str(b.degree);
  if ("startDate" in b) patch.startDate = str(b.startDate);
  if ("endDate" in b) patch.endDate = str(b.endDate);
  if ("description" in b) patch.description = str(b.description);
  if ("link" in b) patch.link = str(b.link);
  if ("order" in b && Number.isFinite(b.order)) patch.order = Number(b.order);
  if ("bullets" in b && Array.isArray(b.bullets)) {
    patch.bullets = (b.bullets as unknown[]).map((t) => String(t).trim()).filter(Boolean);
  }
  if ("tags" in b && Array.isArray(b.tags)) {
    patch.tags = (b.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean);
  }

  const item = await prisma.resumeItem.update({
    where: { id },
    data: patch,
  });
  return NextResponse.json(item);
}

// DELETE /api/resume-items/:id
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  // 按 {id, userId} 删，删到 0 行说明不存在或不属于当前用户。
  const { count } = await prisma.resumeItem.deleteMany({ where: { id, userId } });
  if (count === 0) {
    return NextResponse.json({ error: "条目不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
