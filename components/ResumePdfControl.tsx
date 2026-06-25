"use client";

import { useRef, useState } from "react";
import { type ResumeVersionSummary } from "@/lib/types";

const dim = { color: "var(--color-txt-dim)" } as const;
const linkBtn = "rounded-md px-2 py-1 text-xs transition-colors";

const MAX_BYTES = 4 * 1024 * 1024;

function fmtSize(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

// 版本卡片上的 PDF 区块：没传 → 上传按钮；已传 → 文件名/大小 + 预览/替换/删除。
export default function ResumePdfControl({
  version,
  onChanged,
}: {
  version: ResumeVersionSummary;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pdf = version.pdf;
  const previewUrl = `/api/resume-versions/${version.id}/pdf`;

  function pick() {
    setErr(null);
    inputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 允许连续选同名文件
    if (!file) return;

    // 客户端先做一遍校验（更快反馈），服务端仍会再校验一次。
    if (file.type !== "application/pdf") {
      setErr("只接受 PDF 文件");
      return;
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      setErr("文件需 >0 且 ≤4MB");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(previewUrl, { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error ?? "上传失败");
      } else {
        onChanged();
      }
    } catch {
      setErr("网络错误，上传失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("确定删除这份 PDF？此操作不可恢复。")) return;
    setBusy(true);
    setErr(null);
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
        onChange={onFile}
      />

      {pdf ? (
        <div>
          <div className="flex items-center gap-1.5">
            <span style={{ color: "var(--color-neon-cyan)", opacity: 0.8 }}>▤</span>
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
              disabled={busy}
              className={`${linkBtn} hover:text-[var(--color-neon-cyan)] disabled:opacity-50`}
              style={dim}
            >
              {busy ? "处理中…" : "替换"}
            </button>
            <button
              onClick={remove}
              disabled={busy}
              className={`${linkBtn} ml-auto hover:text-[#FF2E97] disabled:opacity-50`}
              style={dim}
            >
              删除
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={pick}
          disabled={busy}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs transition-colors hover:border-[var(--color-neon-cyan)] hover:text-[var(--color-neon-cyan)] disabled:opacity-50"
          style={{ borderColor: "var(--color-line)", color: "var(--color-txt-dim)" }}
        >
          {busy ? "上传中…" : "＋ 上传 PDF"}
        </button>
      )}

      {err && (
        <p className="mt-1.5 text-[11px]" style={{ color: "#FF2E97" }}>
          {err}
        </p>
      )}
    </div>
  );
}
