"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// 全站布局壳：左侧固定侧边栏 + 右侧主内容。
// 登录/注册页不套壳（与 proxy.ts 的 AUTH_PAGES 一致），它们自带居中布局。
const BARE_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (bare) return <>{children}</>;

  return (
    <>
      {/* 城市夜景背景：固定铺底 + 暗化/紫调遮罩，压暗到面板半透明能透出轮廓又不影响文字。
          层级在粒子(-z-10)之下，确保内容/粒子都在它上面。 */}
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(10,14,26,0.2), rgba(10,14,26,0.50)), url('/city_bg.png')",
        }}
      />
      <Sidebar />
      <div className="ml-[220px] min-h-screen">{children}</div>
    </>
  );
}
