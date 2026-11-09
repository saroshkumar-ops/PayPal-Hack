import React, { useEffect } from 'react';
import Lenis from 'lenis';

interface LenisProviderProps {
  children: React.ReactNode;
}

export const LenisProvider: React.FC<LenisProviderProps> = ({ children }) => {
  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const rafId = requestAnimationFrame(raf);

    // Stop Lenis when any modal is open, and freeze body/document scrolling
    const syncModalState = () => {
      const hasOpenModal = Boolean(
        document.querySelector('[data-modal-open="true"], [data-lenis-prevent], [role="dialog"], .fixed.inset-0.z-50')
      );
      if (hasOpenModal) {
        lenis.stop();
        document.body.classList.add('overflow-hidden');
        document.documentElement.classList.add('overflow-hidden');
      } else {
        lenis.start();
        document.body.classList.remove('overflow-hidden');
        document.documentElement.classList.remove('overflow-hidden');
      }
    };

    // Strict wheel event isolation: when a modal is open, prevent window scroll chaining
    const handleGlobalWheel = (e: WheelEvent) => {
      const openModal = document.querySelector(
        '[data-modal-open="true"], [data-lenis-prevent], [role="dialog"], .fixed.inset-0.z-50'
      );
      if (!openModal) return;

      const target = e.target as HTMLElement | null;
      const scrollable = target?.closest('.overflow-y-auto, .overflow-y-scroll');

      // If wheel occurs outside any scrollable container within the modal, prevent background scroll
      if (!scrollable || !openModal.contains(scrollable)) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });

    const observer = new MutationObserver(syncModalState);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
      observer.disconnect();
      cancelAnimationFrame(rafId);
      lenis.destroy();
      document.body.classList.remove('overflow-hidden');
      document.documentElement.classList.remove('overflow-hidden');
    };
  }, []);

  return <>{children}</>;
};
