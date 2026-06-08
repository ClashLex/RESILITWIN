import React, { useEffect, useRef, useState } from 'react';

/**
 * ScrollReveal — Lightweight viewport-entrance animation wrapper.
 *
 * Wraps children in a <div> that starts transparent/offset and
 * transitions to visible once the element intersects the viewport.
 *
 * Props:
 *   direction — 'up' | 'down' | 'left' | 'right' | 'none'  (default 'up')
 *   delay     — ms delay before the transition fires           (default 0)
 *   distance  — px offset for the slide                        (default 40)
 *   duration  — ms for the transition                          (default 800)
 *   threshold — IntersectionObserver threshold 0-1             (default 0.12)
 *   once      — only animate once (don't re-hide on exit)      (default true)
 *   className — extra class names forwarded to the wrapper
 *   style     — extra inline styles forwarded to the wrapper
 */
export default function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  distance = 40,
  duration = 800,
  threshold = 0.12,
  once = true,
  className = '',
  style = {},
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  const translate = {
    up:    `translateY(${distance}px)`,
    down:  `translateY(-${distance}px)`,
    left:  `translateX(${distance}px)`,
    right: `translateX(-${distance}px)`,
    none:  'none',
  };

  const baseStyle = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : (translate[direction] || translate.up),
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    willChange: 'opacity, transform',
    ...style,
  };

  return (
    <div ref={ref} className={className} style={baseStyle}>
      {children}
    </div>
  );
}
