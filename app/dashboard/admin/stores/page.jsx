// app/dashboard/admin/stores/page.jsx - Admin Stores Management
import { getServerSession } from 'next-auth';
import { authOptions } from '@/utils/authOptions';
import { redirect } from 'next/navigation';
import AdminDashboardShell from '@/assets/components/AdminDashboardShell';
import AdminStoresClient from './AdminStoresClient';

export default async function AdminStoresPage() {
  const session = await getServerSession(authOptions);
  
  // Redirect if not authenticated
  if (!session) {
    redirect('/auth/signin?callbackUrl=/dashboard/admin/stores');
  }
  
  // Redirect if not admin
  if (session.user.role !== 'admin' && !session.user.isAdmin) {
    redirect('/dashboard');
  }
  
  return (
    <AdminDashboardShell>
      <AdminStoresClient />
    </AdminDashboardShell>
  );
}
