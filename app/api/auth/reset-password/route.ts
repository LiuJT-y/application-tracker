import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/hash";
import { hashToken } from "@/lib/auth/resetToken";

// POST /api/auth/reset-password —— 校验重置 token → 改密码。
// 不自动登录：成功后让用户回登录页用新密码登录。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  const password = String(body?.password ?? "");

  if (!token) {
    return NextResponse.json({ error: "重置链接无效" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  const invalid = () =>
    NextResponse.json({ error: "重置链接无效或已过期" }, { status: 400 });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return invalid();
  }

  // 事务：改密 + 标记该 token 已用 + 作废该用户其它未用 token。
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
