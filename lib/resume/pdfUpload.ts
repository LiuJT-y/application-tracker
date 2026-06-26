"use client";

// 简历 PDF 上传的客户端助手 + 校验。
// 注意：用「原始字节」上传（Content-Type: application/pdf），不要用 multipart/form-data——
// Next.js 会把 multipart POST 当成 Server Action 拦截，导致请求打不到我们的 route handler。

export const PDF_MAX_BYTES = 4 * 1024 * 1024; // 4MB

// 客户端先校验，给即时反馈；服务端仍会再校验一次。返回错误文案，合法则返回 null。
export function validatePdf(file: File): string | null {
  if (file.type !== "application/pdf") return "只接受 PDF 文件";
  if (file.size <= 0 || file.size > PDF_MAX_BYTES) return "文件需 >0 且 ≤4MB";
  return null;
}

// 把 PDF 以原始字节上传到某个版本；失败抛错（带服务端返回的文案）。
export async function uploadVersionPdf(versionId: string, file: File): Promise<void> {
  const res = await fetch(`/api/resume-versions/${versionId}/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
      "x-filename": encodeURIComponent(file.name),
    },
    body: file,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "上传失败");
  }
}
