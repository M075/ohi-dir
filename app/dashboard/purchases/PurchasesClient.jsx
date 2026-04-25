// app/dashboard/purchases/PurchasesClient.jsx
"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, ShoppingBag, Truck, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import DashboardShell from "@/assets/components/DashboardShell";

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: CheckCircle2 },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", icon: Package },
  shipped: { label: "Shipped", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: Package },
};

const StatsCard = ({ title, value, icon: Icon, color = "emerald" }) => {
  const colorClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
    orange: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30",
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
};

const PurchaseCard = ({ order }) => {
  const StatusIcon = statusConfig[order.status]?.icon || Package;
  
  return (
    <Link href={`/dashboard/purchases/${order._id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Order #{order.orderNumber}</h3>
                <Badge className={statusConfig[order.status]?.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[order.status]?.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString('en-ZA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">R {order.total.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">{order.items.length} items</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Seller:</span>
              <span className="font-medium">{order.sellerName || order.seller?.storename || 'Store'}</span>
            </div>
            
            {order.trackingNumber && (
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tracking:</span>
                <span className="font-mono text-xs">{order.trackingNumber}</span>
              </div>
            )}

            {order.status === 'delivered' && order.deliveredAt && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Delivered on {new Date(order.deliveredAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {order.items.length > 0 && (
            <div className="mt-4 flex gap-2">
              {order.items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="w-12 h-12 rounded border overflow-hidden bg-gray-100">
                  <Image
                    src={item.product?.images?.[0] || item.productSnapshot?.image || '/image.png'}
                    alt={item.productSnapshot?.title || 'Product'}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
              {order.items.length > 3 && (
                <div className="w-12 h-12 rounded border flex items-center justify-center bg-gray-100 text-xs font-medium">
                  +{order.items.length - 3}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default function PurchasesClient() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    inTransit: 0,
    delivered: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    fetchPurchases();
  }, [filter]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ type: 'purchases' });
      if (filter !== 'all') params.append('status', filter);
      
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data);

      // Calculate stats
      const totalSpent = data.reduce((sum, order) => sum + order.total, 0);
      setStats({
        total: data.length,
        inTransit: data.filter(o => ['confirmed', 'processing', 'shipped'].includes(o.status)).length,
        delivered: data.filter(o => o.status === 'delivered').length,
        totalSpent,
      });
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Purchases</h1>
            <p className="text-muted-foreground">Track your orders and purchase history</p>
          </div>
          <Button asChild>
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard title="Total Orders" value={stats.total} icon={ShoppingBag} color="emerald" />
          <StatsCard title="In Transit" value={stats.inTransit} icon={Truck} color="blue" />
          <StatsCard title="Delivered" value={stats.delivered} icon={CheckCircle2} color="purple" />
          <StatsCard 
            title="Total Spent" 
            value={`R ${stats.totalSpent.toFixed(2)}`} 
            icon={Package} 
            color="orange" 
          />
        </div>

        {/* Purchase List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order History</CardTitle>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading purchases...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No purchases yet</p>
                <Button asChild>
                  <Link href="/products">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <PurchaseCard key={order._id} order={order} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
