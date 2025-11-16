import { useEffect, useState } from 'react';
import { useCursor } from '@/contexts/CursorContext';

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const { cursorVariant } = useCursor();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device has fine pointer (mouse)
    const hasMouse = window.matchMedia('(pointer: fine)').matches;
    setIsMobile(!hasMouse);
    
    if (!hasMouse) return;

    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isVisible]);

  // Don't render on mobile/touch devices
  if (isMobile) return null;

  const getCursorScale = () => {
    // Normalized scaling for better size
    switch (cursorVariant) {
      case 'link':
      case 'button':
        return 1.05;
      case 'card':
        return 1.08;
      case 'text':
        return 1.02;
      case 'image':
        return 1.05;
      default:
        return 1;
    }
  };

  return (
    <div
      className="custom-cursor-pointer"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) scale(${getCursorScale()})`,
        opacity: isVisible ? 1 : 0,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cursorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="50%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path
          d="M2 2 L2 18 L8 13 L10 18 L13 16 L10 11 L18 11 Z"
          fill="url(#cursorGradient)"
          filter="url(#glow)"
          stroke="white"
          strokeWidth="1"
          strokeOpacity="0.8"
        />
      </svg>
    </div>
  );
};

export default CustomCursor;
