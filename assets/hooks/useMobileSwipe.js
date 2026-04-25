// assets/hooks/useMobileSwipe.js
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Hook to handle swipe gestures for mobile navigation
 * Swipe left: next page
 * Swipe right: previous page
 */
export const useMobileSwipe = () => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Define navigation order
  const navPages = [
    '/',
    '/stores',
    '/products',
    '/cart',
    '/dashboard'
  ];

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024) {
      return; // Don't activate on desktop
    }

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);
      
      const threshold = 80; // Minimum swipe distance
      const maxVerticalMovement = 100; // Maximum vertical movement allowed
      
      // Ignore if too much vertical movement (likely scrolling)
      if (deltaY > maxVerticalMovement) return;
      
      const currentIndex = navPages.indexOf(pathname);
      if (currentIndex === -1) return;
      
      // Swipe left (next page)
      if (deltaX < -threshold) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < navPages.length) {
          router.push(navPages[nextIndex]);
        }
      }
      // Swipe right (previous page)
      else if (deltaX > threshold) {
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          router.push(navPages[prevIndex]);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pathname, router]);
};

export default useMobileSwipe;