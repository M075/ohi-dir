// assets/components/MobileLayoutWrapper.jsx
"use client";

import { useMobileSwipe } from '@/assets/hooks/useMobileSwipe';

/**
 * Wrapper component to enable mobile swipe navigation
 * Use this to wrap page content that needs swipe functionality
 */
export default function MobileLayoutWrapper({ children }) {
  useMobileSwipe();
  
  return <>{children}</>;
}