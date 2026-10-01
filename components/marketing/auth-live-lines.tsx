'use client';

import { useEffect, useRef } from 'react';

/**
 * Animated live wave lines background.
 * Uses requestAnimationFrame to draw smooth, living, undulating ribbon curves
 * with subtle mint and teal gradients from the SupportSphere design tokens.
 */
export function AuthLiveLines({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Wave parameters
    const waves = [
      {
        baseY: 0.35,
        speed: 0.008,
        amplitude: 28,
        freq: 0.003,
        color: 'rgba(56, 189, 158, 0.35)', // mint accent
        lineWidth: 1.5,
      },
      {
        baseY: 0.42,
        speed: 0.012,
        amplitude: 34,
        freq: 0.0025,
        color: 'rgba(38, 130, 142, 0.28)', // teal signal
        lineWidth: 1.25,
      },
      {
        baseY: 0.5,
        speed: 0.007,
        amplitude: 30,
        freq: 0.0035,
        color: 'rgba(56, 189, 158, 0.42)', // mint highlight
        lineWidth: 2,
      },
      {
        baseY: 0.58,
        speed: 0.015,
        amplitude: 38,
        freq: 0.002,
        color: 'rgba(180, 195, 205, 0.35)', // subtle rule
        lineWidth: 1.2,
      },
      {
        baseY: 0.65,
        speed: 0.009,
        amplitude: 32,
        freq: 0.003,
        color: 'rgba(56, 189, 158, 0.25)', // soft mint
        lineWidth: 1.5,
      },
      {
        baseY: 0.72,
        speed: 0.011,
        amplitude: 26,
        freq: 0.0028,
        color: 'rgba(38, 130, 142, 0.2)', // deep teal
        lineWidth: 1.1,
      },
    ];

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      for (const wave of waves) {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth;

        const startY = h * wave.baseY;

        for (let x = -20; x <= w + 20; x += 6) {
          const dy =
            Math.sin(x * wave.freq + t * wave.speed) * wave.amplitude +
            Math.cos(x * wave.freq * 0.7 - t * wave.speed * 0.5) *
              (wave.amplitude * 0.4);
          const y = startY + dy;

          if (x === -20) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      if (!prefersReducedMotion) {
        t += 1;
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
