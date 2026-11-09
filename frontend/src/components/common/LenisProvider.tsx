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
        document.querySelector('[data-modal-open="true"], [role="dialog"], .fixed.inset-0.z-50')
      );
      if (hasOpenModal) {
        lenis.stop();
        document.body.classList.add('overflow-hidden', 'modal-locked');
        document.documentElement.classList.add('overflow-hidden', 'modal-locked');
      } else {
        lenis.start();
        document.body.classList.remove('overflow-hidden', 'modal-locked');
        document.documentElement.classList.remove('overflow-hidden', 'modal-locked');
      }
    };

    // Strict wheel event isolation: when a modal is open, prevent window scroll chaining
    const handleGlobalWheel = (e: WheelEvent) => {
      const openModal = document.querySelector(
        '[data-modal-open="true"], [role="dialog"], .fixed.inset-0.z-50'
      );
      if (!openModal) return;

      const target = e.target as HTMLElement | null;
      if (!target || !openModal.contains(target)) {
        // Pointer is on backdrop or outside modal: block wheel from moving background
        e.preventDefault();
        return;
      }

      // Check if pointer is inside a scrollable container within the modal
      const scrollable = target.closest('.overflow-y-auto, .overflow-y-scroll') as HTMLElement | null;
      if (!scrollable || !openModal.contains(scrollable)) {
        // Pointer is on static header or unscrollable section: block wheel
        e.preventDefault();
        return;
      }

      // Inside scrollable container: prevent scroll chaining when reaching edges
      const isUp = e.deltaY < 0;
      const isDown = e.deltaY > 0;
      const atTop = scrollable.scrollTop <= 0;
      const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;

      if ((isUp && atTop) || (isDown && atBottom)) {
        e.preventDefault();
      }
    };

    // Capture phase ensures we intercept before any chaining occurs
    window.addEventListener('wheel', handleGlobalWheel, { capture: true, passive: false });

    const observer = new MutationObserver(syncModalState);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel, { capture: true });
      observer.disconnect();
      cancelAnimationFrame(rafId);
      lenis.destroy();
      document.body.classList.remove('overflow-hidden', 'modal-locked');
      document.documentElement.classList.remove('overflow-hidden', 'modal-locked');
    };
  }, []);

  return <>{children}</>;
};
