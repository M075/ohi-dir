// assets/components/AdminDashboardClient.jsx
"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Truck,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const StatsCard = ({ title, value, icon: Icon, color = "emerald", trend }) => {
  const colorClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
    orange: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30",
    red: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
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
        {trend && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <TrendingUp className="h-3 w-3 mr-1 text-emerald-600" />
            <span>{trend} from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    totalBuyers: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    activeStores: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [flaggedProducts, setFlaggedProducts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
        setRecentUsers(data.recentUsers);
        setFlaggedProducts(data.flaggedProducts);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Error performing user action:", error);
    }
  };

  const handleProductAction = async (productId, action) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Error performing product action:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your marketplace platform
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/admin/settings">Settings</Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            color="emerald"
            trend="+12%"
          />
          <StatsCard
            title="Active Stores"
            value={stats.activeStores}
            icon={ShoppingCart}
            color="blue"
            trend="+8%"
          />
          <StatsCard
            title="Total Products"
            value={stats.totalProducts}
            icon={Package}
            color="purple"
            trend="+15%"
          />
          <StatsCard
            title="Total Revenue"
            value={`R ${stats.totalRevenue.toFixed(2)}`}
            icon={TrendingUp}
            color="orange"
            trend="+23%"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="flagged">Flagged Items</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">#{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.buyer?.storename}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge>{order.status}</Badge>
                        <p className="font-semibold">R {order.total.toFixed(2)}</p>
                        <Link href={`/dashboard/admin/orders/${order._id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Image
                          src={user.image || "/profile.png"}
                          alt={user.storename}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div>
                          <p className="font-medium">{user.storename}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Suspended"}
                        </Badge>
                        <Link href={`/stores/${user._id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {user.isActive ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUserAction(user._id, "suspend")}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleUserAction(user._id, "activate")}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>All Products</CardTitle>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="lowstock">Low Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Product management interface - Link to detailed product list
                </p>
                <Link href="/dashboard/admin/products">
                  <Button className="mt-4">View All Products</Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flagged Items Tab */}
          <TabsContent value="flagged" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Flagged Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {flaggedProducts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No flagged items
                    </p>
                  ) : (
                    flaggedProducts.map((product) => (
                      <div
                        key={product._id}
                        className="flex items-center justify-between p-4 border rounded-lg border-red-200"
                      >
                        <div className="flex items-center gap-4">
                          <Image
                            src={product.images[0] || "/image.png"}
                            alt={product.title}
                            width={60}
                            height={60}
                            className="rounded"
                          />
                          <div>
                            <p className="font-medium">{product.title}</p>
                            <p className="text-sm text-red-600">
                              {product.flagReason}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleProductAction(product._id, "approve")
                            }
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleProductAction(product._id, "remove")
                            }
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/dashboard/admin/orders">
                <Button variant="outline" className="w-full">
                  <Truck className="h-4 w-4 mr-2" />
                  Manage Orders
                </Button>
              </Link>
              <Link href="/dashboard/admin/users">
                <Button variant="outline" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/dashboard/admin/products">
                <Button variant="outline" className="w-full">
                  <Package className="h-4 w-4 mr-2" />
                  Manage Products
                </Button>
              </Link>
              <Link href="/dashboard/admin/payments">
                <Button variant="outline" className="w-full">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Payments
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
