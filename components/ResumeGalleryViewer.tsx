"use client";

import { useEffect, useRef, useState } from "react";
import PdfImage from "@/components/PdfImage";
import { loadVersionPdf } from "@/lib/pdf/render";
import { type ResumeVersionSummary } from "@/lib/types";

const dim = { color: "var(--color-txt-dim)" } as const;
const secondaryBtn = "rounded-lg border px-3 py-1.5 text-sm transition-colors";
const secondaryStyle = {
  borderColor: "var(--color-line)",
  color: "var(--color-txt-dim)",
} as const;

// 内层逐页查看：竖向滚动翻页，顶部「第 x / N 页」，可返回画廊、下载原 PDF。
export default function ResumeGalleryViewer({
  version,
  onBack,
}: {
  version: ResumeVersionSummary;
  onBack: () => void;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [current, setCurrent] = useState(1);
  const [failed, setFailed] = useState(false);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pdfUrl = `/api/resume-versions/${version.id}/pdf`;

  // 先加载 document 拿总页数。
  useEffect(() => {
    let cancelled = false;
    loadVersionPdf(version.id)
      .then((doc) => !cancelled && setNumPages(doc.numPages))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [version.id]);

  // 滚动时跟踪「当前页」：取视口里可见比例最高的那页。
  useEffect(() => {
    if (!numPages) return;
    const io = new IntersectionObserver(
      (entries) => {
        let best: { page: number; ratio: number } | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const page = Number((e.target as HTMLElement).dataset.page);
          if (!best || e.intersectionRatio > best.ratio) {
            best = { page, ratio: e.intersectionRatio };
          }
        }
        if (best) setCurrent(best.page);
      },
      { threshold: [0.25, 0.5, 0.75] }
    );
    pageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [numPages]);

  return (
    <div>
      {/* 顶部工具条 */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={onBack} className={secondaryBtn} style={secondaryStyle}>
          ← 返回画廊
        </button>
        <div className="min-w-0">
          <div
            className="truncate font-display text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-txt)" }}
            title={version.name}
          >
            {version.name}
          </div>
          {numPages != null && (
            <div className="font-mono text-xs" style={dim}>
              第 {current} / {numPages} 页
            </div>
          )}
        </div>
        <a
          href={pdfUrl}
          download={version.pdf?.filename ?? "resume.pdf"}
          className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
          style={{
            color: "#04121a",
            background: "var(--color-neon-cyan)",
            boxShadow: "0 0 16px rgba(0,240,255,0.4)",
          }}
        >
          下载原 PDF
        </a>
      </div>

      {failed ? (
        <div
          className="rounded-xl border border-dashed py-16 text-center text-sm"
          style={{ borderColor: "var(--color-line)", color: "#FF2E97" }}
        >
          PDF 解析失败，文件可能已损坏。可尝试在「简历版本」里重新上传。
        </div>
      ) : numPages == null ? (
        <p className="text-sm" style={dim}>
          加载中…
        </p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              data-page={pageNum}
              ref={(el) => {
                pageRefs.current[pageNum - 1] = el;
              }}
              className="w-full max-w-3xl overflow-hidden rounded-lg border"
              style={{ borderColor: "var(--color-line)", background: "#fff" }}
            >
              <PdfImage
                versionId={version.id}
                pageNum={pageNum}
                width={1000}
                imgClassName="block w-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
