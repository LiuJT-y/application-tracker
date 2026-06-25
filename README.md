# 秋招投递记录工具

个人求职全链路管理:投递看板 + 转化漏斗 + AI 面试复盘,配套接 JD/简历匹配插件。

> 给 Claude Code 的上下文、约定和路线图都在 `CLAUDE.md`,打开项目它会自动读。

## 跑起来

1. 装依赖

   ```bash
   npm install
   ```

2. 建一个 Neon Postgres 免费库(https://neon.tech),复制连接串:

   ```bash
   cp .env.example .env
   # 把 .env 里的 DATABASE_URL 换成你的 Neon 连接串
   ```

3. 建表 + 灌示例数据

   ```bash
   npx prisma db push      # 按 schema 建表
   npm run db:seed         # 写入 6 条示例投递
   ```

4. 启动

   ```bash
   npm run dev
   ```

   打开 http://localhost:3000 自动跳到看板。拖卡片换状态,右上角加岗位。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run db:push` | 把 schema 改动同步到数据库 |
| `npm run db:seed` | 灌示例数据 |
| `npm run db:studio` | Prisma Studio 可视化看库 |

## 已实现

投递看板(拖拽换状态、乐观更新)、Application 增删改查、状态时间线、添加岗位弹窗。

接下来要做的(插件接入、AI 面试复盘、数据洞察)见 `CLAUDE.md` 的路线图。
