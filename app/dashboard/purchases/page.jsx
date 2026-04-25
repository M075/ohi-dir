// app/dashboard/purchases/page.jsx - BUYERS & SELLERS
import { redirect } from 'next/navigation';
import { requireRole } from '@/middleware/roleProtection';
import PurchasesClient from './PurchasesClient';

export default async function PurchasesPage() {
  // Both buyers and sellers can access purchases
  const auth = await requireRole(['buyer', 'seller']);
  
  if (!auth.authorized) {
    redirect(auth.redirect);
  }

  return <PurchasesClient />;
}