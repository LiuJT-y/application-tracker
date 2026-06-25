import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/resume-versions/:id —— 改名 / 备注 / 调整条目与顺序 / 设默认。
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求体为空" }, { status: 400 });
  }

  // 只认归属当前用户的版本，否则 404。
  const existing = await prisma.resumeVersion.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "版本不存在" }, { status: 404 });
  }

  const data: { name?: string; note?: string | null; isDefault?: boolean } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if ("note" in body) {
    data.note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  }
  const setDefault = "isDefault" in body ? body.isDefault === true : undefined;

  // 若传了 itemIds，则整体替换关联条目（只接受属于当前用户的条目，按传入顺序）。
  let itemIds: string[] | null = null;
  if (Array.isArray(body.itemIds)) {
    const rawIds = (body.itemIds as unknown[]).map(String);
    const owned = rawIds.length
      ? await prisma.resumeItem.findMany({
          where: { id: { in: rawIds }, userId },
          select: { id: true },
        })
      : [];
    const ownedSet = new Set(owned.map((o) => o.id));
    itemIds = rawIds.filter((x, i) => ownedSet.has(x) && rawIds.indexOf(x) === i);
  }

  await prisma.$transaction(async (tx) => {
    if (setDefault === true) {
      await tx.resumeVersion.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    await tx.resumeVersion.update({
      where: { id },
      data: { ...data, ...(setDefault !== undefined ? { isDefault: setDefault } : {}) },
    });
    if (itemIds) {
      await tx.resumeVersionItem.deleteMany({ where: { versionId: id, userId } });
      if (itemIds.length) {
        await tx.resumeVersionItem.createMany({
          data: itemIds.map((itemId, i) => ({ versionId: id, itemId, order: i, userId })),
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/resume-versions/:id —— 先校验归属；删除前把关联该版本的投递 resumeVersionId 置 null。
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const existing = await prisma.resumeVersion.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "版本不存在" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    // 解绑投递（别让外键报错），关联表 ResumeVersionItem 随版本删除级联清掉。
    await tx.application.updateMany({
      where: { resumeVersionId: id, userId },
      data: { resumeVersionId: null },
    });
    await tx.resumeVersion.deleteMany({ where: { id, userId } });
  });

  return NextResponse.json({ ok: true });
}
