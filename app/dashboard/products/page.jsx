// app/dashboard/products/page.jsx - SELLER ONLY
import { redirect } from 'next/navigation';
import { requireSeller } from '@/middleware/roleProtection';
import DashboardShell from "@/assets/components/DashboardShell";
import ListProducts from "@/assets/components/ListProducts";

export default async function ListProductsPage() {
  // Protect route - only sellers can access
  const auth = await requireSeller();
  
  if (!auth.authorized) {
    redirect(auth.redirect);
  }

  return (
    <DashboardShell>
      <ListProducts />
    </DashboardShell>
  );
}