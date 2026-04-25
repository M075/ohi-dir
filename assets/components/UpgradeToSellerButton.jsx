// components/UpgradeToSellerButton.jsx - NEW COMPONENT
"use client";
import { useState } from 'react';
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
import { Store, Check } from 'lucide-react';
import { toast } from '@/components/hooks/use-toast';

export default function UpgradeToSellerButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

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
        description: "Your account has been upgraded to seller. Please complete your store setup.",
      });

      // Redirect to onboarding or profile setup
      router.push('/dashboard/profile');
      setOpen(false);
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
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              Platform Fee: 5%
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              We only charge when you make a sale
            </p>
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
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? 'Upgrading...' : 'Upgrade Now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
