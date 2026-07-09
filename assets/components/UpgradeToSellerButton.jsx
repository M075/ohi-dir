// components/UpgradeToSellerButton.jsx - Updated with dynamic fee & instant session update
"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, Loader2 } from 'lucide-react';
import { toast } from '@/components/hooks/use-toast';

export default function UpgradeToSellerButton() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [commissionPercentage, setCommissionPercentage] = useState(null);
  const [feeLoading, setFeeLoading] = useState(true);

  // Fetch the platform commission from admin settings when the dialog opens
  useEffect(() => {
    if (open && commissionPercentage === null) {
      setFeeLoading(true);
      fetch('/api/admin/settings')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          setCommissionPercentage(data?.commissionPercentage ?? 15);
        })
        .catch(() => {
          setCommissionPercentage(0);
        })
        .finally(() => setFeeLoading(false));
    }
  }, [open, commissionPercentage]);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/upgrade-to-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to upgrade account');
      }

      toast({
        title: "Success!",
        description: "Your account has been upgraded to seller.",
      });

      // Update the JWT token in-place so the session has the new role
      // without requiring the user to sign out and back in.
      if (update) {
        await update({ user: { role: 'seller' } });
      }

      setOpen(false);

      // Redirect to the seller dashboard — the sidebar will now show
      // seller navigation because the session already has role='seller'.
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fee = commissionPercentage ?? 15;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg text-white cursor-pointer hover:from-emerald-600 hover:to-teal-700 transition-all">
          <p className="font-semibold mb-1">Become a Seller</p>
          <p className="text-xs opacity-90">Start selling your products today!</p>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to Seller Account</DialogTitle>
          <DialogDescription>
            Start selling your products on Ohi! and reach thousands of customers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium">Create Your Store</p>
                <p className="text-sm text-muted-foreground">
                  Set up your online storefront with custom branding
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium">List Unlimited Products</p>
                <p className="text-sm text-muted-foreground">
                  Add as many products as you want with no restrictions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium">Manage Orders & Shipping</p>
                <p className="text-sm text-muted-foreground">
                  Full order management and integrated shipping options
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium">Track Your Earnings</p>
                <p className="text-sm text-muted-foreground">
                  Built-in wallet and payout system
                </p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
            {feeLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Loading platform fee...
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  Platform Fee: {fee}%
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  We only charge when you make a sale
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading || feeLoading}
            className="flex-1"
            variant='default'
          >
            {loading ? 'Upgrading...' : 'Upgrade Now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}