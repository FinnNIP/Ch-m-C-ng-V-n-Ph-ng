import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfettiProps {
  isActive: boolean;
  onComplete: () => void;
}

export function ConfettiEffect({ isActive, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<any[]>([]);

  useEffect(() => {
    if (isActive) {
      const colors = ['#f43f5e', '#ec4899', '#d946ef', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#f97316'];
      // Generate confetti pieces
      const newPieces = Array.from({ length: 80 }).map((_, i) => {
        // Distribute destination randomly across the screen width and height (upper half)
        const destX = Math.random() * 100;
        const destY = Math.random() * 100 - 20;
        return {
          id: i,
          destX,
          destY,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 720 - 360,
          scale: Math.random() * 0.7 + 0.3,
          delay: Math.random() * 0.2
        };
      });
      setPieces(newPieces);

      const timer = setTimeout(() => {
        setPieces([]);
        onComplete();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{
            opacity: 1,
            x: "50vw",
            y: "110vh", // Start from below the screen
            rotate: 0,
            scale: 0,
          }}
          animate={{
            opacity: [1, 1, 1, 0],
            x: [`50vw`, `${piece.destX}vw`, `${piece.destX + (Math.random() * 10 - 5)}vw`],
            y: [`110vh`, `${piece.destY}vh`, `120vh`], // Go up, then fall down
            rotate: [0, piece.rotation, piece.rotation * 2],
            scale: [0, piece.scale, piece.scale],
          }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            delay: piece.delay,
            times: [0, 0.4, 1] // Shoot up quickly, then fall slowly
          }}
          className="absolute"
          style={{
            backgroundColor: piece.color,
            width: Math.random() > 0.5 ? '8px' : '6px',
            height: Math.random() > 0.5 ? '16px' : '6px',
            borderRadius: Math.random() > 0.5 ? '2px' : '50%'
          }}
        />
      ))}
    </div>
  );
}
