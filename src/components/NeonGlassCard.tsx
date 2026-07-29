import React, { useState, useRef } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface NeonGlassCardProps extends HTMLMotionProps<'div'> {
  children?: React.ReactNode;
  status?: 'present' | 'pending' | 'absent' | 'leave';
}

export const NeonGlassCard: React.FC<NeonGlassCardProps> = ({ 
  children, 
  status, 
  className = '', 
  onClick,
  ...props 
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = {
        id: Date.now() + Math.random(),
        x,
        y
      };
      setRipples(prev => [...prev, newRipple]);
    }
    if (onClick) {
      onClick(e);
    }
  };

  const removeRipple = (id: number) => {
    setRipples(prev => prev.filter(r => r.id !== id));
  };

  return (
    <motion.div 
      ref={cardRef}
      whileHover={{ y: -5, scale: 1.018, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={{ scale: 0.985 }}
      className={`neon-glass-card status-${status || 'none'} ${className}`} 
      onClick={handleClick}
      {...props}
    >
      {/* Ripple effect container (isolated with overflow-hidden to preserve card outer glows) */}
      <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none z-0">
        {ripples.map(r => (
          <span 
            key={r.id}
            onAnimationEnd={() => removeRipple(r.id)}
            className="absolute rounded-full bg-white/15 pointer-events-none animate-neon-ripple -translate-x-1/2 -translate-y-1/2"
            style={{
              left: r.x,
              top: r.y,
              width: '20px',
              height: '20px',
            }}
          />
        ))}
      </div>

      {/* Glow elements */}
      <span className="glow glow-top"></span>
      <span className="glow glow-bottom"></span>
      <span className="glow glow-bright glow-top"></span>
      <span className="glow glow-bright glow-bottom"></span>

      {/* Shine elements */}
      <span className="shine shine-top"></span>
      <span className="shine shine-bottom"></span>

      {/* Status indicator dot */}
      {status && (
        <span 
          className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full z-20 transition-all duration-300 animate-pulse ${
            status === 'present' 
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' 
              : status === 'pending' 
                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]' 
                : status === 'absent'
                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                  : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.7)]'
          }`} 
        />
      )}
      
      {/* Card Content */}
      <div className="relative z-10 w-full h-full flex flex-col justify-center">
        {children}
      </div>
    </motion.div>
  );
};
