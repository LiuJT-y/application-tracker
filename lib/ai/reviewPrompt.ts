import { REVIEW_DIMENSIONS } from "@/lib/types";

// 把 8 维度的「key：中文含义」拼进提示词，保证模型用的 key 和我们一致。
const dimensionLines = REVIEW_DIMENSIONS.map(
  (d) => `    "${d.key}": <0-100 整数>,  // ${d.label}`
).join("\n");

export const REVIEW_SYSTEM_PROMPT = `你是一位资深的求职面试官 + 面试辅导教练。你会收到一段某次面试的记录（含岗位背景、面试问答、候选人自述）。
请基于这段记录，对候选人在这次面试中的表现做复盘，并严格按照以下 JSON 格式返回结果，不要包含任何其他文字、解释或 markdown 代码块标记：

{
  "scores": {
${dimensionLines}
  },
  "strengths": "<这次面试中候选人的突出优势，具体、能对应到问答细节，可分多点用换行分隔>",
  "weaknesses": "<暴露出的不足或待改进之处，具体可执行，可分多点用换行分隔>",
  "improvement": "<针对性的改进建议 / 下次怎么准备，具体可执行，可分多点用换行分隔>"
}

评分要求：分数为 0-100 的整数，越高越好；评价请紧扣记录中的实际内容，不要泛泛而谈、不要编造记录中没有的信息。`;

// 把岗位上下文 + 面试记录拼成给模型的 user message。
export function buildReviewUserMessage(args: {
  company?: string | null;
  position?: string | null;
  jdText?: string | null;
  transcript: string;
}): string {
  const ctx: string[] = [];
  if (args.company) ctx.push(`公司：${args.company}`);
  if (args.position) ctx.push(`岗位：${args.position}`);
  if (args.jdText) ctx.push(`岗位 JD：\n${args.jdText}`);
  const ctxBlock = ctx.length ? `【岗位背景】\n${ctx.join("\n")}\n\n` : "";
  return `${ctxBlock}【面试记录】\n${args.transcript}`;
}
