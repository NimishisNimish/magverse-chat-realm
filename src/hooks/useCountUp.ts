import { useEffect, useState } from 'react';
import { useScrollAnimation } from './useScrollAnimation';

interface UseCountUpOptions {
  end: number;
  duration?: number;
  decimals?: number;
}

export const useCountUp = (options: UseCountUpOptions) => {
  const { end, duration = 2000, decimals = 0 } = options;
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });

  useEffect(() => {
    if (!isVisible) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCount(end);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function (ease-out cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentCount = end * easeOutCubic;
      
      setCount(decimals > 0 
        ? parseFloat(currentCount.toFixed(decimals))
        : Math.floor(currentCount)
      );

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end); // Ensure we end exactly at the target
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, decimals, isVisible]);

  return { ref, count };
};
