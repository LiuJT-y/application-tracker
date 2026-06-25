// CORS 头：给 Chrome 插件(chrome-extension:// 来源)跨域访问接口用。
// 插件走 Authorization: Bearer <apiToken> 鉴权（不依赖 cookie），所以默认放开 origin(*)是安全的
// —— 浏览器不会把站点 cookie 凭证发到 * 的跨域目标，不存在借此越权的风险。
// 想收紧时设 CORS_ALLOW_ORIGIN=chrome-extension://<你的插件ID>。
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": process.env.CORS_ALLOW_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
