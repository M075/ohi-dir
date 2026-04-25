// app/dashboard/purchases/[id]/page.jsx
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Package, MapPin, Store, Truck, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";
import DashboardShell from "@/assets/components/DashboardShell";

const statusConfig = {
  pending: { label: "Order Placed", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800", icon: Package },
  shipped: { label: "Shipped", color: "bg-indigo-100 text-indigo-800", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: Package },
};

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      
      const data = await res.json();
      setOrder(data);
    } catch (error) {
      console.error("Error fetching order:", error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="text-center py-12">Loading order details...</div>
      </DashboardShell>
    );
  }

  if (!order) {
    return (
      <DashboardShell>
        <div className="text-center py-12">Order not found</div>
      </DashboardShell>
    );
  }

  // Timeline for order tracking
  const timeline = [
    { status: 'pending', label: 'Order Placed', date: order.createdAt },
    { status: 'confirmed', label: 'Confirmed', date: order.confirmedAt },
    { status: 'shipped', label: 'Shipped', date: order.shippedAt },
    { status: 'delivered', label: 'Delivered', date: order.deliveredAt },
  ];

  const currentStatusIndex = timeline.findIndex(t => t.status === order.status);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <Badge className={`${statusConfig[order.status]?.color} ml-auto`}>
            {statusConfig[order.status]?.label}
          </Badge>
        </div>

        {/* Order Tracking Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Order Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute top-5 left-5 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-6">
                {timeline.map((step, idx) => {
                  const isCompleted = idx <= currentStatusIndex;
                  const isCurrent = idx === currentStatusIndex;
                  const StatusIcon = statusConfig[step.status]?.icon || Package;

                  return (
                    <div key={step.status} className="relative flex items-start gap-4">
                      <div className={`
                        relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2
                        ${isCompleted 
                          ? 'bg-emerald-600 border-emerald-600' 
                          : 'bg-white dark:bg-zinc-900 border-gray-300 dark:border-gray-700'
                        }
                      `}>
                        <StatusIcon className={`h-5 w-5 ${isCompleted ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        {step.date && (
                          <p className="text-sm text-muted-foreground">
                            {new Date(step.date).toLocaleDateString('en-ZA', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {order.trackingNumber && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium mb-1">Tracking Number</p>
                <p className="font-mono text-lg">{order.trackingNumber}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Order Items */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Items Ordered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 pb-4 border-b last:border-0">
                      <div className="w-20 h-20 rounded border overflow-hidden bg-gray-100">
                        <Image
                          src={item.product?.images?.[0] || item.productSnapshot?.image || '/image.png'}
                          alt={item.productSnapshot?.title || 'Product'}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.productSnapshot?.title || 'Product'}</h4>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        {item.product && (
                          <Link 
                            href={`/products/${item.product._id}`}
                            className="text-sm text-emerald-600 hover:underline"
                          >
                            View Product
                          </Link>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">R {(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">R {item.price} each</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>R {order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>R {order.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>R {order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>R {order.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Info */}
          <div className="space-y-6">
            {/* Seller Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Seller
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">{order.sellerName || order.seller?.storename}</p>
                  <Link 
                    href={`/stores/${order.seller._id}`}
                    className="text-emerald-600 hover:underline"
                  >
                    Visit Store
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{order.shippingAddress?.fullName}</p>
                <p>{order.shippingAddress?.address}</p>
                {order.shippingAddress?.apartment && <p>{order.shippingAddress.apartment}</p>}
                <p>
                  {order.shippingAddress?.city}, {order.shippingAddress?.province}{" "}
                  {order.shippingAddress?.zipCode}
                </p>
                <p className="text-muted-foreground">{order.shippingAddress?.phone}</p>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-2">
                <Button className="w-full" variant="outline" onClick={() => router.push('/dashboard/purchases')}>
                  Back to Purchases
                </Button>
                {order.status === 'delivered' && (
                  <Button className="w-full" variant="outline">
                    Leave a Review
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}