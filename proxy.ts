import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/jwt";

// 页面级守卫（Next 16 的 proxy 约定，原 middleware）：
// 未登录访问任何业务页 → 跳 /login；已登录访问登录/注册页 → 跳 /board。
// 只用 jose 校验 cookie（Edge 兼容），不碰 prisma。
// API 路由不在 matcher 里，由各自的 getCurrentUserId() 返回 401。
// PUBLIC_PAGES：无需登录即可访问（不会被踢到 /login）。
const PUBLIC_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];
// REDIRECT_WHEN_AUTHED：已登录再访问就没意义，跳回 /board。
// 忘记/重置密码不在此列——已登录用户点重置链接也应能改密，不该被弹走。
const REDIRECT_WHEN_AUTHED = ["/login", "/register"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const match = (list: string[]) =>
    list.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!session && !match(PUBLIC_PAGES)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search =
      pathname === "/" ? "" : `?redirect=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (session && match(REDIRECT_WHEN_AUTHED)) {
    const url = req.nextUrl.clone();
    url.pathname = "/board";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // 跳过 api、_next 内部资源、带后缀的静态文件（图片/字体等）。
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
