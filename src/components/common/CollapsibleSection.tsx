import React, { useState, useRef, useCallback } from 'react';

interface CollapsibleSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  /** Whether the section starts open. Default true. */
  defaultOpen?: boolean;
  /** Extra className appended to the outer card div. */
  className?: string;
  /** Content rendered in the header row (right side), stops click propagation. */
  extra?: React.ReactNode;
}

/**
 * Drop-in replacement for `<div className="card">` that adds a smooth
 * collapse animation with a chevron toggle. The outer element keeps the
 * `.card` class so all existing styles still apply.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  className = '',
  extra,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const innerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    setOpen(prev => {
      const next = !prev;
      const el = innerRef.current;
      if (el) {
        if (next) {
          // Opening: animate from 0 → scrollHeight, then release to 'none'
          el.style.maxHeight = el.scrollHeight + 'px';
          const onEnd = () => {
            el.style.maxHeight = 'none';
            el.removeEventListener('transitionend', onEnd);
          };
          el.addEventListener('transitionend', onEnd);
        } else {
          // Closing: pin current height first, then animate to 0
          el.style.maxHeight = el.scrollHeight + 'px';
          // Force a reflow so the browser registers the starting value
          void el.offsetHeight;
          el.style.maxHeight = '0px';
        }
      }
      return next;
    });
  }, []);

  return (
    <div className={`card ${className}`}>
      {/* Header row */}
      <div
        className="flex items-center justify-between gap-2 cursor-pointer select-none"
        onClick={toggle}
        role="button"
        aria-expanded={open}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Chevron */}
          <span
            className="text-primary shrink-0 transition-transform duration-200 text-[11px] leading-none"
            style={{
              display: 'inline-block',
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
            aria-hidden
          >
            ▾
          </span>
          {typeof title === 'string'
            ? <h3 className="section-title mb-0 truncate">{title}</h3>
            : title}
        </div>

        {extra && (
          <div
            className="shrink-0"
            onClick={e => e.stopPropagation()}
          >
            {extra}
          </div>
        )}
      </div>

      {/* Collapsible body */}
      <div
        ref={innerRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: defaultOpen ? 'none' : '0px',
          opacity: open ? 1 : 0,
          transition: 'max-height 0.3s ease-in-out, opacity 0.25s ease-in-out',
        }}
      >
        <div className="mt-3">
          {children}
        </div>
      </div>
    </div>
  );
};
