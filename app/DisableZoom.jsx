'use client';

import { useEffect } from 'react';

export default function DisableZoom() {
  useEffect(() => {
    // Prevent pinch-to-zoom
    const handleTouchMove = (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    // Prevent gesture zoom (iOS)
    const handleGestureStart = (event) => {
      event.preventDefault();
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('gesturestart', handleGestureStart, false);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('gesturestart', handleGestureStart);
    };
  }, []);

  return null;
}
