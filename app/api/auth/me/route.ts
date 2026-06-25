import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";

// GET /api/auth/me —— 当前登录用户（含插件用的 apiToken）。
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, apiToken: true },
  });
  if (!user) return unauthorized();

  return NextResponse.json(user);
}
