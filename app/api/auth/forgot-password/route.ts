import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResetToken, hashToken } from "@/lib/auth/resetToken";
import { sendPasswordResetEmail, appUrl } from "@/lib/email";

// 防枚举：无论邮箱是否注册，都返回同一句成功。
const GENERIC = { ok: true, message: "如果该邮箱已注册，重置链接已发送" };

const EXPIRES_MIN = 30;

// POST /api/auth/forgot-password —— 发起密码重置。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  // 用户存在才真的建 token + 发信；不存在也照样返回 GENERIC。
  if (user) {
    // 作废该用户此前所有未用的重置 token（一次只留一条有效）。
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const raw = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + EXPIRES_MIN * 60_000),
      },
    });

    const link = `${appUrl()}/reset-password?token=${raw}`;
    try {
      await sendPasswordResetEmail(email, link);
    } catch (e) {
      // 发信失败不向前端泄露（仍返回 GENERIC 防枚举），仅记服务端日志。
      console.error("[forgot-password] 邮件发送失败：", e);
    }
  }

  return NextResponse.json(GENERIC);
}
