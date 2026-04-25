// app/auth/social-callback/page.jsx - Handle social auth with role
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SocialCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountType = searchParams.get('type') || 'buyer';

  useEffect(() => {
    const updateUserRole = async () => {
      if (status === 'loading') return;

      if (!session?.user) {
        router.push('/auth/signin');
        return;
      }

      try {
        // Update user role if signing up as seller via social auth
        if (accountType === 'seller') {
          const response = await fetch('/api/users/update-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'seller' }),
          });

          if (!response.ok) {
            throw new Error('Failed to update role');
          }

          // Redirect to onboarding for sellers
          router.push('/onboarding');
        } else {
          // Redirect to home for buyers
          router.push('/');
        }
      } catch (error) {
        console.error('Callback error:', error);
        router.push('/');
      }
    };

    updateUserRole();
  }, [session, status, accountType, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-emerald-600" />
        <p className="text-lg font-medium">Setting up your account...</p>
        <p className="text-sm text-muted-foreground mt-2">Please wait</p>
      </div>
    </div>
  );
}

// app/api/users/update-role/route.js - API to update user role after social auth
import connectDB from '@/config/database';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

export async function POST(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { role } = await request.json();

    // Validate role
    if (!['buyer', 'seller'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update user role
    const user = await User.findByIdAndUpdate(
      sessionUser.userId,
      { 
        role,
        isOnboarded: role === 'buyer', // Buyers skip onboarding, sellers need it
        isVerifiedSeller: false,
      },
      { new: true }
    );

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user._id,
          role: user.role,
          isOnboarded: user.isOnboarded,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update role error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update role' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}