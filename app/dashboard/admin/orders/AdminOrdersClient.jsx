// app/dashboard/admin/orders/AdminOrdersClient.jsx - Admin Orders Client Component
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ShoppingCart,
  Search,
  Eye,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  DollarSign,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/components/hooks/use-toast";

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: CheckCircle2 },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", icon: Package },
  shipped: { label: "Shipped", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: XCircle },
};

export default function AdminOrdersClient() {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, statusFilter, dateFilter]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchOrders();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFilter !== "all") params.append("dateRange", dateFilter);

      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setOrders(data.orders || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 1,
        }));
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAction = async (orderId, action, newStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, status: newStatus }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: action === "cancel" ? "Order cancelled successfully" : "Order updated successfully",
        });
        fetchOrders();
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.error || "Action failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error performing action:", error);
      toast({
        title: "Error",
        description: "Action failed. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const StatsCard = ({ title, value, icon: Icon, color = "emerald" }) => {
    const colorClasses = {
      emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
      yellow: "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30",
      blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
      green: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
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
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground">
            Manage all orders on the platform
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatsCard title="Total Orders" value={stats.total} icon={ShoppingCart} color="emerald" />
        <StatsCard title="Pending" value={stats.pending} icon={Clock} color="yellow" />
        <StatsCard title="Processing" value={stats.processing} icon={Package} color="blue" />
        <StatsCard title="Delivered" value={stats.completed} icon={CheckCircle2} color="green" />
        <StatsCard title="Cancelled" value={stats.cancelled} icon={XCircle} color="red" />
      </div>

      {/* Revenue Card */}
      <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Total Revenue (Delivered Orders)</p>
              <p className="text-3xl font-bold">R {(stats.totalRevenue || 0).toFixed(2)}</p>
            </div>
            <DollarSign className="h-12 w-12 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, buyer, or seller..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Orders ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const StatusIcon = statusConfig[order.status]?.icon || Package;
                    return (
                      <TableRow key={order._id}>
                        <TableCell>
                          <p className="font-mono font-medium text-sm">
                            {order.orderNumber}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {order.buyer?.storename || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.buyerEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {order.seller?.storename || order.sellerName || "Unknown"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {order.items?.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="w-8 h-8 rounded overflow-hidden bg-gray-100">
                                <Image
                                  src={item.productSnapshot?.image || item.product?.images?.[0] || "/image.png"}
                                  alt="Product"
                                  width={32}
                                  height={32}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                            ))}
                            {(order.items?.length || 0) > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{order.items.length - 2}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            R {order.total?.toFixed(2) || "0.00"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[order.status]?.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[order.status]?.label || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link href={`/dashboard/orders/${order._id}`}>
                              <Button size="sm" variant="ghost" title="View Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            
                            {/* Update Status Dropdown */}
                            <Select
                              value=""
                              onValueChange={(value) => handleOrderAction(order._id, "update_status", value)}
                            >
                              <SelectTrigger className="w-[100px] h-8 text-xs">
                                <SelectValue placeholder="Update" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="confirmed">Confirm</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Cancel Order */}
                            {!["delivered", "cancelled"].includes(order.status) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" title="Cancel Order">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to cancel order {order.orderNumber}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>No, keep order</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleOrderAction(order._id, "cancel")}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Yes, cancel order
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} orders
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
