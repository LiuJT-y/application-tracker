"use client";

// PDF.js 渲染助手（只在浏览器端跑）：懒加载 pdfjs-dist、设置同源本地 worker、
// 缓存已解析的 PDF document 与已渲染的页图，避免重复请求 / 重复渲染。
// pdfjs-dist 是大依赖：这里用 dynamic import，只有真正用到画廊时才会加载，不拖累首屏。

import type { PDFDocumentProxy } from "pdfjs-dist";

// 懒加载 pdfjs 并设置 worker（同源 /pdf.worker.min.mjs，由 scripts/copy-pdf-worker.mjs 复制到 public）。
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}

// document 缓存：每个版本只取一次字节、解析一次，内层翻页复用。
const docCache = new Map<string, Promise<PDFDocumentProxy>>();

export function loadVersionPdf(versionId: string): Promise<PDFDocumentProxy> {
  let p = docCache.get(versionId);
  if (!p) {
    p = (async () => {
      const pdfjs = await getPdfjs();
      const res = await fetch(`/api/resume-versions/${versionId}/pdf`);
      if (!res.ok) throw new Error(`取 PDF 失败（${res.status}）`);
      const buf = await res.arrayBuffer();
      return pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    })();
    p.catch(() => docCache.delete(versionId)); // 失败别缓存，下次可重试
    docCache.set(versionId, p);
  }
  return p;
}

// 页图缓存：key = 版本:页码:宽度。渲染成 PNG dataURL，<img> 直接用，来回滑不重复渲染。
const pageCache = new Map<string, Promise<string>>();

export function renderVersionPage(
  versionId: string,
  pageNum: number,
  targetWidth = 480
): Promise<string> {
  const key = `${versionId}:${pageNum}:${targetWidth}`;
  let p = pageCache.get(key);
  if (!p) {
    p = (async () => {
      const doc = await loadVersionPdf(versionId);
      const page = await doc.getPage(pageNum);
      const base = page.getViewport({ scale: 1 });
      const scale = targetWidth / base.width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("无法创建 canvas 上下文");
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const url = canvas.toDataURL("image/png");
      // 释放 canvas
      canvas.width = 0;
      canvas.height = 0;
      return url;
    })();
    p.catch(() => pageCache.delete(key));
    pageCache.set(key, p);
  }
  return p;
}
