// app/dashboard/favourites/page.jsx
import { redirect } from 'next/navigation';
import { requireRole } from '@/middleware/roleProtection';
import DashboardShell from "@/assets/components/DashboardShell";
import FavouritesClient from "./FavouritesClient";

export default async function FavouritesPage() {
  // Both buyers and sellers can access favourites
  const auth = await requireRole(['buyer', 'seller']);

  if (!auth.authorized) {
    redirect(auth.redirect);
  }

  return (
    <DashboardShell>
      <FavouritesClient />
    </DashboardShell>
  );
}
