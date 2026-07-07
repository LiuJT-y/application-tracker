import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateLoginCode, hashToken } from "@/lib/auth/resetToken";
import { sendLoginCodeEmail } from "@/lib/email";

// 防枚举：无论邮箱是否注册，都返回同一句成功。
const GENERIC = { ok: true, message: "如果该邮箱已注册，验证码已发送" };

const EXPIRES_MIN = 10;
const RESEND_COOLDOWN_MS = 60_000; // 同邮箱 60 秒限频

// POST /api/auth/login-code/request —— 发送邮箱登录验证码。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (user) {
    // 限频：最近一条未用的码若在冷却期内，直接返回 GENERIC（不重发、不泄露）。
    const recent = await prisma.loginCode.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    const cooling =
      recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS;

    if (!cooling) {
      // 作废该用户此前所有未用的码，只留最新一条有效。
      await prisma.loginCode.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const code = generateLoginCode();
      await prisma.loginCode.create({
        data: {
          userId: user.id,
          codeHash: hashToken(code),
          expiresAt: new Date(Date.now() + EXPIRES_MIN * 60_000),
        },
      });

      try {
        await sendLoginCodeEmail(email, code);
      } catch (e) {
        console.error("[login-code] 邮件发送失败：", e);
      }
    }
  }

  return NextResponse.json(GENERIC);
}
