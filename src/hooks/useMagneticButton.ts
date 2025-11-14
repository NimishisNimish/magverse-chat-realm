import { useRef, useEffect, useState } from 'react';

interface MagneticButtonOptions {
  strength?: number;
  range?: number;
}

export const useMagneticButton = (options: MagneticButtonOptions = {}) => {
  const { strength = 0.3, range = 100 } = options;
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const button = ref.current;
    if (!button) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let animationFrame: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(() => {
        const rect = button.getBoundingClientRect();
        const buttonCenterX = rect.left + rect.width / 2;
        const buttonCenterY = rect.top + rect.height / 2;
        
        const distance = Math.sqrt(
          Math.pow(e.clientX - buttonCenterX, 2) + 
          Math.pow(e.clientY - buttonCenterY, 2)
        );

        // Magnetic range
        if (distance < range) {
          const deltaX = (e.clientX - buttonCenterX) * strength;
          const deltaY = (e.clientY - buttonCenterY) * strength;
          setPosition({ x: deltaX, y: deltaY });
        } else {
          setPosition({ x: 0, y: 0 });
        }
      });
    };

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      button.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [strength, range]);

  return { ref, position };
};
