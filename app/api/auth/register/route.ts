import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/hash";
import { signSession } from "@/lib/auth/jwt";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

// POST /api/auth/register —— 注册并直接登录（写 session cookie）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = body?.name ? String(body.name).trim() : null;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
    select: { id: true, email: true, name: true, apiToken: true },
  });

  const token = await signSession({ userId: user.id, email: user.email });
  const res = NextResponse.json(user, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
