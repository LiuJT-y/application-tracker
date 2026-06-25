"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  STATUS_ORDER,
  STATUS_META,
  type Application,
  type Status,
} from "@/lib/types";
import Link from "next/link";
import ApplicationCard from "./ApplicationCard";
import AddApplicationDialog from "./AddApplicationDialog";
import MetricsBar from "./MetricsBar";
import UserMenu from "./UserMenu";

function DroppableColumn({
  status,
  count,
  collapsed = false,
  onToggle,
  isFlashing = false,
  children,
}: {
  status: Status;
  count: number;
  collapsed?: boolean;
  onToggle?: () => void;
  isFlashing?: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];
  const rejected = status === "REJECTED";

  // 面板描边 / 辉光优先级：拖入中 > 落入闪烁 > 常态
  const panelStyle = {
    background: "var(--color-panel)",
    borderColor: isOver || isFlashing ? meta.dot : "var(--color-line)",
    boxShadow: isOver
      ? `0 0 20px ${meta.dot}40, inset 0 0 24px ${meta.dot}12`
      : isFlashing
        ? `0 0 22px ${meta.dot}66, inset 0 0 24px ${meta.dot}1f`
        : "inset 0 0 30px rgba(0,0,0,0.28)",
  } as const;

  // Rejected 折叠态：只占很窄一条，竖排标签，点击展开（仍可作为拖放目标）
  if (rejected && collapsed) {
    return (
      <div className="flex min-w-0 flex-col">
        <div className="mb-2.5 h-[26px]" />
        <button
          ref={setNodeRef}
          onClick={onToggle}
          title="展开「已结束」"
          className="flex min-h-[140px] flex-1 cursor-pointer flex-col items-center gap-3 rounded-xl border p-2 backdrop-blur-md transition-all duration-200"
          style={{ ...panelStyle, opacity: isOver || isFlashing ? 1 : 0.7 }}
        >
          <span
            className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold"
            style={{ background: `${meta.dot}1f`, color: meta.dot }}
          >
            {count}
          </span>
          <span
            className="font-display text-[12px] font-semibold uppercase tracking-wider"
            style={{ color: meta.text, writingMode: "vertical-rl" }}
          >
            {meta.en} ›
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{
            background: meta.dot,
            boxShadow: rejected ? "none" : `0 0 8px ${meta.dot}`,
          }}
        />
        <span
          className="truncate font-display text-[13px] font-semibold uppercase tracking-wider"
          style={{
            color: meta.dot,
            textShadow: rejected ? "none" : `0 0 10px ${meta.dot}55`,
          }}
        >
          {meta.en}
        </span>
        {rejected && onToggle && (
          <button
            onClick={onToggle}
            title="折叠「已结束」"
            className="shrink-0 text-[13px] leading-none transition-opacity hover:opacity-100"
            style={{ color: meta.text, opacity: 0.6 }}
          >
            ‹
          </button>
        )}
        <span
          className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold"
          style={{
            background: `${meta.dot}1f`,
            color: meta.dot,
            boxShadow: rejected ? "none" : `0 0 8px ${meta.dot}30`,
          }}
        >
          {count}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex min-h-[140px] flex-col gap-2 rounded-xl border p-2 backdrop-blur-md transition-all duration-200"
        style={panelStyle}
      >
        {count === 0 ? (
          <div
            className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-8 text-center text-[11px]"
            style={{
              borderColor: "var(--color-line)",
              color: "var(--color-txt-dim)",
              opacity: 0.5,
            }}
          >
            {isOver ? "释放以移入" : "暂无 · 拖到这里"}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  app,
  onDelete,
  onEdit,
}: {
  app: Application;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: app.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-40" : ""}
    >
      <ApplicationCard app={app} onDelete={onDelete} onEdit={onEdit} />
    </div>
  );
}

export default function KanbanBoard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  // 落入新列的边框确认闪烁
  const [flashCol, setFlashCol] = useState<Status | null>(null);
  // 「已结束」列默认折叠成窄条
  const [rejectedCollapsed, setRejectedCollapsed] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // 视觉反馈：让目标列边框闪一下（与拖拽移动逻辑解耦）
  function flashColumn(status: Status) {
    setFlashCol(status);
    setTimeout(() => setFlashCol((c) => (c === status ? null : c)), 600);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/applications");
    setApps(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = String(over.id) as Status;
    const app = apps.find((a) => a.id === active.id);
    if (!app || app.status === newStatus) return;

    flashColumn(newStatus); // 仅视觉确认，不影响下面的移动逻辑

    // 乐观更新：先改本地，再发请求
    setApps((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status: newStatus } : a))
    );
    await fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => load()); // 失败则重新拉取，回滚本地状态
  }

  // 删除一条投递：确认后乐观移除本地，再发 DELETE；失败则重新拉取回滚。
  async function removeApp(id: string) {
    if (!window.confirm("确定删除这条投递记录？此操作不可恢复。")) return;
    setApps((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/applications/${id}`, { method: "DELETE" }).catch(() =>
      load()
    );
  }

  const activeApp = apps.find((a) => a.id === activeId) ?? null;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="font-display text-xl font-bold uppercase tracking-[0.18em] text-glow"
            style={{ color: "var(--color-neon-cyan)" }}
          >
            投递看板
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-txt-dim)" }}>
            // 拖动卡片即可更新状态
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/resumes"
            className="rounded-lg border px-3 py-1.5 text-sm transition-colors"
            style={{ borderColor: "var(--color-line)", color: "var(--color-txt-dim)" }}
          >
            简历管理
          </Link>
          <Link
            href="/insights"
            className="rounded-lg border px-3 py-1.5 text-sm transition-colors"
            style={{ borderColor: "var(--color-line)", color: "var(--color-txt-dim)" }}
          >
            数据洞察
          </Link>
          <Link
            href="/review"
            className="rounded-lg border px-3 py-1.5 text-sm transition-colors"
            style={{ borderColor: "var(--color-line)", color: "var(--color-txt-dim)" }}
          >
            AI 复盘
          </Link>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
            style={{
              color: "#04121a",
              background: "var(--color-neon-cyan)",
              boxShadow: "0 0 16px rgba(0,240,255,0.4)",
            }}
          >
            + 添加岗位
          </button>
          <UserMenu />
        </div>
      </div>

      <MetricsBar />

      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-txt-dim)" }}>
          加载中…
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          {/* 六列等宽自适应：常规桌面(≥1280)六列一屏平分；窄屏退化成 3 列 / 2 列换行。
              「已结束」折叠时 xl 下把末列压成 56px 窄条，空间让给其他列。 */}
          <div
            className={`grid grid-cols-2 gap-3 pb-4 md:grid-cols-3 ${
              rejectedCollapsed
                ? "xl:grid-cols-[repeat(5,minmax(0,1fr))_56px]"
                : "xl:grid-cols-6"
            }`}
          >
            {STATUS_ORDER.map((status) => {
              const colApps = apps.filter((a) => a.status === status);
              const rejected = status === "REJECTED";
              return (
                <DroppableColumn
                  key={status}
                  status={status}
                  count={colApps.length}
                  isFlashing={flashCol === status}
                  collapsed={rejected && rejectedCollapsed}
                  onToggle={
                    rejected
                      ? () => setRejectedCollapsed((v) => !v)
                      : undefined
                  }
                >
                  {colApps.map((a) => (
                    <DraggableCard
                      key={a.id}
                      app={a}
                      onDelete={() => removeApp(a.id)}
                      onEdit={() => setEditingApp(a)}
                    />
                  ))}
                </DroppableColumn>
              );
            })}
          </div>
          <DragOverlay>
            {activeApp ? <ApplicationCard app={activeApp} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {showAdd && (
        <AddApplicationDialog
          onClose={() => setShowAdd(false)}
          onCreated={load}
        />
      )}

      {editingApp && (
        <AddApplicationDialog
          app={editingApp}
          onClose={() => setEditingApp(null)}
          onCreated={load}
        />
      )}
    </>
  );
}
