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
prisma/schema.prisma          9 张核心表 + 枚举（含 ResumeItem 素材库 / ResumeVersionItem 关联表 / ResumeFile PDF 字节 / ResumeProfile 个人信息）
prisma/seed.ts                示例数据
prisma/migrate-bullets.ts     一次性迁移：ResumeItem.description（旧正文）→ bullets[]（幂等）
lib/prisma.ts                 Prisma client 单例
lib/types.ts                  状态/渠道/优先级元数据 + Application / ResumeItem / ResumeVersionSummary / ResumeProfile 类型
lib/insights.ts               投递「到达过的阶段」判定（reachedIndex）—— insights 与版本面试率共用
lib/resume/assemble.ts        assembleResumeText(versionId,userId)：版本条目→分块纯文本简历（喂 AI）
lib/resume/pdfUpload.ts       客户端 PDF 上传助手：validatePdf + uploadVersionPdf（原始字节，非 multipart）
app/api/applications/         GET 列表（平铺 resumeVersionName）/ POST 新建（POST 是插件入口）
app/api/applications/[id]/    PATCH 更新（换状态写时间线 / resumeVersionId 归属校验）/ DELETE
app/api/applications/[id]/reviews/  GET 列复盘 / POST 提交复盘（按「关联版本→默认版本」注入简历后调模型链）
app/api/reviews/[id]/         DELETE 单条复盘
app/api/resume-items/         GET 列条目（?type= 过滤）/ POST 新建（按 userId 隔离）
app/api/resume-items/[id]/    PATCH 更新 / DELETE（findFirst/deleteMany {id,userId} 防越权）
app/api/resume-versions/      GET 列版本（带条目数/关联投递数/面试率）/ POST 新建（写 ResumeVersionItem）
app/api/resume-versions/[id]/ PATCH 改名/备注/条目顺序/设默认（事务）/ DELETE（先解绑投递再删）
app/api/resume-versions/[id]/pdf/  POST 上传/替换 PDF（原始字节，校验 pdf+≤4MB，存 ResumeFile.data Bytes）/ DELETE / GET（唯一读字节，inline 预览）
app/api/resume-profile/       GET 取个人信息（无则空）/ PUT upsert（一个用户最多一条）
lib/ai/client.ts              模型链：AI_PROVIDER_ORDER 链路 fallback（gpt/qwen/deepseek）
lib/ai/reviewParser.ts        拼 prompt + 健壮解析 8 维度评分；带简历时启用富提示词（唯一活的复盘路径）
lib/pdf/render.ts             客户端 PDF.js 助手：懒加载 pdfjs + 设同源 worker + 缓存 document/页图
scripts/copy-pdf-worker.mjs   build/dev 前把 pdfjs worker 复制到 public/（同源，不走 CDN）
public/pdf.worker.min.mjs     复制来的 pdfjs worker（workerSrc 指向它）
app/board/page.tsx            看板页
app/review/page.tsx           AI 面试复盘页
app/resumes/page.tsx          简历管理：顶部个人信息卡 + tab 容器（总表 | 简历版本 | PDF 画廊）
components/ResumeProfileCard.tsx  个人信息卡（全局唯一）：展示 + 编辑，PUT /api/resume-profile
components/ResumeItemsPanel.tsx  总表（素材库）面板：表格 + 类型筛选 + 增删改
components/ResumeItemDialog.tsx  简历条目新增/编辑弹窗（按 type 动态显隐字段 + bullets 多条编辑，赛博 HUD 风）
components/ResumeVersionsPanel.tsx  简历版本面板：版本卡片（统计 + 默认徽章 + PDF 区块）+ 增删改 + 设默认
components/ResumeVersionDialog.tsx  新建/编辑版本弹窗：条目多选 + dnd-kit 拖拽排序 + 设默认
components/ResumePdfControl.tsx  版本卡片上的 PDF 上传/预览/替换/删除
components/ResumeGalleryPanel.tsx  PDF 画廊外层：横滑各版本封面（首页懒渲染）→ 点进详情
components/ResumeGalleryViewer.tsx  画廊内层：逐页竖滚 + 第 x/N 页 + 下载原 PDF
components/PdfImage.tsx       懒渲染（IntersectionObserver）某版本某页成 <img>，回传总页数
components/KanbanBoard.tsx    拖拽逻辑（dnd-kit）+ 乐观更新 + 新建/编辑岗位弹窗
components/ApplicationCard.tsx  含编辑按钮 + 展示所用简历版本名
components/AddApplicationDialog.tsx  新建/编辑岗位（含简历版本下拉，默认版本预填）
components/ReviewPanel.tsx    复盘结构化表单 + 评分展示 + 历史列表

—— 全站布局壳（赛博 HUD + 紫色高亮 accent）——
components/AppShell.tsx        挂在 app/layout.tsx：左 Sidebar + 右 main(ml-[220px])；/login·/register 不套壳（BARE_PAGES，与 proxy 的 AUTH_PAGES 一致）
components/Sidebar.tsx         左侧固定竖向侧边栏：Logo「OfferGate」+ 带图标导航（usePathname 高亮，紫胶囊+左光条）+ 底部用户卡（/api/auth/me）/设置/退出（并入原 UserMenu 逻辑，UserMenu 已删）

—— 多用户 + 用户自带 LLM key ——
lib/auth/{hash,jwt,session}.ts  bcrypt / jose 签发校验 / cookie→userId（getCurrentUserId·getRequestUserId）
proxy.ts                      页面守卫（Next 16 proxy 约定）：未登录跳 /login，已登录访问登录页跳 /board
app/api/auth/                 register / login / logout / me
app/login·register/page.tsx   登录 / 注册（共用 components/AuthForm.tsx，HUD 紫色 accent）
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
- **简历 ↔ 投递的关联只在看板侧设置**(新建/编辑岗位弹窗的「简历版本」下拉),写入 `Application.resumeVersionId`;简历管理页只读展示版本统计,不在那里给岗位分配简历。POST/PATCH `applications` 都要校验 `resumeVersionId` 归属当前用户(传别人的版本 → POST 置 null、PATCH 返 404)。
- **AI 复盘的简历注入是纯增量**:优先级「该投递关联版本 → 当前用户 `isDefault` 版本 → 都没有则不注入」;有简历才用 `assembleResumeText` 拼【候选人简历】块并升级 system prompt;**没关联也没默认版本时复盘行为与改造前逐字一致**(这是红线,改 `reviewParser` 时务必保住)。
- 复盘只有一条活路径:`reviews/route.ts` → `reviewParser.parseReview` → `client.chatJSON`。别再引入第二套(之前的 `aiService`/`reviewPrompt`/`openaiCompatClient` 死路径已删)。
- **每用户至多一个默认简历版本**:设默认(POST 带 `isDefault` / PATCH `isDefault:true`)要在同一事务里先把该用户其它版本 `isDefault` 置 false。
- **简历 PDF 字节存数据库**:放在独立的 `ResumeFile.data`(Prisma `Bytes`,SQLite/Postgres 双部署通用,**别用 Postgres 专有类型**)。红线:除下载接口 `GET .../pdf` 外,任何版本/列表查询都**绝不能 select `data` 字节**(列表只取 `file{filename,size}`),否则慢且爆内存。上传是写操作,必须校验 `application/pdf` + `%PDF-` 魔数 + `size≤4MB`(Vercel 请求体上限约 4.5MB)。
- **PDF 上传走「原始字节」不走 multipart**:`POST .../pdf` 客户端发 `Content-Type: application/pdf` + `x-filename`(encodeURIComponent)头、body 直接是 File;服务端 `req.arrayBuffer()` 读字节。**坑**:Next.js 会把 `multipart/form-data` POST 当成 Server Action 拦截,请求打不到 route handler(连接被重置 / "Failed to find Server Action")。统一用 `lib/resume/pdfUpload.ts` 的 `validatePdf` + `uploadVersionPdf`,别再写 `FormData` 上传。顶部「上传 PDF」按钮 = 先建一个同名版本再传 PDF(一步建上传式版本)。
- **PDF 渲染走 PDF.js 且只在客户端**:统一用 `lib/pdf/render.ts`(`"use client"` + dynamic import `pdfjs-dist`),别在别处 import pdfjs(会进首屏包)、别用 `<embed>/<iframe>`。worker 必须同源(`/pdf.worker.min.mjs`,由 `scripts/copy-pdf-worker.mjs` 复制,**不准从外部 CDN 加载**——大陆本机要能用)。新增/升级 `pdfjs-dist` 后 `public/` 的 worker 会在 `dev`/`build` 自动重新复制。画廊/预览要懒加载(进视口才渲染)+ 缓存,别一次渲染所有页。
- **个人信息全局唯一、单独管理**:`ResumeProfile` 每用户至多一条(`userId @unique`,`PUT /api/resume-profile` 走 upsert),**不进 `ResumeItem` 总表**,在 `/resumes` 顶部卡片编辑。生成简历时它是抬头。
- **简历条目要点用 `bullets String[]`(一条一个)**,为生成简历的结构化铺路;旧的单段 `description` 仅过渡保留(已用 `prisma/migrate-bullets.ts` 迁移),新写入走 `bullets`,**别再往 `description` 塞要点**。`role`(项目/经历角色)、`degree`(教育学位/专业)是类型特有可选字段。
- 中文 UI,代码注释中文 OK。
- **全站导航统一在 `components/Sidebar.tsx`(左侧固定栏)**:新增页面别再各自写顶栏 nav / 用户菜单,导航项加在 `Sidebar` 的 `NAV` 数组即可;页面只留标题区(`✦` + 大标题 + `// …` 副标题)。布局由 `AppShell` 包裹(挂在 `app/layout.tsx`),`/login`·`/register` 走 `BARE_PAGES` 不套壳。
- **紫色强调 `--color-accent`(#7b5cff)只做点睛**(侧边栏高亮 / 主按钮 / 标题 `✦`),cyan 仍是基底、列状态色仍走 `STATUS_META`(唯一真源不变)。
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

### 简历管理(分四部分)

- [x] Part 1 简历总表(素材库)—— `ResumeItem` 表把简历拆成可复用条目(PROFILE/EXPERIENCE/PROJECT/EDUCATION/SKILL/OTHER);`/api/resume-items` 增删改查(全部按 userId 隔离);`/resumes` 总表页(表格 + 类型筛选 pill + 新增/编辑/删除弹窗,赛博 HUD 风);看板顶栏「简历管理」入口。只做总表,不碰版本组合 / PDF。
- [x] Part 2 版本组合 + 看板关联 + AI 复盘接入 —— `ResumeVersion` 加 `isDefault/note/source(COMPOSED|UPLOADED)`;新增有序关联表 `ResumeVersionItem`;`/api/resume-versions` 增删改查(全 userId 隔离,面试率复用 `lib/insights.ts` 的 `reachedIndex`,设默认走事务、删版本先把投递 `resumeVersionId` 置 null);`/resumes` 加 tab(总表|简历版本),版本面板卡片(条目数/关联投递数/面试率/默认徽章)+ 新建/编辑弹窗(条目多选 + dnd-kit 拖拽排序 + 设默认)。**关联在看板侧设置**:`AddApplicationDialog` 双模式(新建/编辑)加简历版本下拉、新建时预填默认版本,卡片加编辑按钮 + 展示所用版本名;`applications` POST/PATCH 校验 `resumeVersionId` 归属。**AI 复盘按「该投递关联版本 → 我的默认版本 → 都没有则不注入」优先级**用 `assembleResumeText` 取纯文本简历,作为【候选人简历】块拼进 user message(超 4000 字截断),`reviewParser` 有简历时升级 system prompt(一致性/讲透度/差距分析);**没简历时行为与之前逐字一致**。顺带删掉无人引用的旧复盘死路径(`aiService.ts`/`reviewPrompt.ts`/`openaiCompatClient.ts`),统一到 `reviewParser`+`client` 一条路径。
- [x] Part 3a PDF 上传 + 存储 —— 新增 `ResumeFile` 表(`data Bytes` + filename/mimeType/size，`versionId` 唯一一对一，userId 隔离)单独存大字节,**不污染版本常规查询**;`/api/resume-versions/[id]/pdf` 三件套(POST 上传/替换 校验 `application/pdf`+≤4MB、DELETE、GET 流式 inline 预览——GET 是唯一读 `data` 字节的地方);列表接口只取 `file{filename,size}` 元信息、绝不带字节;有 PDF 时把 `source` 标 `UPLOADED`,删后回 `COMPOSED`;版本卡片上传/预览/替换/删除 UI(`ResumePdfControl`)。字节存数据库用 `Bytes`(SQLite/Postgres 通用),不用对象存储、无新环境变量。
- [x] Part 3b PDF 翻页画廊 —— `/resumes` 加「PDF 画廊」tab(`ResumeGalleryPanel`):画廊只收【有 PDF】的版本(列表接口过滤 `pdf!=null`,userId 隔离),外层横滑各版本、每版只懒渲染【首页】当封面(`PdfImage` + IntersectionObserver),点进 `ResumeGalleryViewer` 逐页竖滚(逐页懒渲染)+「第 x/N 页」+ 下载原 PDF。渲染走 **PDF.js(`pdfjs-dist` v6)**,字节从 3a 的 `GET .../pdf` 取。**worker 配置**:`scripts/copy-pdf-worker.mjs` 在 `dev`/`build` 前把 `pdfjs-dist/build/pdf.worker.min.mjs` 复制到 `public/`,`lib/pdf/render.ts` 里 `GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs'`(**同源、不走 CDN**,大陆本机可用;pdfjs v6 用 `{type:'module'}` 创建 worker,同源直连)。`pdfjs-dist` 只在 `lib/pdf/render.ts` 里 **dynamic import**,仅客户端按需加载,不进首屏包;document/页图均缓存,来回滑不重复请求/渲染。
- [x] 结构升级(地基)—— 为「分类型表单」和「生成简历」铺路:`ResumeItem` 加 `role`(项目/经历角色)、`degree`(教育学位/专业)、`bullets String[]`(结构化要点,一条一个);旧的 `description` 单段文本**保留过渡**(暂不删),用 `prisma/migrate-bullets.ts` 幂等迁移成 `bullets`(按换行 + 行首 ◦/•/-/–/—/* 拆条)。新增 `ResumeProfile` 表(每用户全局唯一 `userId @unique`)+ `/api/resume-profile`(GET/PUT upsert),`/resumes` 顶部加个人信息卡(`ResumeProfileCard`,独立于总表条目)。本次**不做分类型表单 UI**(条目弹窗仍用 description,role/degree/bullets 仅 API/字段就绪);`PROFILE` 类型选项暂留,做动态表单时再从下拉移除。
- [x] 分类型动态表单 —— `ResumeItemDialog` 按 `type` 动态显隐字段,要点改成 **bullets 多条可增删 + ↑↓ 调顺序**(保存写 `bullets`、回填优先 `bullets` 否则拆旧 `description`,保存统一把 `description` 置 null)。切换类型内容保留(只显隐)。类型下拉**已移除 `PROFILE`**(由个人信息卡接管;仅编辑遗留 PROFILE 条目时临时回显)。`assemble.ts` 改为优先用 `bullets`(+role/degree)拼简历、`description` 兜底;总表预览也优先 `bullets`。**全类型已移除「标签 tags / 链接 link」两栏**(保存时 `tags:[]`、`link:null` 清空,总表也不再有标签列/标题链接)。各类型字段对照:
  - 工作 EXPERIENCE(原「经历」,`META.label` 已改「工作」):标题(职位)、**用工类型(实习/全职/兼职,下拉,存 `role`)**、公司、地点、起止时间、**主要工作和成绩**(bullets)
  - 项目 PROJECT:标题(项目名)、角色 `role`、**组织**(org)、起止时间、**主要工作和成绩**(bullets)（无地点)
  - 教育 EDUCATION:标题(学校)、学历 `degree`、专业 `role`、地点(可选)、起止时间、要点(可选,如 GPA/荣誉)
  - 技能 SKILL:标题(分类名)、具体技能(bullets,**必填≥1**)
  - 其他 OTHER:标题、机构/地点/起止时间、要点
- [ ] Part 4 选条目生成 PDF —— 勾选条目排版导出 PDF（抬头用 `ResumeProfile`，正文用各条目 `bullets`）。

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
