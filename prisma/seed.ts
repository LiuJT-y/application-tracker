import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// bootstrap 用户：现有示例数据全部挂到它名下（多用户改造后所有表都要 userId）。
// 邮箱/密码可用环境变量覆盖，默认 demo 账号方便本地登录。
const SEED_EMAIL = process.env.SEED_USER_EMAIL ?? "demo@job-tracker.local";
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "demo1234";

const samples = [
  {
    company: "拓竹科技",
    position: "项目管理（整机）",
    city: "深圳",
    channel: "OFFICIAL",
    priority: "MEDIUM",
    status: "APPLIED",
    matchScore: 82,
  },
  {
    company: "阿里云",
    position: "后端开发",
    city: "杭州",
    channel: "REFERRAL",
    priority: "MEDIUM",
    status: "APPLIED",
    matchScore: 71,
  },
  {
    company: "字节跳动",
    position: "前端开发",
    city: "北京",
    channel: "OFFICIAL",
    priority: "HIGH",
    status: "OA",
    matchScore: 88,
  },
  {
    company: "腾讯",
    position: "全栈开发",
    city: "深圳",
    channel: "REFERRAL",
    priority: "HIGH",
    status: "INTERVIEWING",
    currentStage: "二面",
    matchScore: 79,
  },
  {
    company: "美团",
    position: "算法工程师",
    city: "北京",
    channel: "OFFICIAL",
    priority: "MEDIUM",
    status: "INTERVIEWING",
    currentStage: "一面",
    matchScore: 68,
  },
  {
    company: "某独角兽",
    position: "ML 实习",
    city: "上海",
    channel: "REFERRAL",
    priority: "HIGH",
    status: "OFFER",
    matchScore: 91,
  },
];

async function main() {
  // upsert bootstrap 用户，拿到 userId
  const user = await prisma.user.upsert({
    where: { email: SEED_EMAIL },
    update: {},
    create: {
      email: SEED_EMAIL,
      passwordHash: await bcrypt.hash(SEED_PASSWORD, 10),
      name: "Demo",
    },
  });

  for (const s of samples) {
    await prisma.application.create({
      data: {
        ...(s as any),
        userId: user.id,
        appliedAt: s.status === "SAVED" ? null : new Date(),
        statusEvents: {
          create: { status: s.status as any, note: "种子数据", userId: user.id },
        },
      },
    });
  }
  console.log(
    `已写入用户 ${SEED_EMAIL}（密码 ${SEED_PASSWORD}）+ ${samples.length} 条示例投递记录`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
