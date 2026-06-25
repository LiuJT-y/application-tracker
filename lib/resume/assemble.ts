// 把一个简历版本（按 order 排好的素材条目）拼成干净的纯文本简历，供 AI 复盘注入用。
// 按类型分块（个人简介 / 经历 / 项目 / 教育 / 技能 / 其他）。
// 红线：必须带 userId 过滤，只取属于该用户的版本与条目。

import { prisma } from "@/lib/prisma";
import { RESUME_ITEM_ORDER, RESUME_ITEM_META, type ResumeItemType } from "@/lib/types";

// 分块标题（比 META.label 更适合做简历章节名）
const SECTION_TITLE: Record<ResumeItemType, string> = {
  PROFILE: "个人简介",
  EXPERIENCE: "工作 / 实习经历",
  PROJECT: "项目经历",
  EDUCATION: "教育经历",
  SKILL: "技能",
  OTHER: "其他",
};

type AssembledItem = {
  type: ResumeItemType;
  title: string;
  org: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  tags: string[];
};

// 单条目拼成一段文本。
function renderItem(it: AssembledItem): string {
  const head: string[] = [it.title];
  if (it.org) head.push(it.org);
  if (it.location) head.push(it.location);
  const range =
    it.startDate && it.endDate
      ? `${it.startDate} – ${it.endDate}`
      : it.startDate || it.endDate || "";
  const titleLine = range ? `${head.join(" · ")}（${range}）` : head.join(" · ");

  const lines = [titleLine];
  if (it.description?.trim()) lines.push(it.description.trim());
  if (it.tags.length) lines.push(`标签：${it.tags.join("、")}`);
  return lines.join("\n");
}

// 返回纯文本简历；版本不存在 / 不属于该用户 / 没有任何条目 → 返回 null（让上层维持「不注入」现状）。
export async function assembleResumeText(
  versionId: string,
  userId: string
): Promise<string | null> {
  const links = await prisma.resumeVersionItem.findMany({
    where: { versionId, userId },
    orderBy: { order: "asc" },
    include: { item: true },
  });
  if (links.length === 0) return null;

  const items: AssembledItem[] = links.map((l) => ({
    type: l.item.type as ResumeItemType,
    title: l.item.title,
    org: l.item.org,
    location: l.item.location,
    startDate: l.item.startDate,
    endDate: l.item.endDate,
    description: l.item.description,
    tags: l.item.tags,
  }));

  // 按类型分块，块内保持原有 order。
  const blocks: string[] = [];
  for (const type of RESUME_ITEM_ORDER) {
    const inType = items.filter((it) => it.type === type);
    if (inType.length === 0) continue;
    const body = inType.map(renderItem).join("\n\n");
    blocks.push(`## ${SECTION_TITLE[type] ?? RESUME_ITEM_META[type].label}\n${body}`);
  }

  const text = blocks.join("\n\n").trim();
  return text || null;
}
