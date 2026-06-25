// 投递「到达过的阶段」判定 —— insights 页与简历版本面试率共用这套逻辑，别各写一份。
// 只看当前面板状态，不翻 StatusEvent 历史（拖错又拖回不污染统计）；
// 唯一例外：REJECTED 本身不带进度，用 currentStage（第几次面试）还原它挂之前到过哪一步。

import { STAGE_INDEX, type Status } from "@/lib/types";

// currentStage 自由文本里带「面 / 轮 / interview」就算这条投递「到过面试」。
export function reachedInterview(currentStage: string | null): boolean {
  return !!currentStage && /面|轮|interview/i.test(currentStage);
}

// 一条投递「到达过的阶段」序号。
export function reachedIndex(status: Status, currentStage: string | null): number {
  if (status !== "REJECTED") return STAGE_INDEX[status];
  // 已结束：currentStage 标明了面试轮次 → 算到过面试；否则只能确认它投过(APPLIED)。
  return reachedInterview(currentStage) ? STAGE_INDEX.INTERVIEWING : STAGE_INDEX.APPLIED;
}
