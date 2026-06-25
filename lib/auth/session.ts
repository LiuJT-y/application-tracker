// 会话工具：从 httpOnly cookie 读 JWT → userId，给路由做鉴权用。
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, SESSION_COOKIE } from "./jwt";

export { SESSION_COOKIE };

// cookie 选项：httpOnly + 生产环境 secure + 7 天。
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

// 当前登录用户 id；未登录 / token 失效返回 null。
export async function getCurrentUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  return payload?.userId ?? null;
}

// 解析请求归属用户：优先 session cookie（前端浏览器），
// 其次认 Chrome 插件的 Authorization: Bearer <apiToken>。都没有返回 null。
export async function getRequestUserId(req: Request): Promise<string | null> {
  const fromSession = await getCurrentUserId();
  if (fromSession) return fromSession;

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;
  if (!token) return null;

  const user = await prisma.user.findUnique({
    where: { apiToken: token },
    select: { id: true },
  });
  return user?.id ?? null;
}

// 路由里统一的 401 响应。extraHeaders 给带 CORS 的插件接口用。
export function unauthorized(extraHeaders?: Record<string, string>) {
  return NextResponse.json(
    { error: "未登录" },
    { status: 401, headers: extraHeaders }
  );
}
