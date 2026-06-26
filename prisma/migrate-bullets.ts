// 一次性数据迁移：把旧 ResumeItem 的 description（单段正文）拆成结构化 bullets（多条要点）。
// 幂等：只处理 bullets 仍为空的条目，重复跑不会重复拆、不会覆盖已有 bullets。
// 运行：npx tsx prisma/migrate-bullets.ts  （或 npm run db:migrate-bullets）
//
// 不删除 description（过渡保留）；旧条目迁移后用 bullets 展示，description 仍在库里兜底。

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 把一段正文拆成要点：按换行分行，去掉行首的 ◦/•/-/–/—/* 项目符号与空白，丢弃空行。
function splitToBullets(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s]*[◦•·\-–—*]+[\s]*/u, "").trim())
    .filter((line) => line.length > 0);
}

async function main() {
  // 只取 bullets 为空的条目（幂等核心）。description 为空的会得到空数组。
  const items = await prisma.resumeItem.findMany({
    where: { bullets: { isEmpty: true } },
    select: { id: true, description: true },
  });

  console.log(`[migrate-bullets] 待处理（bullets 为空）条目：${items.length} 条`);

  let filled = 0;
  let emptied = 0;
  for (const it of items) {
    const bullets = it.description ? splitToBullets(it.description) : [];
    if (bullets.length === 0) {
      emptied += 1;
      continue; // 没正文可拆，保持空数组，无需写库
    }
    await prisma.resumeItem.update({
      where: { id: it.id },
      data: { bullets },
    });
    filled += 1;
  }

  console.log(
    `[migrate-bullets] 完成：${filled} 条已拆成 bullets，${emptied} 条无正文（保持空数组）。`
  );
}

main()
  .catch((e) => {
    console.error("[migrate-bullets] 失败：", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
