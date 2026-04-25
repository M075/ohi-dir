// middleware.js - FIXED VERSION with better redirect handling
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Public paths that don't require auth
    const publicPaths = ['/auth/signin', '/auth/signup', '/', '/products', '/stores', '/about'];
    const isPublicPath = publicPaths.some(p => path === p || path.startsWith(p));
    
    if (isPublicPath) {
      // If already authenticated and trying to access signin/signup, redirect to dashboard
      if (token && (path === '/auth/signin' || path === '/auth/signup')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.next();
    }

    // If no token, redirect to signin with callback URL
    if (!token) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // Allow access to onboarding page always (for users completing onboarding)
    if (path === '/onboarding') {
      // If already onboarded, redirect to dashboard
      if (token.isOnboarded) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.next();
    }

    // For protected routes, check if onboarding is complete
    const protectedPaths = ['/dashboard', '/products/add'];
    const isProtectedPath = protectedPaths.some(p => path.startsWith(p));

    if (isProtectedPath && !token.isOnboarded) {
      // User needs to complete onboarding first
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Public paths are always authorized
        const publicPaths = ['/auth/signin', '/auth/signup', '/', '/products', '/stores', '/about'];
        if (publicPaths.some(p => path === p || path.startsWith(p))) {
          return true;
        }
        
        // For other paths, require a token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/products/add',
    '/onboarding',
    // Auth routes (to redirect if already authenticated)
    '/auth/:path*',
    '/admin/:path*'
  ],
};