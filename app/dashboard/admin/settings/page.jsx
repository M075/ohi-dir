"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/hooks/use-toast';
import { Loader2, Save, Percent } from 'lucide-react';
import AdminDashboardShell from '@/assets/components/AdminDashboardShell';

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    taxEnabled: true,
    commissionPercentage: 15,
  });

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && session?.user?.role !== 'admin' && !session?.user?.isAdmin)) {
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status, session, router]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          taxEnabled: data.taxEnabled ?? true,
          commissionPercentage: data.commissionPercentage ?? 15,
        });
      } else {
        throw new Error('Failed to fetch settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTax = () => {
    setSettings((prev) => ({ ...prev, taxEnabled: !prev.taxEnabled }));
  };

  const handleCommissionChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setSettings((prev) => ({
        ...prev,
        commissionPercentage: Math.min(100, Math.max(0, value)),
      }));
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast({
          title: "Settings Saved",
          description: "Global settings have been successfully updated.",
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <AdminDashboardShell>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminDashboardShell>
    );
  }

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage application-wide configurations and features.
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Checkout & Tax Card */}
          <Card>
            <CardHeader>
              <CardTitle>Checkout &amp; Tax</CardTitle>
              <CardDescription>
                Configure how taxes are applied during the checkout process.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-base font-medium text-foreground">
                    Enable Tax (15% VAT)
                  </label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, a 15% tax will be applied to the order subtotal.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.taxEnabled}
                  onClick={handleToggleTax}
                  className={`${
                    settings.taxEnabled ? 'bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-700'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2`}
                >
                  <span
                    aria-hidden="true"
                    className={`${
                      settings.taxEnabled ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Platform Commission Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-emerald-600" />
                Platform Commission
              </CardTitle>
              <CardDescription>
                Set the percentage the platform takes from each sale. This is deducted from the seller&apos;s product subtotal — no extra cost to the buyer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commissionPercentage">
                  Commission Percentage
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="commissionPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={settings.commissionPercentage}
                    onChange={handleCommissionChange}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground font-medium">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  For example, if set to {settings.commissionPercentage}%, a R1,000 sale will give the platform R{(1000 * settings.commissionPercentage / 100).toFixed(2)} and the seller R{(1000 - (1000 * settings.commissionPercentage / 100)).toFixed(2)}.
                </p>
              </div>

              {/* Visual breakdown preview */}
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                <p className="text-sm font-medium">Example breakdown on a R1,000 sale:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Platform Commission:</span>
                  <span className="font-semibold text-emerald-600">
                    R {(1000 * settings.commissionPercentage / 100).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">Seller Receives:</span>
                  <span className="font-semibold">
                    R {(1000 - (1000 * settings.commissionPercentage / 100)).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AdminDashboardShell>
  );
}
