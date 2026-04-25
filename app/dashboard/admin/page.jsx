// app/dashboard/admin/page.jsx - Admin dashboard (role-restricted)
import { getServerSession } from 'next-auth';
import { authOptions } from '@/utils/authOptions';
import { redirect } from 'next/navigation';
import AdminDashboardClient from '@/assets/components/AdminDashboardClient';
import AdminDashboardShell from '@/assets/components/AdminDashboardShell';

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  
  // Redirect if not authenticated
  if (!session) {
    redirect('/auth/signin?callbackUrl=/dashboard/admin');
  }
  
  // Redirect if not admin
  if (session.user.role !== 'admin' && !session.user.isAdmin) {
    redirect('/dashboard');
  }
  
  return (
    <AdminDashboardShell>
      <AdminDashboardClient />
    </AdminDashboardShell>
  );
}
