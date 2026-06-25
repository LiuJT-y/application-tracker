# CLAUDE.md

秋招投递记录工具。个人用的求职全链路管理:投递看板 + 转化漏斗 + AI 面试复盘。
配套有一个已经写好的 Chrome 插件(JD/简历匹配分析),要接进来当「岗位收集器」。

## 技术栈

Next.js 16 (App Router) · React 19 · TypeScript · Prisma 6 + Neon Postgres · Tailwind v4 · @dnd-kit。

## 当前进度

已完成第一步~第四步;并完成「多用户 + 用户自带 LLM key」改造(JWT 鉴权 / 所有表 userId 隔离 / 设置页 localStorage 存 key)。
**接下来**是路线图「之后」那批(岗位详情页 / 简历版本管理 / 日程待办)。

## 项目结构

```
prisma/schema.prisma          5 张核心表 + 枚举
prisma/seed.ts                示例数据
lib/prisma.ts                 Prisma client 单例
lib/types.ts                  状态/渠道/优先级元数据 + Application 类型（前端与插件共用)
app/api/applications/         GET 列表 / POST 新建（POST 是插件入口）
app/api/applications/[id]/    PATCH 更新（换状态自动写时间线）/ DELETE
app/api/applications/[id]/reviews/  GET 列复盘 / POST 提交复盘表单（调模型链）
app/api/reviews/[id]/         DELETE 单条复盘
lib/ai/client.ts              模型链：AI_PROVIDER_ORDER 链路 fallback（gpt/qwen/deepseek）
lib/ai/reviewParser.ts        拼 prompt + 健壮解析 8 维度评分（仿 PreferenceParser）
app/board/page.tsx            看板页
app/review/page.tsx           AI 面试复盘页
components/KanbanBoard.tsx    拖拽逻辑（dnd-kit）+ 乐观更新
components/ApplicationCard.tsx
components/AddApplicationDialog.tsx
components/ReviewPanel.tsx    复盘结构化表单 + 评分展示 + 历史列表

—— 多用户 + 用户自带 LLM key ——
lib/auth/{hash,jwt,session}.ts  bcrypt / jose 签发校验 / cookie→userId（getCurrentUserId·getRequestUserId）
proxy.ts                      页面守卫（Next 16 proxy 约定）：未登录跳 /login，已登录访问登录页跳 /board
app/api/auth/                 register / login / logout / me
app/login·register/page.tsx   登录 / 注册（共用 components/AuthForm.tsx）
components/UserMenu.tsx        顶栏：当前用户 + 设置 + 退出
lib/llmConfig.ts              LLM key localStorage 读写 + 请求头（x-llm-*）
app/settings/page.tsx         填 LLM key（存 localStorage）+ 展示插件 token
app/api/ai/test/              测试 LLM 连接
```

## 约定

- 状态机定义在 `lib/types.ts` 的 `STATUS_ORDER`,共 6 列:`SAVED APPLIED OA INTERVIEWING OFFER REJECTED`。改状态文案/颜色只动这一处。
- 几面(一面/二面/终面)不单独建状态,统一 `INTERVIEWING` + `currentStage` 自由文本字段。
- 转化漏斗、渠道对比**不要单独建表**,对 `Application` 做聚合查询。
- 数据洞察(漏斗/面试率)按**当前面板状态**算,不翻 `StatusEvent` 历史取最大值——否则拖错又拖回的中间态会被记上。REJECTED 用 `currentStage`(第几次面试)还原面试进度;没往后记录的默认就当挂在当前这步。见 `app/api/insights/route.ts` 的 `reachedIndex`。
- 状态每次变化都要写一条 `StatusEvent`(PATCH 接口已经在做)。
- 中文 UI,代码注释中文 OK。
- **前端风格走赛博 HUD 风(霓虹高亮 + 深空暗背景 + 辉光)**。颜色/字体的唯一真源是 `app/globals.css` 的 `@theme` 块(CSS 变量),组件里别散落硬编码色,统一 `var(--color-…)`:
  - 背景/面板:`--color-space`(页面底)、`--color-panel`(卡片半透明底);描边/网格线 `--color-line`(很淡)。
  - 霓虹主色:`--color-neon-cyan`(#00F0FF,主强调/标题/主按钮)、`--color-neon-green`(#00FFA3,成功/高分)、`--color-neon-magenta`(#FF2E97,错误/低分)、`--color-neon-purple`。文字 `--color-txt` / `--color-txt-dim`。
  - 字体:标题用 `font-display`(Orbitron,大写 + `tracking-[0.18em]` + `.text-glow`),正文 `font-sans`,数字/数据 `font-mono`(JetBrains)。
  - 圆角:卡片/弹窗 `rounded-xl`,输入框/按钮 `rounded-lg`。
  - 页头统一:`flex items-center justify-between`,左侧霓虹青大写标题 + `.text-glow`,副标题走 `// …` 的暗字注释风。
  - 输入框/下拉:`rounded-lg border bg-[#0d1322] px-3 py-2 text-sm text-[#E6F1FF] placeholder:text-[#8B9CB8] border-[rgba(139,156,184,0.2)] focus:border-[#00F0FF]` + `transition-colors`。
  - 按钮:次级 = 软边框(`border-[var(--color-line)]`)+ `text-[var(--color-txt-dim)]` + hover;主操作 = `bg-[var(--color-neon-cyan)] text-[#04121a] font-medium` + 青色辉光阴影 `0 0 16px rgba(0,240,255,0.4)`。
  - **进度色唯一真源:`lib/types.ts` 的 `STATUS_META[status].dot/text`**(灰→紫→蓝→琥珀→青→红)。按状态上色取 `dot`,淡背景用 `${dot}0d`(hover/选中 `${dot}1f~24`),不要另写一套。漏斗/面试率图同样复用这套色。
  - 动效工具类:`.text-glow`(currentColor 辉光)、`.animate-pulse-glow`(数字呼吸)、`.hud-sweep`(hover 流光);都已尊重 `prefers-reduced-motion`。

## 路线图(按这个顺序往下做)

- [x] 第一步:投递看板 MVP
- [x] 第二步:接 Chrome 插件 —— 插件抓 JD + 算匹配分后 POST 到 `/api/applications`(契约见下)。插件复用现有那个匹配分析项目的代码。
- [x] 第三步:AI 面试复盘 —— `/review` 页填结构化表单(岗位/轮次/形式 + 面试问答 + 卡壳 + 自我感受),服务端拼成文本丢给模型链返回结构化 JSON(8 维度评分 + 优势 + 待改进 + 改进计划),存进 `InterviewReview`。沿用 K12 项目里 `PreferenceParser` 那套结构化输出写法,模型优先级链 gpt → Qwen → DeepSeek 兜底(读 `AI_PROVIDER_ORDER`)。
- [x] 第四步:数据洞察 —— `/insights` 页:漏斗 / 渠道面试率 / 简历版本面试率,聚合查询 + Recharts。看板顶栏有入口。
- [ ] 之后:岗位详情页(时间线、复盘、日程)、简历版本管理页、日程待办视图。

## 多用户 + 用户自带 LLM key(已完成)

参考开源项目 offerFlow-llm-feature:JWT+bcrypt 多用户、数据按 userId 隔离;AI key 用户在设置页自填、存浏览器 localStorage,复盘**随请求发到服务端、用完即弃**(不入库、不打日志),支持任意 OpenAI 兼容接口。分六阶段,每完成一步打勾:

- [x] 阶段 0:依赖 + 数据地基 —— 加 `bcryptjs` + `jose`;schema 加 `User` 模型,给 `Application/ResumeVersion/InterviewReview/ScheduleItem/StatusEvent` 各加 `userId` + `@@index([userId])`;`seed.ts` 建 bootstrap 用户(`demo@job-tracker.local`/`demo1234`)并挂上示例数据。
- [x] 阶段 1:鉴权后端(不动业务路由)—— `lib/auth/`(hash.ts/jwt.ts/session.ts:`getCurrentUserId()`+`unauthorized()`);`/api/auth/register|login|logout|me` 路由,JWT 写 httpOnly cookie。curl 已验证全链路。
- [x] 阶段 2:userId 落到所有查询 —— 业务路由用 `getCurrentUserId()` 后按 userId 过滤/写入;`PATCH/DELETE [id]` 用 `findFirst{id,userId}`/`deleteMany{id,userId}` 防越权(越权返 404),PATCH 还剥掉客户端传的 `id/userId`;`POST /api/applications` 用 `getRequestUserId()` 接**插件 token 鉴权**(认 cookie 或 `Authorization: Bearer <apiToken>`);`reviews`/`insights` 均按 userId 过滤;`lib/cors.ts` 允许头加 `Authorization`。curl 已验证鉴权 + 跨用户隔离。
- [x] 阶段 3:鉴权前端 —— `components/AuthForm.tsx`(login/register 共用)+ `/login` `/register` 页;`proxy.ts`(Next 16 proxy 约定,jose 校验 cookie,Edge 安全)未登录跳 `/login?redirect=`、已登录访问登录页跳 `/board`;`components/UserMenu.tsx`(拉 `/api/auth/me`,昵称/邮箱 + 设置 + 退出)注入看板/复盘/洞察三处顶栏。curl 已验证重定向 + 登录/登出。`/settings` 留到阶段 4。
- [x] 阶段 4:设置页 + localStorage LLM key —— `lib/llmConfig.ts`(localStorage 读写 + `llmHeaders()` + 头名常量);`/settings` 页填 `apiKey/baseUrl/model`(保存/测试连接/清除)并展示插件 `apiToken` 可复制;`ReviewPanel` 提交带请求头 `x-llm-key/x-llm-base-url/x-llm-model`;`client.ts` 加 `LlmOverride`+`overrideFromHeaders()`+`chatJSON(msgs, override?)`(有 override 只用它、失败抛错;无则落 env 链),`reviewParser.parseReview(t, override?)` 透传;`POST /api/ai/test` 验证连接。curl 验证:env 兜底→provider gpt、override→provider user、坏 key→502、复盘整链路落库成功。
- [x] 阶段 5:收尾 —— `lib/cors.ts` 用 `CORS_ALLOW_ORIGIN` env 可收紧来源(默认 `*`,因插件走 Bearer token 不依赖 cookie,放开安全);`.env.example` 补 `JWT_SECRET`/种子账号/`CORS_ALLOW_ORIGIN` 并标 env LLM key 为可选兜底;两份 CLAUDE.md「项目结构 / 插件契约 / 多用户」章节更新为已完成;`middleware.ts` 迁到 Next 16 的 `proxy.ts`(导出 `proxy`)。`next build` 通过。

## 插件接入契约(第二步)

插件只需要往这个接口发一条 POST,就能把当前浏览的岗位存成投递记录:

```
POST /api/applications
Content-Type: application/json
Authorization: Bearer <在设置页复制的 apiToken>

{
  "company":    "拓竹科技",        // 必填
  "position":   "项目管理（整机）", // 必填
  "city":       "深圳",
  "salaryRange":"-",
  "channel":    "OFFICIAL",       // REFERRAL|OFFICIAL|HEADHUNTER|SOCIAL|OTHER
  "priority":   "MEDIUM",         // LOW|MEDIUM|HIGH
  "jobLink":    "https://...",
  "jdText":     "岗位 JD 原文……",  // 插件抓到的 JD
  "matchScore": 82,               // 插件算出的匹配分 0-100
  "status":     "SAVED"           // 通常存成「感兴趣」,投了再拖到已投递
}
```

返回 201 + 新建的 application 对象。**接口已加鉴权**:POST 需带 `Authorization: Bearer <apiToken>`(在设置页复制),记录落到该 token 对应用户名下;没带或 token 不对返回 401。剩下插件侧加一个「保存到投递记录」按钮。

## 多用户(已完成)

JWT+bcrypt 多用户、数据按 userId 隔离已落地(见上面「多用户 + 用户自带 LLM key」路线图)。约定:

1. 所有业务表都有 `userId`;新增任何表 / 写入记录都要带上当前用户(含 `StatusEvent` 这类子表)。
2. 鉴权用 httpOnly cookie 里的 JWT(`lib/auth`)。路由里 `getCurrentUserId()` 拿当前用户;插件入口 `POST /api/applications` 用 `getRequestUserId()` 兼容 `Authorization: Bearer <apiToken>`。所有查询 / 改删按 userId 过滤(改删用 `findFirst` / `deleteMany {id,userId}`,越权返 404),PATCH 还会剥掉客户端传的 `id/userId`。
3. 插件接口已带 token 鉴权。新增页面记得受 `proxy.ts` 守卫(默认所有非 `/api`、非 `/login·/register` 页都要登录)。

别在业务代码里散落硬编码的用户假设。

## 还没有补充qwen和deepseek的key，目前只有gpt
