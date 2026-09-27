import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  isActive: boolean;
  onComplete: () => void;
}

export function ConfettiEffect({ isActive, onComplete }: ConfettiProps) {
  useEffect(() => {
    if (isActive) {
      const count = 200;
      const defaults = {
        origin: { y: 0.9 }, // Shoot from the bottom
        zIndex: 1500,
        colors: [
          '#f43f5e', '#ec4899', '#d946ef', '#8b5cf6', '#6366f1', 
          '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#f97316'
        ]
      };

      function fire(particleRatio: number, opts: any) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });

      const timer = setTimeout(() => {
        onComplete();
      }, 3500);

      return () => {
        clearTimeout(timer);
        confetti.reset();
      };
    }
  }, [isActive, onComplete]);

  return null;
}

