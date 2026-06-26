// 状态 / 渠道 / 优先级的元数据：标签、颜色、看板列顺序。
// 前端和插件都从这里取，保证一致。

export const STATUS_ORDER = [
  "SAVED",
  "APPLIED",
  "OA",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
] as const;

export type Status = (typeof STATUS_ORDER)[number];

// 赛博 HUD 配色：dot = 该状态的霓虹色（发光、描边、标签都取它），
// en = 看板列上显示的英文阶段名（只改显示，不动枚举值），
// text = 暗背景下可读的文字色（一般等于 dot，REJECTED 单独压暗）。
export const STATUS_META: Record<
  Status,
  { label: string; en: string; dot: string; text: string }
> = {
  SAVED: { label: "感兴趣", en: "Wishlist", dot: "#8B9CB8", text: "#8B9CB8" },
  APPLIED: { label: "已投递", en: "Applied", dot: "#00F0FF", text: "#00F0FF" },
  OA: { label: "笔试 / OA", en: "OA / 笔试", dot: "#36C9F0", text: "#36C9F0" },
  INTERVIEWING: { label: "面试中", en: "Interview", dot: "#9D5BFF", text: "#9D5BFF" },
  OFFER: { label: "收到 Offer", en: "Offer", dot: "#00FFA3", text: "#00FFA3" },
  // 已结束：低亮度、去辉光、暗红
  REJECTED: { label: "已结束", en: "Rejected", dot: "#8A2B3A", text: "#9A4452" },
};

export const CHANNEL_META: Record<string, string> = {
  REFERRAL: "内推",
  OFFICIAL: "官网",
  HEADHUNTER: "猎头",
  SOCIAL: "社交",
  OTHER: "其他",
};

export const PRIORITY_META: Record<string, { label: string; color: string }> = {
  HIGH: { label: "高优先", color: "#A32D2D" },
  MEDIUM: { label: "中", color: "#888780" },
  LOW: { label: "低", color: "#B4B2A9" },
};

export type Application = {
  id: string;
  company: string;
  position: string;
  city: string | null;
  salaryRange: string | null;
  workMode: string | null;
  channel: string;
  priority: string;
  status: Status;
  currentStage: string | null;
  jobLink: string | null;
  jdText: string | null;
  matchScore: number | null;
  appliedAt: string | null;
  order: number;
  resumeVersionId: string | null;
  resumeVersionName?: string | null; // 看板卡片展示用（GET /api/applications 平铺）
  createdAt: string;
  updatedAt: string;
};

// ——— 简历素材库（简历管理 Part 1）———
// 简历条目类型的中文标签 + 赛博 HUD 配色（dot：标签/描边取它，淡背景用 `${dot}1f`）。
// 与 schema 的 ResumeItemType 枚举、API 的 RESUME_ITEM_TYPES 保持一致。
export const RESUME_ITEM_ORDER = [
  "PROFILE",
  "EXPERIENCE",
  "PROJECT",
  "EDUCATION",
  "SKILL",
  "OTHER",
] as const;

export type ResumeItemType = (typeof RESUME_ITEM_ORDER)[number];

export const RESUME_ITEM_META: Record<
  ResumeItemType,
  { label: string; dot: string }
> = {
  PROFILE: { label: "个人简介", dot: "#00F0FF" },
  EXPERIENCE: { label: "工作", dot: "#9D5BFF" },
  PROJECT: { label: "项目", dot: "#36C9F0" },
  EDUCATION: { label: "教育", dot: "#00FFA3" },
  SKILL: { label: "技能", dot: "#FF2E97" },
  OTHER: { label: "其他", dot: "#8B9CB8" },
};

export type ResumeItem = {
  id: string;
  type: ResumeItemType;
  title: string;
  org: string | null;
  location: string | null;
  role: string | null; // 项目/经历用：角色
  degree: string | null; // 教育用：学位/专业
  startDate: string | null;
  endDate: string | null;
  description: string | null; // 旧正文，已迁移进 bullets，过渡保留
  bullets: string[]; // 结构化要点，一条一个
  tags: string[];
  link: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

// 个人信息：每个用户全局唯一一条，独立于 ResumeItem 总表。
export type ResumeProfile = {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  github: string | null; // GitHub 主页
  linkedin: string | null; // 领英主页
};

// ——— 简历版本（简历管理 Part 2）———
// 版本来源：组合（素材库条目拼）/ 上传（PDF，Part 3）。
export type ResumeVersionSource = "COMPOSED" | "UPLOADED";

// 版本卡片用的汇总（带统计）。
export type ResumeVersionSummary = {
  id: string;
  name: string;
  note: string | null;
  isDefault: boolean;
  source: ResumeVersionSource;
  itemCount: number; // 关联的素材条目数
  applicationCount: number; // 关联的投递数（全部状态）
  total: number; // 其中「最远≥已投递」的数（面试率分母）
  interviewed: number; // 其中「最远≥面试」的数
  rate: number | null; // interviewed/total*100，1 位小数，分母 0 时 null
  itemIds: string[]; // 按 order 排好的条目 id（编辑弹窗预填用）
  // 上传的 PDF 元信息（Part 3a）。列表查询只取这些，绝不带字节。
  pdf: { filename: string; size: number } | null;
  createdAt: string;
};

// ——— 面试复盘 ———
// 8 维度评分的 key 与中文标签。模型提示词、scores JSON、前端展示都从这里取，保证一致。
export const REVIEW_DIMENSIONS = [
  { key: "overall", label: "总体表现" },
  { key: "expression", label: "表达沟通" },
  { key: "technical", label: "专业技术" },
  { key: "logic", label: "逻辑思维" },
  { key: "starStructure", label: "STAR 结构化" },
  { key: "jobMatch", label: "岗位匹配" },
  { key: "culturalFit", label: "软素质 / 文化契合" },
  { key: "pressure", label: "抗压应变" },
] as const;

export type ReviewDimension = (typeof REVIEW_DIMENSIONS)[number]["key"];

export type ReviewScores = Record<ReviewDimension, number>;

// 复盘表单里的轮次 / 形式可选项
export const INTERVIEW_STAGES = ["一面", "二面", "三面", "HR面", "终面"] as const;
export const INTERVIEW_FORMATS = ["视频", "电话", "现场", "AI 面"] as const;

export type InterviewReview = {
  id: string;
  applicationId: string;
  stage: string | null;
  format: string | null;
  scores: ReviewScores;
  strengths: string | null;
  weaknesses: string | null;
  improvement: string | null;
  rawTranscript: string | null;
  createdAt: string;
};

// 复盘表单：前端提交 / 服务端拼文本共用这个结构。
export type ReviewFormInput = {
  stage?: string;
  format?: string;
  qa?: { question: string; answer: string }[]; // 面试问答（可多组）
  stuck?: string; // 卡壳 / 答得不好的地方
  feeling?: string; // 整体自我感受
};

// 把结构化表单拼成一段可读文本，既存进 rawTranscript，也喂给模型。
export function buildTranscript(input: ReviewFormInput): string {
  const head = [input.stage, input.format].filter(Boolean).join(" · ");
  const lines: string[] = [];
  if (head) lines.push(`【${head}】`);

  const qa = (input.qa ?? []).filter((p) => p.question?.trim() || p.answer?.trim());
  qa.forEach((p, i) => {
    lines.push(`\nQ${i + 1}: ${p.question?.trim() || "（未填）"}`);
    lines.push(`A${i + 1}: ${p.answer?.trim() || "（未填）"}`);
  });

  if (input.stuck?.trim()) lines.push(`\n卡壳 / 答得不好的地方：${input.stuck.trim()}`);
  if (input.feeling?.trim()) lines.push(`\n整体自我感受：${input.feeling.trim()}`);

  return lines.join("\n").trim();
}

// ——— 数据洞察（第四步）———
// 阶段进度序号：用来算「每条投递最远到达过的阶段」。
// REJECTED 是终态而非进度，记 -1 不计进度——这样「挂掉但到过面试」的投递不会被漏算。
export const STAGE_INDEX: Record<Status, number> = {
  SAVED: 0,
  APPLIED: 1,
  OA: 2,
  INTERVIEWING: 3,
  OFFER: 4,
  REJECTED: -1,
};

// 漏斗一层：count = 落在该层的投递数，pct = 相对总投递的百分比（1 位小数，分母 0 时 null）。
export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  pct: number | null;
};

// 一行面试率：分组（渠道 / 简历版本）下「到过面试数 / 投递数」。
export type RateRow = {
  key: string;
  label: string;
  total: number; // 该分组「最远≥APPLIED」的投递数（真正投出去的）
  interviewed: number; // 其中「最远≥INTERVIEWING」的数
  rate: number | null; // interviewed/total*100，1 位小数，分母 0 时 null
};

export type InsightsResponse = {
  funnel: FunnelStage[];
  channelRates: RateRow[];
  resumeRates: RateRow[];
};
