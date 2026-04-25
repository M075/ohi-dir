// app/dashboard/orders/[id]/page.jsx
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Package, MapPin, User, CreditCard, Truck } from "lucide-react";
import { toast } from "@/components/hooks/use-toast";
import Image from "next/image";
import DashboardShell from "@/assets/components/DashboardShell";
import { useSession } from "next-auth/react";

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800" },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800" },
  shipped: { label: "Shipped", color: "bg-indigo-100 text-indigo-800" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    status: "",
    trackingNumber: "",
    sellerNotes: "",
  });

  const isSeller = order?.seller?._id === session?.user?.id;

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
      setFormData({
        status: data.status,
        trackingNumber: data.trackingNumber || "",
        sellerNotes: data.sellerNotes || "",
      });
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

  const handleUpdateOrder = async () => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update order");

      const updated = await res.json();
      setOrder(updated);
      
      toast({
        title: "Success",
        description: "Order updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
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
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge className={`${statusConfig[order.status]?.color} ml-auto`}>
            {statusConfig[order.status]?.label}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Order Items */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items
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

            {/* Customer Notes */}
            {order.customerNotes && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.customerNotes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Management */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">{order.buyer?.storename}</p>
                  <p className="text-muted-foreground">{order.buyerEmail}</p>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
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

            {order.trackingNumber && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Number:</span>
                    <span className="font-mono text-xs">{order.trackingNumber}</span>
                  </div>
                  {order.courierProvider && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Courier:</span>
                      <span className="font-medium">{order.courierProvider}</span>
                    </div>
                  )}
                  {order.courierReference && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Reference:</span>
                      <span className="font-mono text-xs">{order.courierReference}</span>
                    </div>
                  )}
                  {order.trackingUrl && (
                    <a
                      className="text-indigo-600 hover:underline"
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View live tracking
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Update Order (Seller Only) */}
            {isSeller && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Update Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="status">Order Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tracking">Tracking Number</Label>
                    <Input
                      id="tracking"
                      value={formData.trackingNumber}
                      onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                      placeholder="Enter tracking number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Seller Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.sellerNotes}
                      onChange={(e) => setFormData({ ...formData, sellerNotes: e.target.value })}
                      placeholder="Add notes about this order..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleUpdateOrder} disabled={updating} className="w-full">
                    {updating ? "Updating..." : "Update Order"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}