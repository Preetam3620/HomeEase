import { ReactNode, useEffect, useRef } from 'react';

interface InfiniteScrollProps {
  children: ReactNode;
  speed?: number;
  direction?: 'left' | 'right';
}

const InfiniteScroll = ({ children, speed = 30, direction = 'left' }: InfiniteScrollProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const scrollContent = scrollContainer.firstElementChild as HTMLElement;
    const clone = scrollContent.cloneNode(true) as HTMLElement;
    scrollContainer.appendChild(clone);

    let position = 0;
    const animate = () => {
      position += direction === 'left' ? -1 : 1;
      
      if (direction === 'left' && Math.abs(position) >= scrollContent.offsetWidth) {
        position = 0;
      } else if (direction === 'right' && position >= scrollContent.offsetWidth) {
        position = 0;
      }
      
      scrollContainer.style.transform = `translateX(${position}px)`;
      requestAnimationFrame(animate);
    };

    const animation = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animation);
  }, [direction]);

  return (
    <div className="overflow-hidden">
      <div ref={scrollRef} className="flex" style={{ willChange: 'transform' }}>
        <div className="flex gap-6 shrink-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default InfiniteScroll;
