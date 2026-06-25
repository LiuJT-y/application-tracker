"use client";

import { useEffect, useRef, useState } from "react";
import PdfImage from "@/components/PdfImage";
import ResumeGalleryViewer from "@/components/ResumeGalleryViewer";
import { type ResumeVersionSummary } from "@/lib/types";

const dim = { color: "var(--color-txt-dim)" } as const;

// PDF 画廊：横滑浏览所有【有 PDF】的版本，每版用首页当封面；点进去逐页看。
export default function ResumeGalleryPanel() {
  const [versions, setVersions] = useState<ResumeVersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ResumeVersionSummary | null>(null);
  // 各版本总页数（PdfImage 渲染封面时回传）。
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/resume-versions")
      .then((r) => (r.ok ? r.json() : []))
      .then((vs: ResumeVersionSummary[]) => setVersions(vs.filter((v) => v.pdf)))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, []);

  // 鼠标按住拖动横向滚动（移动端用原生触摸滚动即可）。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let startLeft = 0;
    const onDown = (e: MouseEvent) => {
      down = true;
      startX = e.pageX;
      startLeft = el.scrollLeft;
      el.style.cursor = "grabbing";
    };
    const onMove = (e: MouseEvent) => {
      if (!down) return;
      el.scrollLeft = startLeft - (e.pageX - startX);
    };
    const onUp = () => {
      down = false;
      el.style.cursor = "grab";
    };
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [loading, selected]);

  if (selected) {
    return <ResumeGalleryViewer version={selected} onBack={() => setSelected(null)} />;
  }

  if (loading) {
    return (
      <p className="text-sm" style={dim}>
        加载中…
      </p>
    );
  }

  if (versions.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed py-16 text-center text-sm"
        style={{ borderColor: "var(--color-line)", color: "var(--color-txt-dim)" }}
      >
        // 还没有上传过 PDF 的简历版本。去「简历版本」给某一版传一份 PDF，这里就能横滑预览了
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm" style={dim}>
        // 横向拖动浏览各版本简历，点封面进入逐页查看
      </p>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4"
        style={{ cursor: "grab", scrollbarWidth: "thin" }}
      >
        {versions.map((v) => {
          const pages = pageCounts[v.id];
          return (
            <button
              key={v.id}
              onClick={() => setSelected(v)}
              className="group flex w-[240px] shrink-0 flex-col overflow-hidden rounded-xl border text-left transition-all hover:-translate-y-0.5"
              style={{
                borderColor: v.isDefault ? "rgba(0,240,255,0.4)" : "var(--color-line)",
                background: "var(--color-panel)",
                boxShadow: v.isDefault ? "0 0 16px rgba(0,240,255,0.12)" : undefined,
              }}
            >
              {/* 首页封面（懒渲染） */}
              <div
                className="relative aspect-[1/1.414] w-full overflow-hidden"
                style={{ background: "#fff" }}
              >
                <PdfImage
                  versionId={v.id}
                  pageNum={1}
                  width={480}
                  onMeta={(n) =>
                    setPageCounts((prev) => (prev[v.id] === n ? prev : { ...prev, [v.id]: n }))
                  }
                  className="h-full w-full"
                  imgClassName="block h-full w-full object-contain"
                />
                {v.isDefault && (
                  <span
                    className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase"
                    style={{
                      color: "var(--color-neon-cyan)",
                      background: "rgba(4,18,26,0.85)",
                      boxShadow: "0 0 8px rgba(0,240,255,0.25)",
                    }}
                  >
                    默认
                  </span>
                )}
              </div>

              {/* 版本名 + 页数 */}
              <div className="border-t p-3" style={{ borderColor: "var(--color-line)" }}>
                <div
                  className="truncate font-display text-sm font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-txt)" }}
                  title={v.name}
                >
                  {v.name}
                </div>
                <div className="mt-0.5 font-mono text-xs" style={dim}>
                  {pages != null ? `共 ${pages} 页` : "…"}
                  {v.pdf ? ` · ${v.pdf.filename}` : ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
