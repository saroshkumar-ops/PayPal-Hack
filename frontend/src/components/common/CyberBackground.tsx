import React, { useEffect, useRef } from 'react';

export const CyberBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Subtle dark cyber grid points with occasional faint pulse
    const cols = Math.floor(width / 48);
    const rows = Math.floor(height / 48);
    let time = 0;

    const render = () => {
      time += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Deep dark ambient vignette
      const gradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        100,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.8
      );
      gradient.addColorStop(0, '#0F1117');
      gradient.addColorStop(0.65, '#07080D');
      gradient.addColorStop(1, '#050608');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw faint terminal grid dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const posX = x * 48 + 24;
          const posY = y * 48 + 24;
          
          // Occasional subtle lime pulse wave travelling diagonally
          const wave = Math.sin((x * 0.15) - (y * 0.15) + time);
          if (wave > 0.94) {
            ctx.fillStyle = 'rgba(198, 255, 61, 0.18)';
            ctx.beginPath();
            ctx.arc(posX, posY, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          } else {
            ctx.fillRect(posX - 0.5, posY - 0.5, 1, 1);
          }
        }
      }

      // Very faint acid lime horizon glow at top edge
      const topGlow = ctx.createLinearGradient(0, 0, 0, 180);
      topGlow.addColorStop(0, 'rgba(198, 255, 61, 0.03)');
      topGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, width, 180);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none -z-10 w-full h-full"
        aria-hidden="true"
      />
      <div className="cyber-grain" aria-hidden="true" />
    </>
  );
};
