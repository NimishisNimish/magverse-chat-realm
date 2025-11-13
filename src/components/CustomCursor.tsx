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
    switch (cursorVariant) {
      case 'link':
      case 'button':
        return 1.3;
      case 'card':
        return 1.5;
      case 'text':
        return 1.2;
      case 'image':
        return 1.4;
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
        transform: `translate(-20%, -20%) scale(${getCursorScale()})`,
        opacity: isVisible ? 1 : 0,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cursorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="50%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path
          d="M4 4 L4 28 L12 20 L16 28 L20 26 L16 18 L28 18 Z"
          fill="url(#cursorGradient)"
          filter="url(#glow)"
          stroke="white"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
      </svg>
    </div>
  );
};

export default CustomCursor;
