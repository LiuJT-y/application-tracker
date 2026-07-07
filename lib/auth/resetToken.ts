// 一次性凭证工具：忘记密码的重置 token + 邮箱验证码登录的 6 位码。
// 统一「生成明文 → 存 sha256 哈希」：明文只发给用户，库里只留哈希。
import { randomBytes, randomInt, createHash } from "crypto";

// sha256 哈希（hex）。token / 验证码入库前都过这一层。
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// 重置链接用：32 字节随机 → hex（64 位十六进制，足够抗猜）。
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

// 登录验证码：6 位数字（含前导零，如 "004273"）。
export function generateLoginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
