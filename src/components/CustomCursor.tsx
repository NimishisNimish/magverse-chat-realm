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

  const getOuterScale = () => {
    switch (cursorVariant) {
      case 'link':
      case 'button':
        return 1.5;
      case 'card':
        return 1.8;
      default:
        return 1;
    }
  };

  return (
    <>
      {/* Outer cursor - glowing ring */}
      <div
        className="custom-cursor-outer"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `translate(-50%, -50%) scale(${getOuterScale()})`,
          opacity: isVisible ? 1 : 0,
        }}
      />
      
      {/* Inner cursor - small dot */}
      <div
        className="custom-cursor-inner"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          opacity: isVisible ? 1 : 0,
        }}
      />
    </>
  );
};

export default CustomCursor;
