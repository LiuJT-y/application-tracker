import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

const MAX_BYTES = 4 * 1024 * 1024; // 4MB（Vercel serverless 请求体上限约 4.5MB）

// 校验该版本归属当前用户，返回版本 id；不属于则 null。
async function ownVersion(id: string, userId: string): Promise<boolean> {
  const v = await prisma.resumeVersion.findFirst({ where: { id, userId }, select: { id: true } });
  return !!v;
}

// POST /api/resume-versions/:id/pdf —— 上传 / 替换该版本的 PDF。
// 用「原始字节」上传（Content-Type: application/pdf + x-filename 头），不用 multipart/form-data：
// Next.js 会把 multipart POST 当成 Server Action 拦截，导致请求打不到这个 route handler（连接被重置）。
export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!(await ownVersion(id, userId))) {
    return NextResponse.json({ error: "版本不存在" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/pdf")) {
    return NextResponse.json({ error: "只接受 PDF 文件" }, { status: 400 });
  }

  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length <= 0 || bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: "文件需 >0 且 ≤4MB" }, { status: 400 });
  }
  // 校验 PDF 魔数（%PDF），避免存进非 PDF 的垃圾字节。
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return NextResponse.json({ error: "不是有效的 PDF 文件" }, { status: 400 });
  }

  // 文件名从 x-filename 头取（已 encodeURIComponent），兜底 resume.pdf。
  let filename = "resume.pdf";
  const rawName = req.headers.get("x-filename");
  if (rawName) {
    try {
      filename = (decodeURIComponent(rawName).trim() || filename).slice(0, 255);
    } catch {
      /* 解码失败用兜底名 */
    }
  }

  // 已存在则覆盖（versionId 唯一）；同时把版本来源标记为 UPLOADED。
  await prisma.$transaction([
    prisma.resumeFile.upsert({
      where: { versionId: id },
      create: {
        versionId: id,
        userId,
        data: bytes,
        filename,
        mimeType: "application/pdf",
        size: bytes.length,
      },
      update: { data: bytes, filename, mimeType: "application/pdf", size: bytes.length },
    }),
    prisma.resumeVersion.update({ where: { id }, data: { source: "UPLOADED" } }),
  ]);

  return NextResponse.json({ ok: true, filename, size: bytes.length }, { status: 201 });
}

// DELETE /api/resume-versions/:id/pdf —— 删除该版本的 PDF，来源回 COMPOSED。
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!(await ownVersion(id, userId))) {
    return NextResponse.json({ error: "版本不存在" }, { status: 404 });
  }

  const { count } = await prisma.resumeFile.deleteMany({ where: { versionId: id, userId } });
  if (count === 0) {
    return NextResponse.json({ error: "该版本没有 PDF" }, { status: 404 });
  }
  await prisma.resumeVersion.update({ where: { id }, data: { source: "COMPOSED" } });

  return NextResponse.json({ ok: true });
}

// GET /api/resume-versions/:id/pdf —— 取 PDF 字节，inline 预览。唯一读取 data 字节的地方。
export async function GET(_req: NextRequest, { params }: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  // 直接按 {versionId, userId} 取，兼做归属校验。
  const file = await prisma.resumeFile.findFirst({
    where: { versionId: id, userId },
    select: { data: true, filename: true, mimeType: true, size: true },
  });
  if (!file) {
    return NextResponse.json({ error: "该版本没有 PDF" }, { status: 404 });
  }

  const body = new Uint8Array(file.data);
  // 文件名可能含中文，用 RFC 5987 的 filename* 编码。
  const disposition = `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "application/pdf",
      "Content-Length": String(file.size),
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}
