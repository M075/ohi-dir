// app/dashboard/admin/products/page.jsx - Admin Products Management
import { getServerSession } from 'next-auth';
import { authOptions } from '@/utils/authOptions';
import { redirect } from 'next/navigation';
import AdminDashboardShell from '@/assets/components/AdminDashboardShell';
import AdminProductsClient from './AdminProductsClient';

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);
  
  // Redirect if not authenticated
  if (!session) {
    redirect('/auth/signin?callbackUrl=/dashboard/admin/products');
  }
  
  // Redirect if not admin
  if (session.user.role !== 'admin' && !session.user.isAdmin) {
    redirect('/dashboard');
  }
  
  return (
    <AdminDashboardShell>
      <AdminProductsClient />
    </AdminDashboardShell>
  );
}
