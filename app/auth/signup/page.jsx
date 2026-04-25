// app/auth/signup/page.jsx - Updated with role selection
'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Store, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from '@/components/hooks/use-toast';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Get role from URL params (default to buyer)
  const accountType = searchParams.get('type') || 'buyer';
  const isSeller = accountType === 'seller';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    storename: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email || !formData.password || !formData.storename) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Register user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          storename: formData.storename,
          role: accountType, // Pass the role from URL
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Auto sign in after registration
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Account created!',
        description: isSeller 
          ? 'Welcome! Let\'s set up your store.' 
          : 'Welcome to Ohi! Start shopping now.',
      });

      // Redirect based on role
      if (isSeller) {
        router.push('/onboarding'); // Sellers go to onboarding
      } else {
        router.push('/'); // Buyers go to home
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = async (provider) => {
    try {
      // For social signup, we'll handle role in the callback
      const callbackUrl = isSeller 
        ? `/auth/social-callback?type=seller`
        : '/';
      
      await signIn(provider, { callbackUrl });
    } catch (error) {
      console.error('Social signup error:', error);
      setError('Failed to sign up with ' + provider);
    }
  };

  return (
    <div className="flex min-h-full flex-1">
      {/* Left Side - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 pt-12 pb-20 sm:py-20 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className='text-center mb-6'>
            {/* Account Type Badge */}
            <div className="mb-6">
              {isSeller ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                  <Store className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Seller Account
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    Buyer Account
                  </span>
                </div>
              )}
            </div>

            <h2 className="text-3xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
              {isSeller ? 'Create Your Store' : 'Create an Account'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
              {isSeller 
                ? 'Already have an account? '
                : 'Already have an account? '
              }
              <Link href="/auth/signin" className="font-semibold text-emerald-600 hover:text-emerald-500">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-10">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Social Sign Up */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={() => handleSocialSignup('google')}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={() => handleSocialSignup('facebook')}
              >
                <svg className="mr-2 h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm font-medium leading-6">
                <span className="bg-white dark:bg-zinc-950 px-6 text-gray-900 dark:text-white">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email Sign Up Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="storename" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                  {isSeller ? 'Store Name' : 'Full Name'} <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <Input
                    id="storename"
                    name="storename"
                    type="text"
                    placeholder={isSeller ? 'My Awesome Store' : 'John Doe'}
                    value={formData.storename}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 dark:bg-zinc-900 dark:ring-gray-700 dark:text-white sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                  Email address <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 dark:bg-zinc-900 dark:ring-gray-700 dark:text-white sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="mt-2 relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 dark:bg-zinc-900 dark:ring-gray-700 dark:text-white sm:text-sm sm:leading-6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Must be at least 6 characters
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 dark:bg-zinc-900 dark:ring-gray-700 dark:text-white sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  isSeller ? 'Create Store Account' : 'Create Account'
                )}
              </Button>
            </form>

            {/* Role Switch Link */}
            <div className="mt-8 text-center">
              {isSeller ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Just want to shop?{' '}
                  <Link href="/auth/signup?type=buyer" className="font-semibold text-emerald-600 hover:text-emerald-500">
                    Create a buyer account instead
                  </Link>
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Want to sell on Ohi!?{' '}
                  <Link href="/auth/signup?type=seller" className="font-semibold text-emerald-600 hover:text-emerald-500">
                    Register your store
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <img
          alt="Sign up"
          src="/cover-image-2.jpg"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 dark:from-black/90 via-transparent to-transparent"></div>

      </div>
    </div>
  );
}