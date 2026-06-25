"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  RESUME_ITEM_META,
  type ResumeItem,
  type ResumeVersionSummary,
} from "@/lib/types";

const inputCls =
  "w-full rounded-lg border bg-[#0d1322] px-3 py-2 text-sm text-[#E6F1FF] outline-none transition-colors placeholder:text-[#8B9CB8] border-[rgba(139,156,184,0.2)] focus:border-[#00F0FF]";
const labelCls = "mb-1 block text-xs";
const dim = { color: "var(--color-txt-dim)" } as const;
const secondaryBtn = "rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50";
const secondaryStyle = {
  borderColor: "var(--color-line)",
  color: "var(--color-txt-dim)",
} as const;

// 已选条目的一行（可拖拽排序）。
function SortableRow({
  item,
  index,
  onRemove,
}: {
  item: ResumeItem;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const meta = RESUME_ITEM_META[item.type];
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderColor: "var(--color-line)",
        background: isDragging ? "rgba(0,240,255,0.06)" : "var(--color-panel)",
      }}
      className="flex items-center gap-2 rounded-lg border px-2.5 py-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-sm active:cursor-grabbing"
        style={dim}
        title="拖拽排序"
        type="button"
      >
        ⠿
      </button>
      <span className="font-mono text-[11px]" style={dim}>
        {index + 1}
      </span>
      <span
        className="rounded px-1.5 py-0.5 text-[10px]"
        style={{ color: meta.dot, background: `${meta.dot}1f` }}
      >
        {meta.label}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--color-txt)" }}>
        {item.title}
        {item.org ? <span style={dim}> · {item.org}</span> : null}
      </span>
      <button
        onClick={onRemove}
        type="button"
        className="shrink-0 px-1 text-sm transition-colors hover:text-[#FF2E97]"
        style={dim}
        title="移除"
      >
        ×
      </button>
    </div>
  );
}

// 新建 = 不传 version；编辑 = 传 version（用 itemIds 预填选择与顺序）。
export default function ResumeVersionDialog({
  version,
  onClose,
  onSaved,
}: {
  version?: ResumeVersionSummary | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!version;
  const [allItems, setAllItems] = useState<ResumeItem[]>([]);
  const [name, setName] = useState(version?.name ?? "");
  const [note, setNote] = useState(version?.note ?? "");
  const [isDefault, setIsDefault] = useState(version?.isDefault ?? false);
  const [selectedIds, setSelectedIds] = useState<string[]>(version?.itemIds ?? []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetch("/api/resume-items")
      .then((r) => (r.ok ? r.json() : []))
      .then((items: ResumeItem[]) => {
        setAllItems(items);
        // 编辑时清掉已被删除的条目 id，保持顺序。
        setSelectedIds((prev) => prev.filter((id) => items.some((it) => it.id === id)));
      })
      .catch(() => {});
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, ResumeItem>();
    for (const it of allItems) m.set(it.id, it);
    return m;
  }, [allItems]);

  const selectedItems = useMemo(
    () => selectedIds.map((id) => byId.get(id)).filter((x): x is ResumeItem => !!x),
    [selectedIds, byId]
  );

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSelectedIds((prev) => {
      const from = prev.indexOf(String(active.id));
      const to = prev.indexOf(String(over.id));
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  }

  async function submit() {
    if (!name.trim()) {
      setErr("版本名为必填");
      return;
    }
    setSaving(true);
    setErr(null);
    const payload = {
      name: name.trim(),
      note: note.trim(),
      isDefault,
      itemIds: selectedIds,
    };
    const url = isEdit ? `/api/resume-versions/${version!.id}` : "/api/resume-versions";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "保存失败");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-xl border p-5"
        style={{ borderColor: "var(--color-line)", background: "var(--color-space)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="mb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-glow"
          style={{ color: "var(--color-neon-cyan)" }}
        >
          {isEdit ? "编辑版本" : "新建简历版本"}
        </h2>

        {/* 名称 / 备注 / 默认 */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} style={dim}>
              版本名 *
            </label>
            <input
              className={inputCls}
              placeholder="如：通用技术版 v1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} style={dim}>
              备注
            </label>
            <input
              className={inputCls}
              placeholder="这版主打什么"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm" style={dim}>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="accent-[#00F0FF]"
          />
          设为默认版本（看板新建投递时自动预填，AI 复盘默认用它）
        </label>

        {/* 两栏：左可选条目，右已选可拖拽 */}
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-hidden">
          {/* 可选条目 */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 text-xs" style={dim}>
              素材库条目（勾选加入）
            </div>
            <div
              className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border p-2"
              style={{ borderColor: "var(--color-line)" }}
            >
              {allItems.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs" style={dim}>
                  // 素材库还没有条目，先去「总表」新增
                </p>
              ) : (
                allItems.map((it) => {
                  const meta = RESUME_ITEM_META[it.type];
                  const checked = selectedIds.includes(it.id);
                  return (
                    <label
                      key={it.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(it.id)}
                        className="accent-[#00F0FF]"
                      />
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px]"
                        style={{ color: meta.dot, background: `${meta.dot}1f` }}
                      >
                        {meta.label}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate"
                        style={{ color: "var(--color-txt)" }}
                      >
                        {it.title}
                        {it.org ? <span style={dim}> · {it.org}</span> : null}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* 已选 + 排序 */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 text-xs" style={dim}>
              已选 {selectedItems.length} 项 · 拖拽 ⠿ 排序
            </div>
            <div
              className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-lg border p-2"
              style={{ borderColor: "var(--color-line)" }}
            >
              {selectedItems.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs" style={dim}>
                  // 从左侧勾选条目组成这一版简历
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={selectedIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {selectedItems.map((it, i) => (
                      <SortableRow
                        key={it.id}
                        item={it}
                        index={i}
                        onRemove={() => toggle(it.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          {err && (
            <span className="mr-auto text-sm" style={{ color: "#FF2E97" }}>
              {err}
            </span>
          )}
          <button onClick={onClose} className={secondaryBtn} style={secondaryStyle}>
            取消
          </button>
          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all disabled:opacity-40"
            style={{
              color: "#04121a",
              background: "var(--color-neon-cyan)",
              boxShadow: "0 0 16px rgba(0,240,255,0.4)",
            }}
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
