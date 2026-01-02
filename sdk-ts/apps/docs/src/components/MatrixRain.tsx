'use client';

import { useEffect, useRef } from 'react';

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 32;
    const lineHeight = fontSize * 0.75;
    const columns = Math.floor(canvas.width / fontSize);
    const trailLength = 20;
    const char = '$';

    // Each column has: y position (-1 = inactive), speed, tick counter, character, trail
    const drops: { y: number; speed: number; tick: number; char: string; trail: number[] }[] = Array(columns)
      .fill(null)
      .map(() => ({
        y: -1,
        speed: Math.random() * 3 + 1, // 1-4 ticks per move
        tick: 0,
        char,
        trail: [],
      }));

    // Start with just a few drops - let it trickle in
    for (let i = 0; i < columns; i++) {
      if (Math.random() > 0.97) {
        drops[i].y = 0;
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px Unifont, monospace`;

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        const x = i * fontSize;

        // Draw trail (oldest to newest, fading out)
        for (let t = 0; t < drop.trail.length; t++) {
          const trailY = drop.trail[t];
          const opacity = ((t + 1) / drop.trail.length) * 0.4;
          ctx.fillStyle = `rgba(80, 250, 123, ${opacity})`;
          ctx.fillText(drop.char, x, trailY * lineHeight);
        }

        // Draw head if active - brighter green
        if (drop.y >= 0) {
          const y = drop.y * lineHeight;

          ctx.fillStyle = 'rgba(150, 255, 180, 0.9)';
          ctx.fillText(drop.char, x, y);

          // Only advance based on speed
          drop.tick++;
          if (drop.tick >= drop.speed) {
            drop.tick = 0;
            drop.trail.push(drop.y);
            if (drop.trail.length > trailLength) {
              drop.trail.shift();
            }
            drop.y++;
          }

          // Stop head when off screen, let trail fade naturally
          if (y > canvas.height) {
            drop.y = -1;
          }
        } else if (drop.trail.length > 0) {
          // Continue fading trail after head is gone
          drop.tick++;
          if (drop.tick >= drop.speed) {
            drop.tick = 0;
            drop.trail.shift();
          }
        }

        // Randomly start new drops from top
        if (drop.y < 0 && drop.trail.length === 0 && Math.random() > 0.99) {
          drop.y = 0;
          drop.tick = 0;
          drop.speed = Math.random() * 3 + 1;
          drop.char = char;
        }
      }

    };

    const interval = setInterval(draw, 33);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
