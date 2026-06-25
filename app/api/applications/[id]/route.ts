import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/applications/:id —— 更新记录。
// 看板拖拽换列时调用（status 变化会自动写一条时间线）。
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "请求体为空" }, { status: 400 });
  }

  // 只认归属当前用户的记录，否则 404（杜绝越权改别人的）。
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  // 不允许客户端篡改归属 / 主键。
  const { id: _id, userId: _userId, note, ...patch } = body;
  const statusChanged = patch.status && patch.status !== existing.status;

  // 简历版本只能绑到自己的版本：传了非法/别人的 id 一律拒绝（防越权关联）。
  if ("resumeVersionId" in patch) {
    if (patch.resumeVersionId) {
      const v = await prisma.resumeVersion.findFirst({
        where: { id: String(patch.resumeVersionId), userId },
        select: { id: true },
      });
      if (!v) {
        return NextResponse.json({ error: "简历版本不存在" }, { status: 404 });
      }
      patch.resumeVersionId = v.id;
    } else {
      patch.resumeVersionId = null; // 显式解绑
    }
  }

  const app = await prisma.application.update({
    where: { id },
    data: {
      ...patch,
      // 首次进入「已投递」时补上投递时间
      appliedAt:
        patch.status === "APPLIED" && !existing.appliedAt
          ? new Date()
          : undefined,
      ...(statusChanged
        ? { statusEvents: { create: { status: patch.status, note, userId } } }
        : {}),
    },
  });

  return NextResponse.json(app);
}

// DELETE /api/applications/:id
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  // 按 {id, userId} 删，删到 0 行说明不存在或不属于当前用户。
  const { count } = await prisma.application.deleteMany({ where: { id, userId } });
  if (count === 0) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
