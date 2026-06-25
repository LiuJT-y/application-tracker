// 把 pdfjs-dist 的 worker 文件从 node_modules 复制到 public/，让前端用同源本地 worker
// （不依赖任何外部 CDN——大陆本机部署也能用）。
// 在 build 前跑一次，保证 public 里的 worker 与已安装的 pdfjs-dist 版本一致。
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 用 require.resolve 定位包内 worker 文件，跨平台、不写死路径。
const src = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const destDir = resolve(root, "public");
const dest = resolve(destDir, "pdf.worker.min.mjs");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-pdf-worker] ${src} -> ${dest}`);
