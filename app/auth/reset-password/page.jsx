// app/auth/reset-password/page.jsx - Set a new password from an emailed link
'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';

const MIN_LENGTH = 8;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  // 'checking' until the token has been validated server-side, so the user is
  // never invited to type a new password into a form that cannot work.
  const [tokenState, setTokenState] = useState('checking');
  const [accountEmail, setAccountEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const verifyToken = useCallback(async () => {
    if (!token) {
      setTokenState('invalid');
      setTokenError('This link is missing its reset token.');
      return;
    }

    try {
      const response = await fetch(
        `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
        { cache: 'no-store' }
      );
      const data = await response.json();

      if (!response.ok || !data.valid) {
        setTokenState('invalid');
        setTokenError(data.error || 'This reset link is no longer valid.');
        return;
      }

      setAccountEmail(data.email || '');
      setTokenState('valid');
    } catch (err) {
      console.error('Token check error:', err);
      setTokenState('invalid');
      setTokenError('We could not verify this link. Please request a new one.');
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters`);
      return;
    }

    if (password !== confirmPassword) {
      setError('The two passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Could not update your password. Please try again.');
        return;
      }

      setDone(true);

      // The user has just proved control of the mailbox and chosen the
      // password, so signing them straight in is safe and saves a round trip.
      // If it doesn't take, the sign-in link below still gets them there.
      if (accountEmail) {
        const result = await signIn('credentials', {
          email: accountEmail,
          password,
          redirect: false,
        });

        if (!result?.error) {
          router.push('/dashboard');
          router.refresh();
        }
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenState === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Checking your link...</p>
      </div>
    );
  }

  if (tokenState === 'invalid') {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mt-6 text-3xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
          This link has expired
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{tokenError}</p>

        <div className="mt-8 space-y-3">
          <Button asChild className="w-full">
            <Link href="/auth/forgot-password">Request a new link</Link>
          </Button>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="mt-6 text-3xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
          Password updated
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
          You&apos;re all set. We&apos;re signing you in now.
        </p>

        <Button asChild className="mt-8 w-full">
          <Link href="/auth/signin">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
          Choose a new password
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
          {accountEmail ? (
            <>
              Setting a new password for{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{accountEmail}</span>
            </>
          ) : (
            'Pick something you have not used elsewhere.'
          )}
        </p>
      </div>

      <div className="mt-10">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
            >
              New password
            </label>
            <div className="mt-2 relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
                minLength={MIN_LENGTH}
                disabled={submitting}
                className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 dark:bg-zinc-900 dark:ring-gray-700 dark:text-white sm:text-sm sm:leading-6"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                disabled={submitting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              At least {MIN_LENGTH} characters.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
            >
              Confirm new password
            </label>
            <div className="mt-2">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                required
                disabled={submitting}
                className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 dark:bg-zinc-900 dark:ring-gray-700 dark:text-white sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full flex-1">
      <div className="flex flex-1 flex-col justify-center px-4 pt-12 pb-20 sm:py-20 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* useSearchParams needs a Suspense boundary to prerender. */}
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <img
          alt="Set a new password"
          src="/cover-image.jpg"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 dark:from-black/90 via-transparent to-transparent"></div>
      </div>
    </div>
  );
}
