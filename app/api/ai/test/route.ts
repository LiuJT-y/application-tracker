import { NextRequest, NextResponse } from "next/server";
import { chatJSON, overrideFromHeaders } from "@/lib/ai/client";
import { getCurrentUserId, unauthorized } from "@/lib/auth/session";

// POST /api/ai/test —— 用设置页填的 LLM 配置（请求头）发一次极小请求，验证 key/endpoint/model 是否可用。
// 不落库、不打日志；没带配置则走 env 兜底。
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const override = overrideFromHeaders(req);
  try {
    const { provider } = await chatJSON(
      [
        { role: "system", content: '只回 JSON：{"ok":true}' },
        { role: "user", content: "ping" },
      ],
      override
    );
    return NextResponse.json({ ok: true, provider });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
