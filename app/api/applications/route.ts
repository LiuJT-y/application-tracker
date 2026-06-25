import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsHeaders } from "@/lib/cors";
import { getCurrentUserId, getRequestUserId, unauthorized } from "@/lib/auth/session";

// OPTIONS /api/applications —— 响应浏览器(Chrome 插件)跨域 POST 前的预检请求
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET /api/applications —— 列出当前用户的投递记录（看板用）
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized(corsHeaders);

  const apps = await prisma.application.findMany({
    where: { userId },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { resumeVersion: { select: { name: true } } },
  });
  // 给卡片用：把关联简历版本名平铺成 resumeVersionName。
  const result = apps.map(({ resumeVersion, ...a }) => ({
    ...a,
    resumeVersionName: resumeVersion?.name ?? null,
  }));
  return NextResponse.json(result, { headers: corsHeaders });
}

// POST /api/applications —— 新建一条投递记录。
// 这是 Chrome 插件的入口：插件抓取 JD + 算出匹配分后，POST 到这里。
// 手动添加岗位时也走同一个接口。
export async function POST(req: NextRequest) {
  // 认 session cookie（前端）或 Authorization: Bearer <apiToken>（插件）。
  const userId = await getRequestUserId(req);
  if (!userId) return unauthorized(corsHeaders);

  const body = await req.json().catch(() => null);
  if (!body?.company || !body?.position) {
    return NextResponse.json(
      { error: "company 和 position 为必填" },
      { status: 400, headers: corsHeaders }
    );
  }

  const status = body.status ?? "APPLIED";

  // 只接受属于当前用户的简历版本，否则置 null（杜绝绑到别人的版本）。
  let resumeVersionId: string | null = null;
  if (body.resumeVersionId) {
    const v = await prisma.resumeVersion.findFirst({
      where: { id: String(body.resumeVersionId), userId },
      select: { id: true },
    });
    resumeVersionId = v?.id ?? null;
  }

  const app = await prisma.application.create({
    data: {
      userId,
      company: body.company,
      position: body.position,
      city: body.city ?? null,
      salaryRange: body.salaryRange ?? null,
      workMode: body.workMode ?? null,
      channel: body.channel ?? "OFFICIAL",
      priority: body.priority ?? "MEDIUM",
      status,
      currentStage: body.currentStage ?? null,
      jobLink: body.jobLink ?? null,
      jdText: body.jdText ?? null,
      matchScore: body.matchScore ?? null,
      resumeVersionId,
      appliedAt: status === "APPLIED" ? new Date() : null,
      // 建记录的同时写一条时间线
      statusEvents: { create: { status, note: "创建投递记录", userId } },
    },
  });

  return NextResponse.json(app, { status: 201, headers: corsHeaders });
}
