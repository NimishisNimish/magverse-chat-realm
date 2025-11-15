import { useEffect, useState } from 'react';

interface ParallaxOptions {
  speed?: number;
  direction?: 'up' | 'down';
  depth?: number; // 0-1, higher = more parallax
  mouseInfluence?: boolean;
}

export const useParallax = (options: ParallaxOptions = {}) => {
  const { 
    speed = 0.5, 
    direction = 'up',
    depth = 0.5,
    mouseInfluence = false 
  } = options;
  
  const [offset, setOffset] = useState(0);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.pageYOffset;
          const parallaxOffset = scrolled * speed * (direction === 'down' ? 1 : -1);
          setOffset(parallaxOffset);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, direction]);

  // Add mouse tracking effect
  useEffect(() => {
    if (!mouseInfluence) return;
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * depth * 50;
      const y = (e.clientY / window.innerHeight - 0.5) * depth * 50;
      setMouseOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseInfluence, depth]);

  return { 
    transform: `translate(${mouseOffset.x}px, ${offset + mouseOffset.y}px)`,
    style: {
      transform: `translate(${mouseOffset.x}px, ${offset + mouseOffset.y}px)`,
      transition: 'transform 0.1s ease-out'
    }
  };
};
