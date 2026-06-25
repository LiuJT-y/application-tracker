// 会话 JWT：用 jose 签发 / 校验（Edge 兼容，能在 middleware 里跑）。
// payload 只放 userId(sub) + email，敏感信息不进 token。
import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = { userId: string; email: string };

// session cookie 名定义在这里（Edge 安全，只依赖 jose），
// 好让 middleware 直接 import，不必经过会拉进 prisma 的 session.ts。
export const SESSION_COOKIE = "session";

const EXPIRES_IN = "7d";

function secretKey(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET 未配置");
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(secretKey());
}

// 校验失败（过期 / 签名不对 / 格式错）统一返回 null。
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string") return null;
    return { userId: payload.sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}
