'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Check if we're on localhost or HTTPS
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';
      const isPrivateNetwork = window.location.hostname.startsWith('10.') || 
                               window.location.hostname.startsWith('192.168.') ||
                               window.location.hostname.startsWith('172.');

      console.log('🔍 SW Registration Check:', {
        hostname: window.location.hostname,
        isLocalhost,
        isHttps,
        isPrivateNetwork,
        canRegister: isLocalhost || isHttps || isPrivateNetwork,
      });

      // Service workers work on: localhost, HTTPS, or private network IPs (10.x, 192.168.x)
      if (isLocalhost || isHttps || isPrivateNetwork) {
        navigator.serviceWorker
          .register('/sw.js', {
            scope: '/',
          })
          .then((registration) => {
            console.log('✅ Service Worker registered successfully:', registration);
            
            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60000); // Check every minute
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });
      } else {
        console.warn('⚠️ Service Workers require HTTPS, localhost, or private network IP');
      }
    }
  }, []);

  return null;
}
