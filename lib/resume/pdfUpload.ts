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
// 传了 onProgress 就走 XHR 以拿到真实上传进度（0-100）；否则行为等价于 fetch。
export async function uploadVersionPdf(
  versionId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/resume-versions/${versionId}/pdf`);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));

    xhr.upload.onprogress = (ev) => {
      if (onProgress && ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      let msg = "上传失败";
      try {
        const data = JSON.parse(xhr.responseText);
        if (data?.error) msg = data.error;
      } catch {
        /* 非 JSON 响应，用默认文案 */
      }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("网络错误，上传失败"));
    xhr.send(file);
  });
}
