// app/dashboard/orders/page.jsx - SELLER ONLY
import { redirect } from 'next/navigation';
import { requireSeller } from '@/middleware/roleProtection';
import OrdersClient from './OrdersClient';

export default async function OrdersPage() {
  // Sellers and admins can access orders
  const auth = await requireSeller();
  
  if (!auth.authorized) {
    redirect(auth.redirect);
  }

  return <OrdersClient />;
}