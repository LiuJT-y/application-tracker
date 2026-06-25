# 秋招投递追踪器 · 用户指南

个人求职全链路管理工具:**投递看板**(拖拽式状态流转)+ **转化漏斗**(数据洞察)+ **AI 面试复盘**(8 维度评分),配套一个 Chrome 插件,边浏览岗位边一键存进投递记录。

线上地址(海外可直接访问):**https://application-tracker-sepia.vercel.app/**

> 给 Claude Code 的开发上下文、约定和路线图在 `CLAUDE.md`,本文件是给使用者看的。

---

## 这工具能干嘛

| 页面 | 作用 |
| --- | --- |
| **看板** `/board` | 6 列状态:感兴趣 → 已投递 → 笔试 → 面试中 → Offer / 已挂。拖卡片换状态,自动记时间线 |
| **AI 面试复盘** `/review` | 填结构化表单(岗位 / 轮次 / 问答 / 卡壳 / 自我感受),AI 返回 8 维度评分 + 优势 + 改进计划 |
| **数据洞察** `/insights` | 转化漏斗、渠道面试率、简历版本面试率 |
| **设置** `/settings` | 填自己的 LLM key(存浏览器本地,不上传)+ 复制插件接入 token |
| **Chrome 插件** | 在招聘网站抓 JD、算简历匹配分,一键 POST 到投递记录 |

数据按账号隔离,每个用户只看得到自己的投递。

### 🔑 AI key 是怎么不泄露的

- key 由你在**设置页自填**,只存你这台浏览器的 localStorage,**不上传服务器、不入库**。
- 做复盘时,key 随该次请求以请求头发到服务端,服务端用完即弃——**不写数据库、不打日志**。
- 三种模型(GPT / Qwen / DeepSeek)都是 OpenAI 兼容接口,设置页填对应 Base URL + Model 即可任选其一,**用谁的 key 谁付费**。

---

## 方案一:直接用线上版(推荐给海外用户)

不用装任何东西,打开就用。

1. 访问 **https://application-tracker-sepia.vercel.app/**
2. 点「注册」建账号(邮箱 + 密码),登录后自动进看板。
3. 想用 AI 面试复盘 → 进**设置页**填你自己的 LLM key(OpenAI 等任意 OpenAI 兼容接口):
   - `API Key`、`Base URL`(如 `https://api.openai.com/v1/chat/completions`)、`Model`(如 `gpt-4o-mini`)
   - 点「测试连接」确认通,再保存。key 只存在你这台浏览器,不会上传。
4. 想用 Chrome 插件采集岗位 → 设置页里**复制插件 token**,填进插件配置即可。

> ⚠️ 数据库托管在 Vercel + Neon(美国区)。**中国大陆直连这个 URL 可能很慢或打不开**,服务器和数据库都在境外。大陆用户建议走方案二本地部署。

> 🔐 **部署者注意(自己 fork 部署到 Vercel 时)**:**不要**在 Vercel 环境变量里填 `OPENAI_API_KEY` / `DASHSCOPE_API_KEY` / `DEEPSEEK_API_KEY`。否则没填自己 key 的用户做复盘时会悄悄消耗*你*的 key。让每个人都在设置页填自己的 key,你的 key 就绝不会被别人用到。Vercel 上只需配 `DATABASE_URL` 和 `JWT_SECRET`。

---

## 方案二:本地部署(推荐给中国大陆用户)

整个项目跑在你自己电脑上,数据库可以用 Neon 免费库,也可以用本地 Postgres。无需翻墙访问应用本身(但 Neon 建库环节和调用境外 LLM 仍需要相应网络条件)。

### 前置

- **Node.js 20+**(`node -v` 确认)
- 一个 **Postgres 数据库**,二选一:
  - 注册 [Neon](https://neon.tech) 免费库(最省事,需要能访问 neon.tech)
  - 或本地装 Postgres,连接串形如 `postgresql://user:pass@localhost:5432/jobtracker`

### 步骤

```bash
# 1. 装依赖
npm install

# 2. 准备环境变量
cp .env.example .env
```

编辑 `.env`,至少填这两项:

```bash
# 你的 Postgres 连接串
DATABASE_URL=postgresql://...

# JWT 签名密钥(必填),生成一个随机串:
#   openssl rand -base64 32
# Windows 没有 openssl 可用 PowerShell:
#   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
JWT_SECRET=粘贴上面生成的随机串
```

其余(种子账号、CORS、服务端兜底 LLM key)都可选,留空即可——LLM key 推荐启动后在设置页里填。

```bash
# 3. 建表
npm run db:push      # 按 schema 建表

# (可选) 灌一批示例投递,方便先看看界面长啥样;只想用空库就跳过
npm run db:seed

# 4. 启动
npm run dev
```

打开 **http://localhost:3000**,点「注册」建账号(邮箱 + 密码),登录后进看板。

### AI 面试复盘的 key

大陆用户走境内大模型最方便:进**设置页**填 Qwen(阿里百炼)或 DeepSeek 的 OpenAI 兼容接口即可,例如:

| 服务 | Base URL | 示例 Model |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com/chat/completions` | `deepseek-chat` |
| Qwen / 阿里百炼 | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | `qwen-plus` |
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` |

填完点「测试连接」,通了再保存。key 只存本浏览器。

> 也可以把 key 写进 `.env` 作为服务端兜底(见 `.env.example` 的模型链配置),但设置页里填更安全、更灵活。

---

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run build` | 生产构建(含 `prisma generate`) |
| `npm run db:push` | 把 schema 改动同步到数据库 |
| `npm run db:seed` | 灌示例数据 + 建种子用户 |
| `npm run db:studio` | Prisma Studio 可视化看库 |

---

## 技术栈

Next.js 16 (App Router) · React 19 · TypeScript · Prisma 6 + Postgres · Tailwind v4 · @dnd-kit · Recharts。鉴权用 JWT + bcrypt,数据按 `userId` 隔离。
