import React, { useEffect, useRef } from 'react';

interface Props {
  children: React.ReactNode;
  delay?: number;      // ms before class is added after intersection
  className?: string;
}

export const ScrollReveal: React.FC<Props> = ({ children, delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const id = setTimeout(() => el.classList.add('visible'), delay);
          observer.unobserve(el);
          return () => clearTimeout(id);
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
};
