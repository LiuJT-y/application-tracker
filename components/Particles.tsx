"use client";

import { useEffect, useRef } from "react";

// 轻量背景粒子：单个 canvas，≤40 个缓慢漂移的霓虹点。
// - 标签页隐藏时暂停（visibilitychange）
// - prefers-reduced-motion 开启时完全不渲染
// 不引 3D / 重粒子库，只用 requestAnimationFrame + transform 思路画点。
const COUNT = 36;
const COLORS = ["#00F0FF", "#FF2E97", "#7B2FF7"];

type P = { x: number; y: number; vx: number; vy: number; r: number; c: string };

export default function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) return; // 尊重「减少动态效果」：不渲染粒子

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let particles: P[] = [];
    let raf = 0;
    let running = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.6 + 0.6,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // 缓慢环绕边界
        if (p.x < -5) p.x = w + 5;
        if (p.x > w + 5) p.x = -5;
        if (p.y < -5) p.y = h + 5;
        if (p.y > h + 5) p.y = -5;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.c;
        ctx!.shadowBlur = 8;
        ctx!.shadowColor = p.c;
        ctx!.globalAlpha = 0.55;
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      ctx!.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    }

    function start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(draw);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    function onVisibility() {
      // 标签页隐藏时暂停，省电省 CPU
      if (document.hidden) stop();
      else start();
    }

    resize();
    seed();
    raf = requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
