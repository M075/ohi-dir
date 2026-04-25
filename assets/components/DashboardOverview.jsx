"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  TrendingUp,
  DollarSign,
  Star,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Eye,
  Users,
  ShoppingCart,
  Pencil,
  PencilIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, trend, color = "emerald" }) => {
  const colorClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
    orange: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30",
  };

  return (
    <Card className="border-0 shadow-sm bg-zinc-100 dark:bg-zinc-900">
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

// Loading State
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  </div>
);

// Recent Products Component
const RecentProducts = ({ products, className }) => {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-4">No products yet</p>
        <Link href="/dashboard/products/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Product
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {products.slice(0, 5).map((product) => (
          <Link key={product._id} href={`/dashboard/products/edit/${product._id}`}>

        <div
          key={product._id}
          className="flex items-center justify-between p-4 mb-3 border-0 bg-white dark:bg-zinc-800 rounded-lg hover:bg-muted/90 dark:hover:bg-muted/80 transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
              {product.images?.[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium">{product.title}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>R {product.price}</span>
                <span>•</span>
                <span>Stock: {product.stock}</span>
                {product.rating > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                      {product.rating}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
            <Button variant="outline" size="sm">
              <PencilIcon className="h-4 w-4" />
            </Button>
        </div>
          </Link>
      ))}
      {products.length > 5 && (
        <Link href="/dashboard/products">
          <Button variant="outline" className="w-full mt-2">
            View All Products
            <ArrowUpRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      )}
    </div>
  );
};

// Quick Actions Component
const QuickActions = () => {
  const actions = [
    {
      title: "Add Product",
      description: "List a new item for sale",
      icon: Plus,
      href: "/dashboard/products/add",
      color: "emerald",
    },
    {
      title: "View Products",
      description: "Manage your inventory",
      icon: Package,
      href: "/dashboard/products",
      color: "blue",
    },
    {
      title: "Edit Profile",
      description: "Update store information",
      icon: Users,
      href: "/dashboard/profile",
      color: "purple",
    },
    {
      title: "View Store",
      description: "See your public storefront",
      icon: Eye,
      href: "/stores",
      color: "orange",
    },
  ];

  const colorClasses = {
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {actions.map((action) => (
        <Link key={action.title} href={action.href}>
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-800 hover:bg-muted/50 dark:hover:bg-muted/80 transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${colorClasses[action.color]}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

// Low Stock Alert Component
const LowStockAlert = ({ products }) => {
  const lowStockProducts = products?.filter((p) => p.stock < 5) || [];

  if (lowStockProducts.length === 0) return null;

  return (
    <Card className="bg-orange-50 border-none dark:bg-yellow-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <AlertCircle className="h-5 w-5" />
          Low Stock Alert
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lowStockProducts.slice(0, 3).map((product) => (
            <div
              key={product._id}
              className="flex items-center justify-between text-sm"
            >
              <span className="font-medium">{product.title}</span>
              <span className="text-orange-600 dark:text-orange-400">
                {product.stock} left
              </span>
            </div>
          ))}
          {lowStockProducts.length > 3 && (
            <p className="text-sm text-muted-foreground">
              +{lowStockProducts.length - 3} more items
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Dashboard Component
export default function DashboardOverview() {
  const { data: session } = useSession();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    avgRating: 0,
    totalStock: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) return;

      try {
        const res = await fetch(`/api/products/user/${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data);

          // Calculate stats
          const totalValue = data.reduce(
            (sum, p) => sum + (p.price * p.stock || 0),
            0
          );
          const totalStock = data.reduce((sum, p) => sum + (p.stock || 0), 0);
          const avgRating =
            data.reduce((sum, p) => sum + (p.rating || 0), 0) / (data.length || 1);

          setStats({
            totalProducts: data.length,
            totalValue,
            avgRating: avgRating.toFixed(1),
            totalStock,
          });
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session?.user?.name}
          </p>
        </div>
        <Link href="/dashboard/products/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          color="emerald"
        />
        <StatsCard
          title="Inventory Value"
          value={`R ${stats.totalValue.toFixed(2)}`}
          icon={DollarSign}
          color="blue"
        />
        <StatsCard
          title="Average Rating"
          value={stats.avgRating}
          icon={Star}
          color="purple"
        />
        <StatsCard
          title="Total Stock"
          value={stats.totalStock}
          icon={ShoppingCart}
          color="orange"
        />
      </div>

      {/* Quick Actions & Low Stock */}
      <div className=" grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="border-0 shadow-sm bg-zinc-100 dark:bg-zinc-900"> 
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickActions />
            </CardContent>
          </Card>
        </div>
        <LowStockAlert products={products} />
      </div>

      {/* Recent Products */}
      <Card className="border-0 shadow-sm bg-zinc-100 dark:bg-zinc-900">
        <CardHeader>
          <CardTitle>Recent Products</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentProducts products={products} />
        </CardContent>
      </Card>
    </div>
  );
}