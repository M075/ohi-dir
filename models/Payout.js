// ============================================================================
// FILE 2: models/Payout.js
// ============================================================================
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const PayoutSchema = new Schema({
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  
  method: {
    type: String,
    enum: ['bank_transfer', 'eft', 'paypal', 'manual'],
    default: 'bank_transfer',
  },
  
  // Bank details snapshot
  bankDetails: {
    accountHolder: String,
    bankName: String,
    accountNumber: String,
    branchCode: String,
    accountType: String,
  },
  
  // Reference numbers
  referenceNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  externalReference: String, // Bank transaction reference
  
  // Processing
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,
  
  // Notes and reason
  notes: String,
  failureReason: String,
  
  // Admin processing
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Automatic vs manual
  isAutomatic: {
    type: Boolean,
    default: false,
  },
  
}, {
  timestamps: true,
});

// Generate reference number before saving
PayoutSchema.pre('validate', async function(next) {
  if (this.isNew && !this.referenceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    this.referenceNumber = `PO-${year}${month}${day}-${random}`;
  }
  next();
});

// Indexes
PayoutSchema.index({ seller: 1, createdAt: -1 });
PayoutSchema.index({ status: 1 });
PayoutSchema.index({ referenceNumber: 1 });

const Payout = models.Payout || model('Payout', PayoutSchema);
export default Payout;

