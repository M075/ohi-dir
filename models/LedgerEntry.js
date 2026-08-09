// models/LedgerEntry.js — Internal ledger for debit/credit tracking
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const LedgerEntrySchema = new Schema(
  {
    // The order this entry belongs to
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      index: true,
    },

    // Which account bucket this entry falls into
    account: {
      type: String,
      enum: [
        'platform_commission',   // Admin's commission revenue
        'seller_earnings',       // Seller's net earnings after commission
        'shipping_income',       // Shipping paid by buyer, allocated to admin
        // Legacy per-courier shipping accounts (kept so historical rows still
        // read/aggregate; new entries use the consolidated 'shipping_income').
        'shipping_courier_guy',
        'shipping_pudo',
        'shipping_collection',
        'tax_collected',         // Tax portion (VAT)
        'buyer_payment',         // Total buyer payment (debit side)
      ],
      required: true,
      index: true,
    },

    // Debit or credit
    type: {
      type: String,
      enum: ['debit', 'credit'],
      required: true,
    },

    // Always stored as a positive number
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Parties involved
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Human-readable description
    description: {
      type: String,
      required: true,
    },

    // Extra info (commission %, courier reference, etc.)
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient admin dashboard aggregation
LedgerEntrySchema.index({ account: 1, createdAt: -1 });
LedgerEntrySchema.index({ seller: 1, account: 1 });
LedgerEntrySchema.index({ createdAt: -1 });

const LedgerEntry = models.LedgerEntry || model('LedgerEntry', LedgerEntrySchema);
export default LedgerEntry;
