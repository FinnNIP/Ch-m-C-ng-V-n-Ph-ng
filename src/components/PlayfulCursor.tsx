import React, { useEffect, useRef } from 'react';

export default function PlayfulCursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const followerRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    alpha: number;
  }>>([]);

  const colors = [
    'rgba(0, 242, 254, 0.8)',  // Cyan
    'rgba(79, 172, 254, 0.8)',  // Light Blue
    'rgba(244, 63, 94, 0.8)',   // Rose
    'rgba(236, 72, 153, 0.8)',  // Pink
    'rgba(168, 85, 247, 0.8)',  // Purple
    'rgba(16, 185, 129, 0.8)'   // Emerald
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      mouseRef.current.x = clientX;
      mouseRef.current.y = clientY;
      
      if (!mouseRef.current.active) {
        mouseRef.current.active = true;
        followerRef.current.x = clientX;
        followerRef.current.y = clientY;
      }

      // Spawn a tiny, playful spark particle when the mouse moves
      if (Math.random() < 0.6) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.5;
        particlesRef.current.push({
          x: clientX,
          y: clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.2, // slight upward drift
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 2.5,
          alpha: 1.0
        });
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mouseRef.current.active) {
        // Smooth spring physics for the main cursor dot
        const dx = mouseRef.current.x - followerRef.current.x;
        const dy = mouseRef.current.y - followerRef.current.y;
        followerRef.current.x += dx * 0.18;
        followerRef.current.y += dy * 0.18;

        // Draw a tiny, elegant core follower ring
        ctx.beginPath();
        ctx.arc(followerRef.current.x, followerRef.current.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.35)'; // Indigo halo
        ctx.fill();

        ctx.beginPath();
        ctx.arc(followerRef.current.x, followerRef.current.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.95)'; // Indigo core
        ctx.fill();
      }

      // Update and draw particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.035;
        p.size *= 0.94;

        if (p.alpha <= 0 || p.size < 0.5) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="playful-cursor-canvas"
      className="fixed inset-0 w-full h-full pointer-events-none z-[9999]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
