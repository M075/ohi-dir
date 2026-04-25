// middleware/roleProtection.js - NEW FILE
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/utils/authOptions';

/**
 * Check if user has required role
 */
export async function requireRole(allowedRoles = []) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return {
      authorized: false,
      redirect: '/auth/signin',
      message: 'Please sign in to access this page'
    };
  }

  const userRole = session.user.role || 'buyer';
  const isAdmin = session.user.isAdmin;

  // Admins can access everything
  if (isAdmin) {
    return { authorized: true, role: 'admin' };
  }

  // Check if user has required role
  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      redirect: '/dashboard',
      message: `This page is only accessible to ${allowedRoles.join(' or ')} accounts`
    };
  }

  return { authorized: true, role: userRole };
}

/**
 * Protect seller-only routes
 */
export async function requireSeller() {
  return requireRole(['seller']);
}

/**
 * Protect buyer routes (though buyers can access most things)
 */
export async function requireBuyer() {
  return requireRole(['buyer', 'seller']); // Sellers can also buy
}

