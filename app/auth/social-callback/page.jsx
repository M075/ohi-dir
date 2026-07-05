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

