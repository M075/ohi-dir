// models/PayoutRequest.js — Seller payout requests with idempotency and balance reservation
//
// A seller requests a payout -> a PayoutRequest is created (status: pending) and
// the requested amount is reserved (moved from availableBalance to reservedBalance).
// An admin then approves or rejects it. On approval the reservation is released
// and the balance is deducted. On rejection the reservation is released back to
// availableBalance.
//
// The idempotencyKey prevents duplicate payouts when a seller retries the same
// request (e.g. double-click, network retry).
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const PayoutRequestSchema = new Schema(
  {
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
      enum: ['pending', 'approved', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Idempotency key supplied by the client. Reusing the same key returns the
    // existing request instead of creating a duplicate.
    idempotencyKey: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },

    // Masked snapshot of bank details at request time. Full account numbers are
    // encrypted on the Wallet document; this snapshot only ever holds masked
    // values safe for display in admin UI.
    bankDetailsSnapshot: {
      accountHolder: String,
      bankName: String,
      accountNumberMasked: String,
      branchCode: String,
      accountType: String,
    },

    referenceNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    processedAt: Date,
    completedAt: Date,
    failedAt: Date,

    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    failureReason: String,

    // Link to the wallet ledger transaction created when the payout is executed
    walletTransactionId: {
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

PayoutRequestSchema.index({ seller: 1, status: 1, createdAt: -1 });

const PayoutRequest = models.PayoutRequest || model('PayoutRequest', PayoutRequestSchema);
export default PayoutRequest;
