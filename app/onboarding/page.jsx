// app/onboarding/page.jsx
import OnboardingFlow from '@/assets/components/OnboardingFlow';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/utils/authOptions';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  // If already onboarded, redirect to dashboard
  if (session.user.isOnboarded) {
    redirect('/dashboard');
  }

  return <OnboardingFlow />;
}

// ============================================
// middleware.js - Enhanced with onboarding check
// ============================================

// ============================================
// app/api/auth/signup/route.js - Email/Password Signup (Optional)
// ============================================

// ============================================
// app/auth/signin/page.jsx - Custom Sign-In Page
// ============================================
