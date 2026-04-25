// app/dashboard/admin/wallet/AdminWalletClient.jsx - Admin Wallet/Transactions Client Component
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Wallet,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  TrendingUp,
  CreditCard,
  Receipt,
  Download,
  Eye,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/components/hooks/use-toast";

const transactionTypeConfig = {
  sale: { label: "Sale", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: ArrowDownRight },
  payout: { label: "Payout", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: ArrowUpRight },
  refund: { label: "Refund", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: ArrowUpRight },
  fee: { label: "Fee", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", icon: Receipt },
};

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  failed: { label: "Failed", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

export default function AdminWalletClient() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalFees: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    totalTransactions: 0,
  });
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [activeTab, setActiveTab] = useState("transactions");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetailsOpen, setTransactionDetailsOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchPendingPayouts();
  }, [pagination.page, typeFilter, statusFilter]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchTransactions();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (searchTerm) params.append("search", searchTerm);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/admin/wallet?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setTransactions(data.transactions || []);
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
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingPayouts = async () => {
    try {
      const res = await fetch("/api/admin/wallet?pendingPayouts=true");
      const data = await res.json();
      if (res.ok) {
        setPendingPayouts(data.pendingPayouts || []);
      }
    } catch (error) {
      console.error("Error fetching pending payouts:", error);
    }
  };

  const handleProcessPayout = async (sellerId, amount) => {
    try {
      const res = await fetch("/api/admin/wallet/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, amount }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Payout processed successfully",
        });
        fetchTransactions();
        fetchPendingPayouts();
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.error || "Payout failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing payout:", error);
      toast({
        title: "Error",
        description: "Payout failed. Please try again.",
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setTransactionDetailsOpen(true);
  };

  const StatsCard = ({ title, value, icon: Icon, color = "emerald", isNegative = false }) => {
    const colorClasses = {
      emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
      blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
      purple: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
      yellow: "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30",
      green: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
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
          <div className={`text-2xl font-bold ${isNegative ? 'text-red-600' : ''}`}>
            {typeof value === 'number' ? formatCurrency(value) : value}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-8 w-8 text-emerald-600" />
            Wallet & Transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all transactions and seller payouts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Platform Revenue" value={stats.totalRevenue} icon={TrendingUp} color="emerald" />
        <StatsCard title="Total Fees Collected" value={stats.totalFees} icon={Receipt} color="purple" />
        <StatsCard title="Pending Payouts" value={stats.pendingPayouts} icon={Clock} color="yellow" />
        <StatsCard title="Completed Payouts" value={stats.completedPayouts} icon={CheckCircle} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeTab === "transactions" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("transactions")}
        >
          All Transactions
        </Button>
        <Button
          variant={activeTab === "payouts" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("payouts")}
        >
          Pending Payouts ({pendingPayouts.length})
        </Button>
      </div>

      {activeTab === "transactions" && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by transaction ID, seller, or order..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sale">Sales</SelectItem>
                    <SelectItem value="payout">Payouts</SelectItem>
                    <SelectItem value="refund">Refunds</SelectItem>
                    <SelectItem value="fee">Fees</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Transactions ({pagination.total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>From/To</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => {
                          const TypeIcon = transactionTypeConfig[tx.type]?.icon || DollarSign;
                          const isPositive = tx.type === 'sale';
                          return (
                            <TableRow key={tx._id}>
                              <TableCell>
                                <p className="font-mono text-xs">{tx._id?.slice(-8) || 'N/A'}</p>
                                {tx.orderNumber && (
                                  <p className="text-xs text-muted-foreground">{tx.orderNumber}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={transactionTypeConfig[tx.type]?.color}>
                                  <TypeIcon className="h-3 w-3 mr-1" />
                                  {transactionTypeConfig[tx.type]?.label || tx.type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                                  </p>
                                  {tx.fee > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      Fee: {formatCurrency(tx.fee)}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">
                                    {tx.seller?.storename || tx.sellerName || 'N/A'}
                                  </p>
                                  {tx.buyerName && (
                                    <p className="text-xs text-muted-foreground">
                                      Buyer: {tx.buyerName}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={statusConfig[tx.status]?.color}>
                                  {statusConfig[tx.status]?.label || tx.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(tx.createdAt)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewTransaction(tx)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {transactions.map((tx) => {
                      const TypeIcon = transactionTypeConfig[tx.type]?.icon || DollarSign;
                      const isPositive = tx.type === 'sale';
                      return (
                        <div
                          key={tx._id}
                          className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${
                                tx.type === 'sale' ? 'bg-green-100 dark:bg-green-900/30' :
                                tx.type === 'refund' ? 'bg-red-100 dark:bg-red-900/30' :
                                'bg-blue-100 dark:bg-blue-900/30'
                              }`}>
                                <TypeIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <Badge className={transactionTypeConfig[tx.type]?.color}>
                                  {transactionTypeConfig[tx.type]?.label || tx.type}
                                </Badge>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewTransaction(tx)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Amount</span>
                              <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                              </span>
                            </div>
                            {tx.fee > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Fee</span>
                                <span>{formatCurrency(tx.fee)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Seller</span>
                              <span className="text-sm font-medium">
                                {tx.seller?.storename || tx.sellerName || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Status</span>
                              <Badge className={statusConfig[tx.status]?.color}>
                                {statusConfig[tx.status]?.label || tx.status}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Date</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(tx.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                      {pagination.total} transactions
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
        </>
      )}

      {activeTab === "payouts" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pending Seller Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingPayouts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                <p className="text-muted-foreground">No pending payouts</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPayouts.map((payout) => (
                  <div
                    key={payout.sellerId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Wallet className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{payout.sellerName}</p>
                        <p className="text-sm text-muted-foreground">{payout.sellerEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          {payout.transactionCount} transactions pending
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-emerald-600">
                          {formatCurrency(payout.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">Available for payout</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="bg-emerald-600 hover:bg-emerald-700">
                            Process Payout
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md rounded-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Process Payout</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to process a payout of {formatCurrency(payout.amount)} to {payout.sellerName}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleProcessPayout(payout.sellerId, payout.amount)}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              Confirm Payout
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction Details Dialog */}
      <Dialog open={transactionDetailsOpen} onOpenChange={setTransactionDetailsOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Complete information about this transaction
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{selectedTransaction._id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge className={transactionTypeConfig[selectedTransaction.type]?.color}>
                    {transactionTypeConfig[selectedTransaction.type]?.label || selectedTransaction.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusConfig[selectedTransaction.status]?.color}>
                    {statusConfig[selectedTransaction.status]?.label || selectedTransaction.status}
                  </Badge>
                </div>
                {selectedTransaction.fee > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Platform Fee</p>
                    <p className="font-medium">{formatCurrency(selectedTransaction.fee)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="text-sm">{formatDate(selectedTransaction.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seller</p>
                  <p className="text-sm font-medium">
                    {selectedTransaction.seller?.storename || selectedTransaction.sellerName || 'N/A'}
                  </p>
                </div>
                {selectedTransaction.buyerName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Buyer</p>
                    <p className="text-sm font-medium">{selectedTransaction.buyerName}</p>
                  </div>
                )}
                {selectedTransaction.orderNumber && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="text-sm font-medium">{selectedTransaction.orderNumber}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransactionDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
