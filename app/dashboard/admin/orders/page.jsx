// app/dashboard/admin/orders/page.jsx - Admin Orders Management
import { getServerSession } from 'next-auth';
import { authOptions } from '@/utils/authOptions';
import { redirect } from 'next/navigation';
import AdminDashboardShell from '@/assets/components/AdminDashboardShell';
import AdminOrdersClient from './AdminOrdersClient';

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions);
  
  // Redirect if not authenticated
  if (!session) {
    redirect('/auth/signin?callbackUrl=/dashboard/admin/orders');
  }
  
  // Redirect if not admin
  if (session.user.role !== 'admin' && !session.user.isAdmin) {
    redirect('/dashboard');
  }
  
  return (
    <AdminDashboardShell>
      <AdminOrdersClient />
    </AdminDashboardShell>
  );
}
