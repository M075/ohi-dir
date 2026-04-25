// app/payment/success/page.jsx
"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Package } from 'lucide-react';
import Link from 'next/link';

const PAYFAST_STORAGE_KEY = 'payfast:lastPaymentId';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const paymentIdFromUrl = searchParams.get('m_payment_id');
    const storedPaymentId = typeof window !== 'undefined'
      ? sessionStorage.getItem(PAYFAST_STORAGE_KEY)
      : null;
    const paymentId = paymentIdFromUrl || storedPaymentId;
    const paymentStatus = searchParams.get('payment_status');
    const normalizedStatus = paymentStatus?.toUpperCase() || null;
    
    console.log('Payment return:', { paymentId, paymentStatus });

    if (!paymentId) {
      setError('No payment information found');
      setVerifying(false);
      return;
    }

    setError(null);
    setVerifying(true);

    if (normalizedStatus !== 'COMPLETE') {
      console.warn('Payment status not marked COMPLETE on return. Proceeding with server verification.');
    }

    verifyPayment(paymentId);
  }, [searchParams]);

  const verifyPayment = async (paymentId) => {
    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrderData(data);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(PAYFAST_STORAGE_KEY);
        }
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setError('Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-emerald-600" />
            <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold">Payment Issue</h1>
            <p className="text-muted-foreground">{error}</p>
            <div className="space-y-2 pt-4">
              <Link href="/checkout">
                <Button className="w-full">Try Again</Button>
              </Link>
              <Link href="/cart">
                <Button variant="outline" className="w-full">Back to Cart</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-12 w-12 text-emerald-600" />
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
              <p className="text-muted-foreground">
                Thank you for your purchase. Your order has been confirmed.
              </p>
            </div>

            {orderData && (
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Number(s)</span>
                  <span className="font-medium">{orderData.orderNumbers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-medium">R {orderData.amount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Status</span>
                  <span className="text-emerald-600 font-medium">Paid</span>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-4">
              <Link href="/dashboard/purchases" className="block">
                <Button className="w-full" size="lg">
                  <Package className="h-4 w-4 mr-2" />
                  View My Orders
                </Button>
              </Link>
              
              <Link href="/products" className="block">
                <Button variant="outline" className="w-full" size="lg">
                  Continue Shopping
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to your email address.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}