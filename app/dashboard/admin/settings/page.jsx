"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import AdminDashboardShell from '@/assets/components/AdminDashboardShell';

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    taxEnabled: true,
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
          <Card>
            <CardHeader>
              <CardTitle>Checkout & Tax</CardTitle>
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

              <div className="pt-4 flex justify-end">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminDashboardShell>
  );
}
