import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";
import { type ResumeProfile } from "@/lib/types";

// 个人信息为空时返回的统一空形状（前端表单直接用）。
const EMPTY: ResumeProfile = {
  name: null,
  email: null,
  phone: null,
  location: null,
  github: null,
  linkedin: null,
};

// GET /api/resume-profile —— 取当前用户的个人信息；没有则返回空形状。
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const p = await prisma.resumeProfile.findUnique({ where: { userId } });
  if (!p) return NextResponse.json(EMPTY);
  return NextResponse.json({
    name: p.name,
    email: p.email,
    phone: p.phone,
    location: p.location,
    github: p.github,
    linkedin: p.linkedin,
  } satisfies ResumeProfile);
}

// PUT /api/resume-profile —— upsert：没有就建、有就更新，保证一个用户最多一条。
export async function PUT(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求体为空" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const str = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s : null;
  };

  const data = {
    name: str(b.name),
    email: str(b.email),
    phone: str(b.phone),
    location: str(b.location),
    github: str(b.github),
    linkedin: str(b.linkedin),
  };

  const p = await prisma.resumeProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return NextResponse.json({
    name: p.name,
    email: p.email,
    phone: p.phone,
    location: p.location,
    github: p.github,
    linkedin: p.linkedin,
  } satisfies ResumeProfile);
}
