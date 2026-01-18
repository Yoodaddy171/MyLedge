import { useEffect } from 'react';
import { useLenis } from 'lenis/react';

export default function useBodyScrollLock(isLocked: boolean) {
  const lenis = useLenis();

  useEffect(() => {
    const mainEl = document.querySelector('main');

    if (isLocked) {
      // 1. Stop Lenis (Smooth Scroll)
      lenis?.stop();

      // 2. Lock Body (Standard)
      document.body.style.overflow = 'hidden';

      // 3. Lock Main Container (Dashboard Layout specific)
      // We use setProperty with important to override utility classes like 'overflow-y-auto'
      if (mainEl) {
        mainEl.style.setProperty('overflow', 'hidden', 'important');
      }
    } else {
      lenis?.start();
      document.body.style.overflow = '';
      if (mainEl) {
        mainEl.style.removeProperty('overflow');
      }
    }

    return () => {
      lenis?.start();
      document.body.style.overflow = '';
      if (mainEl) {
        mainEl.style.removeProperty('overflow');
      }
    };
  }, [isLocked, lenis]);
}
