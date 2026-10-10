import { useEffect } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';

// Sets --market-zoom on the given elements as they scroll through the viewport.
export default function useScrollZoom(selector) {
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const bands = [...document.querySelectorAll(selector)];
    if (!bands.length) return;
    let frame = 0;
    function paint() {
      frame = 0;
      bands.forEach(band => {
        if (reduced) return band.style.setProperty('--market-zoom', '1');
        const rect = band.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) return;
        const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
        band.style.setProperty('--market-zoom', (1 + progress * 0.35).toFixed(4));
      });
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [selector, reduced]);
}
