import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/jwt";

// 页面级守卫（Next 16 的 proxy 约定，原 middleware）：
// 未登录访问任何业务页 → 跳 /login；已登录访问登录/注册页 → 跳 /board。
// 只用 jose 校验 cookie（Edge 兼容），不碰 prisma。
// API 路由不在 matcher 里，由各自的 getCurrentUserId() 返回 401。
const AUTH_PAGES = ["/login", "/register"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!session && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search =
      pathname === "/" ? "" : `?redirect=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (session && isAuthPage) {
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
