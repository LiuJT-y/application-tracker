// 邮件发送：走 Resend。配了 RESEND_API_KEY 就真发；没配（本地开发）就 console.log
// 打印内容作为 fallback，方便本地测试忘记密码 / 验证码登录，不必真接邮箱。
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "OfferGate <onboarding@resend.dev>";

// 站点根地址：用于拼重置链接。默认本地。
export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

// 统一发信入口：有 key 走 Resend，无 key 打日志兜底。
async function send(to: string, subject: string, html: string, textForLog: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // 开发兜底：把关键信息打到服务端控制台。
    console.log(`\n[email:dev] 收件人=${to}\n[email:dev] 主题=${subject}\n[email:dev] ${textForLog}\n`);
    return;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Resend 发送失败：${error.message}`);
}

// 忘记密码：发重置链接。
export async function sendPasswordResetEmail(to: string, link: string) {
  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#1a1d29">
      <h2>重置你的密码</h2>
      <p>点击下面的链接设置新密码（30 分钟内有效）：</p>
      <p><a href="${link}" style="color:#7b5cff">${link}</a></p>
      <p style="color:#6b7280;font-size:13px">如果不是你本人操作，忽略此邮件即可，密码不会改变。</p>
    </div>`;
  await send(to, "重置你的 OfferGate 密码", html, `重置链接：${link}`);
}

// 邮箱验证码登录：发 6 位码。
export async function sendLoginCodeEmail(to: string, code: string) {
  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#1a1d29">
      <h2>你的登录验证码</h2>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#7b5cff">${code}</p>
      <p style="color:#6b7280;font-size:13px">10 分钟内有效。如果不是你本人操作，忽略此邮件即可。</p>
    </div>`;
  await send(to, `${code} 是你的 OfferGate 登录验证码`, html, `验证码：${code}`);
}
