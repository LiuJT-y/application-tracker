"use client";

import { useRef, useState } from "react";
import { type ResumeVersionSummary } from "@/lib/types";
import { validatePdf, uploadVersionPdf } from "@/lib/resume/pdfUpload";

const dim = { color: "var(--color-txt-dim)" } as const;
const linkBtn = "rounded-md px-2 py-1 text-xs transition-colors";

function fmtSize(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

// 版本卡片上的 PDF 区块：没传 → 拖拽上传区；已传 → 文件名/大小 + 预览/替换/删除。
export default function ResumePdfControl({
  version,
  onChanged,
}: {
  version: ResumeVersionSummary;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0); // 上传进度 0-100
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null); // 成功反馈（短暂显示）
  const [dragOver, setDragOver] = useState(false);

  const pdf = version.pdf;
  const previewUrl = `/api/resume-versions/${version.id}/pdf`;

  function pick() {
    setErr(null);
    inputRef.current?.click();
  }

  // 统一的文件处理：input 选择 与 拖拽 都走这里。
  async function handleFile(file: File) {
    // 客户端先做一遍校验（更快反馈），服务端仍会再校验一次。
    const invalid = validatePdf(file);
    if (invalid) {
      setErr(invalid);
      return;
    }

    setBusy(true);
    setErr(null);
    setOk(null);
    setProgress(0);
    try {
      await uploadVersionPdf(version.id, file, setProgress);
      onChanged();
      setOk("上传成功");
      window.setTimeout(() => setOk(null), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 允许连续选同名文件
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function remove() {
    if (!window.confirm("确定删除这份 PDF？此操作不可恢复。")) return;
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch(previewUrl, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error ?? "删除失败");
      } else {
        onChanged();
      }
    } catch {
      setErr("网络错误，删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={onInputChange}
      />

      {/* 上传中：进度条（拖拽区 / 替换 共用） */}
      {busy && progress >= 0 && !pdf ? (
        <UploadingBar progress={progress} />
      ) : pdf ? (
        <div>
          <div className="flex items-center gap-1.5">
            <FileIcon />
            <span
              className="min-w-0 flex-1 truncate text-xs"
              style={{ color: "var(--color-txt)" }}
              title={pdf.filename}
            >
              {pdf.filename}
            </span>
            <span className="shrink-0 font-mono text-[10px]" style={dim}>
              {fmtSize(pdf.size)}
            </span>
          </div>
          {busy ? (
            <div className="mt-1.5">
              <UploadingBar progress={progress} />
            </div>
          ) : (
            <div className="mt-1.5 flex items-center gap-1">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkBtn} hover:text-[var(--color-neon-cyan)]`}
                style={dim}
              >
                预览
              </a>
              <button
                onClick={pick}
                className={`${linkBtn} hover:text-[var(--color-neon-cyan)]`}
                style={dim}
              >
                替换
              </button>
              <button
                onClick={remove}
                className={`${linkBtn} ml-auto hover:text-[#FF2E97]`}
                style={dim}
              >
                删除
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 空状态：明显的拖拽上传区 */
        <div
          role="button"
          tabIndex={0}
          onClick={pick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              pick();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragOver) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-5 text-center transition-colors ${
            dragOver
              ? "border-[var(--color-neon-cyan)] bg-[rgba(0,240,255,0.06)] text-[var(--color-neon-cyan)]"
              : "border-[var(--color-line)] text-[var(--color-txt-dim)] hover:border-[var(--color-neon-cyan)] hover:text-[var(--color-neon-cyan)]"
          }`}
        >
          <div className="pointer-events-none flex flex-col items-center gap-1.5">
            <UploadIcon />
            <span className="text-xs font-medium">点击或拖拽 PDF 到此处</span>
            <span className="text-[10px]" style={{ opacity: 0.7 }}>
              支持 PDF · ≤4MB
            </span>
          </div>
        </div>
      )}

      {err && (
        <p className="mt-1.5 text-[11px]" style={{ color: "#FF2E97" }}>
          {err}
        </p>
      )}
      {ok && (
        <p
          className="mt-1.5 flex items-center gap-1 text-[11px]"
          style={{ color: "var(--color-neon-green)" }}
        >
          <CheckIcon />
          {ok}
        </p>
      )}
    </div>
  );
}

// 进度条 + 百分比
function UploadingBar({ progress }: { progress: number }) {
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <div className="flex items-center justify-between text-[11px]" style={dim}>
        <span>上传中…</span>
        <span className="font-mono">{progress}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(139,156,184,0.2)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${progress}%`,
            background: "var(--color-neon-cyan)",
            boxShadow: "0 0 8px rgba(0,240,255,0.5)",
          }}
        />
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      style={{ color: "var(--color-neon-cyan)", opacity: 0.85 }}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
