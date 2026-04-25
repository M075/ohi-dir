// app/dashboard/admin/buyers/AdminBuyersClient.jsx - Admin Buyers Client Component
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
  Users,
  Search,
  Eye,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  DollarSign,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/components/hooks/use-toast";

const statusConfig = {
  active: { label: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  suspended: { label: "Suspended", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

export default function AdminBuyersClient() {
  const { toast } = useToast();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  useEffect(() => {
    fetchBuyers();
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchBuyers();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/admin/buyers?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setBuyers(data.buyers || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 1,
        }));
      }
    } catch (error) {
      console.error("Error fetching buyers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerAction = async (buyerId, action) => {
    try {
      const res = await fetch(`/api/admin/buyers/${buyerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `Buyer ${action}d successfully`,
        });
        fetchBuyers();
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
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Buyers Management</h1>
          <p className="text-muted-foreground">
            Manage all buyers on the platform
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search buyers by name or email..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Buyers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Buyers ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading buyers...</div>
          ) : buyers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No buyers found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buyers.map((buyer) => (
                    <TableRow key={buyer._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                            <Image
                              src={buyer.image || "/profile.png"}
                              alt={buyer.storename || "Buyer"}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div>
                            <p className="font-medium">{buyer.storename || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{buyer.city || "No location"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{buyer.email}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                          <span>{buyer.totalOrders || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>R {(buyer.totalSpent || 0).toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[buyer.isActive ? "active" : "suspended"]?.color}>
                          {buyer.isActive ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(buyer.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/stores/${buyer._id}`}>
                            <Button size="sm" variant="ghost" title="View Profile">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {buyer.isActive ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Suspend"
                              onClick={() => handleBuyerAction(buyer._id, "suspend")}
                            >
                              <Ban className="h-4 w-4 text-orange-500" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Activate"
                              onClick={() => handleBuyerAction(buyer._id, "activate")}
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} buyers
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
