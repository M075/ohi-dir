// ============================================================================
// FILE 1: models/Wallet.js
// ============================================================================
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const TransactionSchema = new Schema({
  type: {
    type: String,
    enum: ['sale', 'refund', 'payout', 'fee', 'adjustment'],
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  fee: {
    type: Number,
    default: 0,
  },
  net: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'processing'],
    default: 'pending',
    index: true,
  },
  description: {
    type: String,
    required: true,
  },
  // Related documents
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
  },
  orderNumber: String,
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  buyerName: String,
  paymentMethod: String,
  // Payout specific
  payout: {
    type: Schema.Types.ObjectId,
    ref: 'Payout',
  },
  // Metadata
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

const WalletSchema = new Schema({
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  
  // Balances
  availableBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  pendingBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  totalPayouts: {
    type: Number,
    default: 0,
  },
  totalFees: {
    type: Number,
    default: 0,
  },
  
  // Currency
  currency: {
    type: String,
    default: 'ZAR',
  },
  
  // Bank details for payouts
  bankDetails: {
    accountHolder: String,
    bankName: String,
    accountNumber: String,
    branchCode: String,
    accountType: {
      type: String,
      enum: ['savings', 'cheque', 'transmission'],
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  
  // Payout settings
  payoutSettings: {
    minimumPayout: {
      type: Number,
      default: 500,
    },
    schedule: {
      type: String,
      enum: ['manual', 'weekly', 'biweekly', 'monthly'],
      default: 'manual',
    },
    autoPayoutEnabled: {
      type: Boolean,
      default: false,
    },
    autoPayoutThreshold: {
      type: Number,
      default: 1000,
    },
  },
  
  // Transactions
  transactions: [TransactionSchema],
  
  // Stats tracking
  stats: {
    thisMonth: {
      sales: { type: Number, default: 0 },
      earnings: { type: Number, default: 0 },
      fees: { type: Number, default: 0 },
    },
    lastMonth: {
      sales: { type: Number, default: 0 },
      earnings: { type: Number, default: 0 },
      fees: { type: Number, default: 0 },
    },
    averageOrderValue: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
  },
  
  // Hold/freeze wallet
  isActive: {
    type: Boolean,
    default: true,
  },
  holdReason: String,
  
}, {
  timestamps: true,
});

// Indexes for performance
WalletSchema.index({ seller: 1 });
WalletSchema.index({ 'transactions.createdAt': -1 });
WalletSchema.index({ 'transactions.type': 1, 'transactions.status': 1 });

// Methods
WalletSchema.methods.addTransaction = async function(transactionData) {
  const { type, amount, fee = 0, status = 'pending', description, order, buyer, paymentMethod, metadata } = transactionData;
  
  const net = amount - fee;
  
  const transaction = {
    type,
    amount,
    fee,
    net,
    status,
    description,
    order: order?._id || order,
    orderNumber: order?.orderNumber,
    buyer: buyer?._id || buyer,
    buyerName: buyer?.storename || buyer?.email,
    paymentMethod,
    metadata,
  };
  
  this.transactions.push(transaction);
  
  // Update balances based on type and status
  if (status === 'completed') {
    if (type === 'sale') {
      this.availableBalance += net;
      this.totalEarnings += amount;
      this.totalFees += fee;
      this.stats.totalOrders += 1;
    } else if (type === 'refund') {
      this.availableBalance -= Math.abs(amount);
    } else if (type === 'payout') {
      this.availableBalance -= Math.abs(amount);
      this.totalPayouts += Math.abs(amount);
    }
  } else if (status === 'pending' && type === 'sale') {
    this.pendingBalance += net;
  }
  
  await this.save();
  return this.transactions[this.transactions.length - 1];
};

WalletSchema.methods.completeTransaction = async function(transactionId) {
  const transaction = this.transactions.id(transactionId);
  
  if (!transaction) {
    throw new Error('Transaction not found');
  }
  
  if (transaction.status === 'completed') {
    return transaction;
  }
  
  transaction.status = 'completed';
  
  // Move from pending to available
  if (transaction.type === 'sale') {
    this.pendingBalance -= transaction.net;
    this.availableBalance += transaction.net;
    this.totalEarnings += transaction.amount;
    this.totalFees += transaction.fee;
  }
  
  await this.save();
  return transaction;
};

WalletSchema.methods.calculateMonthlyStats = async function() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  
  // Current month
  const thisMonthTxs = this.transactions.filter(t => 
    t.type === 'sale' && 
    t.status === 'completed' &&
    t.createdAt >= startOfMonth
  );
  
  this.stats.thisMonth = {
    sales: thisMonthTxs.length,
    earnings: thisMonthTxs.reduce((sum, t) => sum + t.amount, 0),
    fees: thisMonthTxs.reduce((sum, t) => sum + t.fee, 0),
  };
  
  // Last month
  const lastMonthTxs = this.transactions.filter(t => 
    t.type === 'sale' && 
    t.status === 'completed' &&
    t.createdAt >= startOfLastMonth &&
    t.createdAt <= endOfLastMonth
  );
  
  this.stats.lastMonth = {
    sales: lastMonthTxs.length,
    earnings: lastMonthTxs.reduce((sum, t) => sum + t.amount, 0),
    fees: lastMonthTxs.reduce((sum, t) => sum + t.fee, 0),
  };
  
  // Average order value
  const completedSales = this.transactions.filter(t => 
    t.type === 'sale' && t.status === 'completed'
  );
  
  if (completedSales.length > 0) {
    const totalSalesAmount = completedSales.reduce((sum, t) => sum + t.amount, 0);
    this.stats.averageOrderValue = totalSalesAmount / completedSales.length;
  }
  
  this.stats.totalOrders = completedSales.length;
  
  await this.save();
};

const Wallet = models.Wallet || model('Wallet', WalletSchema);
export default Wallet;







