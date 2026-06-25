import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/hash";
import { signSession } from "@/lib/auth/jwt";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

// POST /api/auth/login —— 校验密码 → 签 JWT 写 session cookie。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "请填写邮箱和密码" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // 用户不存在 / 密码错误返回同一句，不泄露账号是否存在。
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

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
