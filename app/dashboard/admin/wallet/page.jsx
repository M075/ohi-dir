// app/dashboard/admin/wallet/page.jsx - Admin Wallet/Transactions Management
import { getServerSession } from 'next-auth';
import { authOptions } from '@/utils/authOptions';
import { redirect } from 'next/navigation';
import AdminDashboardShell from '@/assets/components/AdminDashboardShell';
import AdminWalletClient from './AdminWalletClient';

export default async function AdminWalletPage() {
  const session = await getServerSession(authOptions);
  
  // Redirect if not authenticated
  if (!session) {
    redirect('/auth/signin?callbackUrl=/dashboard/admin/wallet');
  }
  
  // Redirect if not admin
  if (session.user.role !== 'admin' && !session.user.isAdmin) {
    redirect('/dashboard');
  }
  
  return (
    <AdminDashboardShell>
      <AdminWalletClient />
    </AdminDashboardShell>
  );
}
