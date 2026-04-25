"use client";
import React, { useState, useEffect, useCallback } from 'react';
import DashboardShell from '@/assets/components/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/hooks/use-toast';
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
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  Plus,
  Minus,
  Eye,
  BarChart3,
  PieChart,
  Receipt,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useSession } from 'next-auth/react';

// Constants
const MINIMUM_PAYOUT = 500;
const ACCOUNT_MASK_LENGTH = 4;

export default function SellerWalletDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [walletData, setWalletData] = useState({
    balance: 0,
    pendingBalance: 0,
    totalEarnings: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    currency: 'ZAR'
  });
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionType, setTransactionType] = useState('all');
  const [bankDetailsOpen, setBankDetailsOpen] = useState(false);
  const [savingBankDetails, setSavingBankDetails] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  
  // Loading states
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  
  // Bank details form state
  const [bankDetails, setBankDetails] = useState({
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    accountType: 'savings',
    branchCode: '',
  });

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    try {
      setLoadingWallet(true);
      const res = await fetch('/api/wallet');
      if (!res.ok) throw new Error('Failed to fetch wallet data');
      const data = await res.json();
      
      setWalletData({
        balance: data.balance || 0,
        pendingBalance: data.pendingBalance || 0,
        totalEarnings: data.totalEarnings || 0,
        thisMonthEarnings: data.stats?.thisMonth?.earnings || 0,
        lastMonthEarnings: data.stats?.lastMonth?.earnings || 0,
        currency: data.currency || 'ZAR'
      });
      
      // Set bank details from wallet if available
      if (data.bankDetails) {
        setBankDetails({
          accountHolder: data.bankDetails.accountHolder || '',
          bankName: data.bankDetails.bankName || '',
          accountNumber: data.bankDetails.accountNumber || '',
          accountType: data.bankDetails.accountType || 'savings',
          branchCode: data.bankDetails.branchCode || '',
        });
      }
      
      // Set transactions from wallet response
      if (data.transactions) {
        setTransactions(data.transactions.map((t, index) => ({
          id: t._id || `tx-${index}`,
          type: t.type,
          orderNumber: t.orderNumber,
          description: t.description,
          amount: t.amount,
          fee: t.fee,
          net: t.net,
          status: t.status,
          date: t.createdAt,
          buyer: t.buyerName,
          paymentMethod: t.paymentMethod
        })));
        setLoadingTransactions(false);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load wallet data.",
      });
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  // Fetch transactions with filters
  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingTransactions(true);
      const params = new URLSearchParams();
      if (transactionType !== 'all') params.append('type', transactionType);
      
      const res = await fetch(`/api/wallet/transactions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      
      setTransactions((data.transactions || []).map((t, index) => ({
        id: t._id || `tx-${index}`,
        type: t.type,
        orderNumber: t.orderNumber,
        description: t.description,
        amount: t.amount,
        fee: t.fee,
        net: t.net,
        status: t.status,
        date: t.createdAt,
        buyer: t.buyerName,
        paymentMethod: t.paymentMethod
      })));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  }, [transactionType]);

  // Fetch payout history
  const fetchPayoutHistory = useCallback(async () => {
    try {
      setLoadingPayouts(true);
      const res = await fetch('/api/wallet/payout/history');
      if (!res.ok) throw new Error('Failed to fetch payout history');
      const data = await res.json();
      
      setPayoutHistory((data.payouts || []).map((p, index) => ({
        id: p._id || `payout-${index}`,
        amount: p.amount,
        status: p.status,
        date: p.createdAt,
        method: p.method,
        reference: p.referenceNumber,
        bankAccount: p.bankDetails?.accountNumber 
          ? `****${p.bankDetails.accountNumber.slice(-ACCOUNT_MASK_LENGTH)}` 
          : '****'
      })));
    } catch (error) {
      console.error('Error fetching payout history:', error);
    } finally {
      setLoadingPayouts(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (session?.user) {
      fetchWalletData();
      fetchPayoutHistory();
    }
  }, [session?.user, fetchWalletData, fetchPayoutHistory]);

  // Fetch transactions when type filter changes
  useEffect(() => {
    if (session?.user && activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [session?.user, activeTab, transactionType, fetchTransactions]);

  const handleBankDetailsChange = (e) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveBankDetails = async () => {
    if (!session?.user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to update bank details.",
      });
      return;
    }

    // Validation
    if (!bankDetails.accountHolder || !bankDetails.bankName || 
        !bankDetails.accountNumber || !bankDetails.branchCode) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields.",
      });
      return;
    }

    setSavingBankDetails(true);

    try {
      const res = await fetch('/api/wallet/bank-details', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankDetails),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Bank details updated successfully.",
        });
        setBankDetailsOpen(false);
        // Refresh wallet data to get updated bank details
        fetchWalletData();
      } else {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update bank details');
      }
    } catch (error) {
      console.error('Error updating bank details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update bank details. Please try again.",
      });
    } finally {
      setSavingBankDetails(false);
    }
  };

  // Handle payout request
  const handlePayoutRequest = async () => {
    if (!session?.user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to request a payout.",
      });
      return;
    }

    const amount = payoutAmount ? parseFloat(payoutAmount) : walletData.balance;
    
    if (amount < MINIMUM_PAYOUT) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: `Minimum payout amount is R ${MINIMUM_PAYOUT.toFixed(2)}.`,
      });
      return;
    }

    if (amount > walletData.balance) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Payout amount exceeds available balance.",
      });
      return;
    }

    setRequestingPayout(true);

    try {
      const res = await fetch('/api/wallet/payout/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Success",
          description: `Payout request submitted successfully. Reference: ${data.payout?.referenceNumber}`,
        });
        setPayoutDialogOpen(false);
        setPayoutAmount('');
        // Refresh wallet data and payout history
        fetchWalletData();
        fetchPayoutHistory();
      } else {
        throw new Error(data.error || 'Failed to request payout');
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to request payout. Please try again.",
      });
    } finally {
      setRequestingPayout(false);
    }
  };

  // Calculate stats
  const completedTransactions = transactions.filter(t => t.status === 'completed' && t.type === 'sale');
  const totalSales = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalFees = completedTransactions.reduce((sum, t) => sum + (t.fee || 0), 0);
  const averageOrderValue = completedTransactions.length > 0 ? totalSales / completedTransactions.length : 0;

  // Growth calculation
  const growthPercentage = walletData.lastMonthEarnings > 0
    ? ((walletData.thisMonthEarnings - walletData.lastMonthEarnings) / walletData.lastMonthEarnings) * 100
    : 0;

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = transactionType === 'all' || t.type === transactionType;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'sale':
        return <ArrowDownRight className="h-4 w-4 text-green-600" />;
      case 'refund':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'payout':
        return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <DashboardShell>
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8 text-emerald-600" />
              Wallet & Earnings
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your earnings, transactions, and request payouts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Request Payout
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md rounded-lg">
                <DialogHeader>
                  <DialogTitle>Request Payout</DialogTitle>
                  <DialogDescription>
                    Request a payout to your bank account. Minimum amount is R {MINIMUM_PAYOUT.toFixed(2)}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(walletData.balance)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payoutAmount">Payout Amount (leave empty for full balance)</Label>
                    <Input
                      id="payoutAmount"
                      type="number"
                      placeholder={`Max: ${formatCurrency(walletData.balance)}`}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      min={MINIMUM_PAYOUT}
                      max={walletData.balance}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPayoutDialogOpen(false)}
                    disabled={requestingPayout}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePayoutRequest}
                    disabled={requestingPayout || walletData.balance < MINIMUM_PAYOUT}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {requestingPayout ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Request Payout'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Loading State */}
        {loadingWallet ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="ml-2 text-muted-foreground">Loading wallet data...</span>
          </div>
        ) : (
          <>
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-600">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(walletData.balance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Ready for payout</p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <Wallet className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-600">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending Balance</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(walletData.pendingBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Processing orders</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">This Month</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(walletData.thisMonthEarnings)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {growthPercentage >= 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600">+{growthPercentage.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        <span className="text-xs text-red-600">{growthPercentage.toFixed(1)}%</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(walletData.totalEarnings)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">All time</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-xl font-bold">{formatCurrency(averageOrderValue)}</p>
                </div>
                <PieChart className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-xl font-bold">{completedTransactions.length}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                  <p className="text-xl font-bold">{formatCurrency(totalFees)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex gap-2">
                <Button
                  variant={activeTab === 'overview' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </Button>
                <Button
                  variant={activeTab === 'transactions' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('transactions')}
                >
                  Transactions
                </Button>
                <Button
                  variant={activeTab === 'payouts' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('payouts')}
                >
                  Payouts
                </Button>
              </div>

              {activeTab === 'transactions' && (
                <div className="flex gap-2">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-white dark:bg-zinc-800"
                  >
                    <option value="all">All Types</option>
                    <option value="sale">Sales</option>
                    <option value="refund">Refunds</option>
                    <option value="payout">Payouts</option>
                  </select>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                  {loadingTransactions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading activity...</span>
                    </div>
                  ) : transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              transaction.type === 'sale' ? 'bg-green-100 dark:bg-green-900/30' :
                              transaction.type === 'refund' ? 'bg-red-100 dark:bg-red-900/30' :
                              'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.orderNumber && `${transaction.orderNumber} • `}{formatDate(transaction.date)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                            </p>
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <Dialog open={bankDetailsOpen} onOpenChange={setBankDetailsOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Update Bank Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md rounded-lg">
                          <DialogHeader>
                            <DialogTitle>Update Bank Details</DialogTitle>
                            <DialogDescription>
                              Update your banking information for payouts. All fields are required.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="accountHolder">Account Holder Name *</Label>
                              <Input
                                id="accountHolder"
                                name="accountHolder"
                                value={bankDetails.accountHolder}
                                onChange={handleBankDetailsChange}
                                placeholder="John Doe"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="bankName">Bank Name *</Label>
                              <Input
                                id="bankName"
                                name="bankName"
                                value={bankDetails.bankName}
                                onChange={handleBankDetailsChange}
                                placeholder="FNB, Standard Bank, etc."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="accountType">Account Type *</Label>
                              <select
                                id="accountType"
                                name="accountType"
                                value={bankDetails.accountType}
                                onChange={handleBankDetailsChange}
                                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-zinc-800"
                              >
                                <option value="savings">Savings</option>
                                <option value="cheque">Cheque/Current</option>
                                <option value="transmission">Transmission</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="accountNumber">Account Number *</Label>
                              <Input
                                id="accountNumber"
                                name="accountNumber"
                                value={bankDetails.accountNumber}
                                onChange={handleBankDetailsChange}
                                placeholder="1234567890"
                                type="text"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="branchCode">Branch Code *</Label>
                              <Input
                                id="branchCode"
                                name="branchCode"
                                value={bankDetails.branchCode}
                                onChange={handleBankDetailsChange}
                                placeholder="250655"
                                type="text"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setBankDetailsOpen(false)}
                              disabled={savingBankDetails}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={handleSaveBankDetails}
                              disabled={savingBankDetails}
                            >
                              {savingBankDetails ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                'Save Details'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Download Statement
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Receipt className="h-4 w-4 mr-2" />
                        View Tax Documents
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Payout Schedule</h3>
                    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Weekly Payouts</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Next payout scheduled for Monday, 9:00 AM
                          </p>
                          <p className="text-sm font-semibold text-blue-600 mt-2">
                            Estimated: {formatCurrency(walletData.balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-3">
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading transactions...</span>
                  </div>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors gap-3"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          transaction.type === 'sale' ? 'bg-green-100 dark:bg-green-900/30' :
                          transaction.type === 'refund' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{transaction.description}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {transaction.orderNumber && (
                              <span className="text-sm text-muted-foreground">
                                {transaction.orderNumber}
                              </span>
                            )}
                            {transaction.buyer && (
                              <span className="text-sm text-muted-foreground">
                                • {transaction.buyer}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 md:text-right">
                        <div>
                          <p className={`font-semibold ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </p>
                          {transaction.fee > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Fee: -{formatCurrency(transaction.fee)}
                            </p>
                          )}
                          {transaction.net > 0 && (
                            <p className="text-xs font-medium">
                              Net: {formatCurrency(transaction.net)}
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-muted-foreground">No transactions found</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payouts' && (
              <div className="space-y-6">
                <div className="p-4 border rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">Request Payout</h3>
                      <p className="text-sm text-muted-foreground">
                        Available balance: {formatCurrency(walletData.balance)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Minimum payout: R {MINIMUM_PAYOUT.toFixed(2)}
                      </p>
                    </div>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setPayoutDialogOpen(true)}
                      disabled={walletData.balance < MINIMUM_PAYOUT}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Request
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Payout History</h3>
                  {loadingPayouts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading payouts...</span>
                    </div>
                  ) : payoutHistory.length > 0 ? (
                    <div className="space-y-3">
                      {payoutHistory.map((payout) => (
                        <div
                          key={payout.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <CreditCard className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">Bank Transfer</p>
                              <p className="text-sm text-muted-foreground">
                                {payout.reference} • {payout.bankAccount}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(payout.date)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-blue-600">
                              {formatCurrency(payout.amount)}
                            </p>
                            <Badge className={getStatusColor(payout.status)}>
                              {payout.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-muted-foreground">No payout history yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </>
        )}
      </div>
    </div>
    </DashboardShell>
  );
}