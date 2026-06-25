import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/reviews/:id —— 删除单条面试复盘（仅限本人的）
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const { count } = await prisma.interviewReview.deleteMany({
    where: { id, userId },
  });
  if (count === 0) {
    return NextResponse.json({ error: "复盘不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
