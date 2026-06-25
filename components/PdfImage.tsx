"use client";

import { useEffect, useRef, useState } from "react";
import { loadVersionPdf, renderVersionPage } from "@/lib/pdf/render";

const dim = { color: "var(--color-txt-dim)" } as const;

// 懒渲染某版本 PDF 的某一页成 <img>。进入视口才渲染（除非 eager）。
// 通过 onMeta 把该 PDF 的总页数回传给父组件。失败给明确占位，不白屏。
export default function PdfImage({
  versionId,
  pageNum,
  width = 480,
  eager = false,
  onMeta,
  className,
  imgClassName,
}: {
  versionId: string;
  pageNum: number;
  width?: number;
  eager?: boolean;
  onMeta?: (numPages: number) => void;
  className?: string;
  imgClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  // onMeta 放 ref，避免父组件传内联函数导致渲染 effect 反复触发。
  const onMetaRef = useRef(onMeta);
  onMetaRef.current = onMeta;

  // 懒加载：进入视口（带 200px 预加载边距）才开渲染。
  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        if (onMetaRef.current) {
          const doc = await loadVersionPdf(versionId);
          if (!cancelled) onMetaRef.current?.(doc.numPages);
        }
        const url = await renderVersionPage(versionId, pageNum, width);
        if (!cancelled) {
          setSrc(url);
          setStatus("done");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, versionId, pageNum, width]);

  return (
    <div ref={ref} className={className}>
      {status === "error" ? (
        <div
          className="flex h-full min-h-[120px] w-full items-center justify-center rounded-md border border-dashed text-center text-xs"
          style={{ borderColor: "var(--color-line)", color: "#FF2E97" }}
        >
          渲染失败 / 文件损坏
        </div>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`第 ${pageNum} 页`} className={imgClassName} />
      ) : (
        <div
          className="flex h-full min-h-[120px] w-full items-center justify-center rounded-md text-xs"
          style={{ background: "rgba(255,255,255,0.02)", ...dim }}
        >
          渲染中…
        </div>
      )}
    </div>
  );
}
