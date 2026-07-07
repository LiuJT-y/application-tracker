import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/resetToken";
import { signSession } from "@/lib/auth/jwt";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

const MAX_ATTEMPTS = 5;

// POST /api/auth/login-code/verify —— 校验验证码 → 签发 session（登录）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const code = String(body?.code ?? "").trim();

  if (!email || !code) {
    return NextResponse.json({ error: "请填写邮箱和验证码" }, { status: 400 });
  }

  const invalid = () =>
    NextResponse.json({ error: "验证码无效或已过期" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return invalid();

  const record = await prisma.loginCode.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) {
    return invalid();
  }

  // 码不对：失败计数 +1（到阈值后这条码就作废了），返回无效。
  if (record.codeHash !== hashToken(code)) {
    await prisma.loginCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return invalid();
  }

  // 码正确：标记已用 → 签 JWT 写 session cookie。
  await prisma.loginCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  const token = await signSession({ userId: user.id, email: user.email });
  const res = NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    apiToken: user.apiToken,
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
