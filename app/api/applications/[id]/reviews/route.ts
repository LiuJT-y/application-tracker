import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTranscript, type ReviewFormInput } from "@/lib/types";
import { parseReview } from "@/lib/ai/reviewParser";
import { overrideFromHeaders } from "@/lib/ai/client";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/applications/:id/reviews —— 列该岗位的全部复盘（最新在前）
export async function GET(_req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const reviews = await prisma.interviewReview.findMany({
    where: { applicationId: id, userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reviews);
}

// POST /api/applications/:id/reviews —— 提交结构化复盘表单。
// 接 JSON（ReviewFormInput）→ 拼成 rawTranscript → 交给模型链算分 → 建 InterviewReview。
export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const app = await prisma.application.findFirst({ where: { id, userId } });
  if (!app) {
    return NextResponse.json({ error: "岗位不存在" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as ReviewFormInput | null;
  if (!body) {
    return NextResponse.json({ error: "请求体为空" }, { status: 400 });
  }

  const transcript = buildTranscript(body);
  if (!transcript) {
    return NextResponse.json(
      { error: "请至少填写一些面试内容再复盘" },
      { status: 400 }
    );
  }

  // 用户设置页填的 LLM 配置随请求头带来（用完即弃，不入库不打日志）；没填则落 env 兜底。
  const override = overrideFromHeaders(req);

  let parsed;
  try {
    parsed = await parseReview(transcript, override);
  } catch (e) {
    return NextResponse.json(
      { error: `AI 复盘失败：${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }

  const review = await prisma.interviewReview.create({
    data: {
      applicationId: id,
      userId,
      stage: body.stage ?? null,
      format: body.format ?? null,
      scores: parsed.scores,
      strengths: parsed.strengths || null,
      weaknesses: parsed.weaknesses || null,
      improvement: parsed.improvement || null,
      rawTranscript: transcript,
    },
  });

  return NextResponse.json(review, { status: 201 });
}
