// app/dashboard/page.jsx - SELLER DASHBOARD or BUYER REDIRECT
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/utils/authOptions';
import DashboardShell from "@/assets/components/DashboardShell";
import DashboardOverview from "@/assets/components/DashboardOverview";

export const metadata = {
  title: "Dashboard | Ohi!",
  description: "Manage your products and view store analytics",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  const userRole = session.user.role || 'buyer';
  const isSeller = userRole === 'seller' || session.user.isAdmin;

  // Redirect buyers to their purchases page
  if (!isSeller) {
    redirect('/dashboard/purchases');
  }

  // Show seller dashboard
  return (
    <DashboardShell>
      <DashboardOverview />
    </DashboardShell>
  );
}