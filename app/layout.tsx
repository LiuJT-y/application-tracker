import "./globals.css";
import type { Metadata } from "next";
import { Orbitron, Inter, JetBrains_Mono, Noto_Sans_SC } from "next/font/google";
import Particles from "@/components/Particles";
import AppShell from "@/components/AppShell";

// 标题 / 公司名：等宽科技感
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});
// 正文
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
// 数据 / 数字
const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});
// 中文（思源黑体）
const notoSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "秋招投递记录",
  description: "个人秋招投递追踪工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${orbitron.variable} ${inter.variable} ${jbMono.variable} ${notoSC.variable}`}
    >
      <body className="font-sans antialiased">
        <Particles />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
