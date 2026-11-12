import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

/**
 * Per-day counter used to build sequential order numbers:
 * ORDER - YYYYMMDD - 0001
 *
 * One document per day (date keyed as YYYY-MM-DD, counter resets at midnight).
 * Sequence numbers are handed out with $inc in findOneAndUpdate (upsert), which
 * is atomic, so concurrent checkouts never receive the same sequence.
 *
 * Gaps are possible if an order is created and then aborted/cancelled — that is
 * expected and fine for an order number; uniqueness is what matters.
 */
const OrderCounterSchema = new Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true, // one counter document per day
      index: true,
    },
    count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: false }
);

const OrderCounter = models.OrderCounter || model('OrderCounter', OrderCounterSchema);

export default OrderCounter;
