// models/Order.js - FIXED VERSION
import mongoose from 'mongoose';
import OrderCounter from './OrderCounter';
const { Schema, model, models } = mongoose;

const OrderItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  // Snapshot of product data at time of purchase
  productSnapshot: {
    title: String,
    image: String,
    ownerName: String,
  }
});

const AddressSnapshotSchema = new Schema({
  name: String,
  company: String,
  email: String,
  phone: String,
  address: String,
  apartment: String,
  city: String,
  province: String,
  zipCode: String,
  country: {
    type: String,
    default: 'South Africa',
  },
  notes: String,
}, { _id: false });

const ParcelSchema = new Schema({
  description: String,
  weightKg: Number,
  lengthCm: Number,
  widthCm: Number,
  heightCm: Number,
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
  },
  sku: String,
}, { _id: false });

const ParcelSummarySchema = new Schema({
  totalParcels: {
    type: Number,
    default: 0,
  },
  totalWeightKg: {
    type: Number,
    default: 0,
  },
  parcels: [ParcelSchema],
}, { _id: false });

const CourierQuoteSchema = new Schema({
  provider: String,
  serviceCode: String,
  serviceName: String,
  price: Number,
  currency: {
    type: String,
    default: 'ZAR',
  },
  etaDays: Number,
  expiresAt: Date,
  raw: Schema.Types.Mixed,
}, { _id: false });

/**
 * Delivery locker details (selected by buyer at checkout)
 * This is the locker where the buyer will collect their parcel
 */
const LockerDetailsSchema = new Schema({
  provider: String,
  lockerId: String,
  lockerName: String,
  lockerAddress: String,
  distanceKm: Number,
  status: String,
  senderPin: String,
  recipientPin: String,
  expiresAt: Date,
  pickupPointId: String,
  pickupPointProvider: {
    type: String,
    default: 'tcg-locker',
  },
  lockerSize: String,
  serviceCode: String,
  price: Number,
}, { _id: false });

/**
 * Collection locker details (selected by seller when booking PUDO shipment)
 * This is the locker where the seller drops off the parcel
 */
const CollectionLockerSchema = new Schema({
  lockerId: String,
  lockerName: String,
  lockerAddress: String,
  pickupPointId: String,
  pickupPointProvider: {
    type: String,
    default: 'tcg-locker',
  },
}, { _id: false });

const ShippingAddressSchema = new Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: String,
  phone: String,
  address: {
    type: String,
    required: true,
  },
  apartment: String,
  city: {
    type: String,
    required: true,
  },
  province: {
    type: String,
    required: true,
  },
  zipCode: String,
  country: {
    type: String,
    default: 'South Africa'
  },
});

const OrderSchema = new Schema(
  {
    // REQUIRED: Buyer information
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer is required'],
      index: true,
    },
    buyerEmail: {
      type: String,
      required: [true, 'Buyer email is required'],
    },

    // REQUIRED: Seller information
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller is required'],
      index: true,
    },
    sellerName: {
      type: String,
      required: [true, 'Seller name is required'],
    },

    // Order identification
    orderNumber: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values during creation
    },

    // Order items (all from same seller in this order)
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Order must have at least one item'
      }
    },

    // Pricing (REQUIRED)
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: 0,
    },
    shipping: {
      type: Number,
      required: [true, 'Shipping cost is required'],
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      required: [true, 'Tax is required'],
      min: 0,
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: 0,
    },

    // Shipping (REQUIRED)
    shippingAddress: {
      type: ShippingAddressSchema,
      required: [true, 'Shipping address is required'],
    },
    shippingMethod: {
      type: String,
      enum: ['standard', 'express', 'collection', 'pudo'],
      default: 'standard',
    },
    fulfillmentOption: {
      type: String,
      enum: ['door-to-door', 'pudo', 'collection'],
      default: 'door-to-door',
    },
    estimatedDelivery: Date,
    sellerAddressSnapshot: AddressSnapshotSchema,
    parcelSummary: ParcelSummarySchema,
    courierQuote: CourierQuoteSchema,

    // Delivery locker (buyer's collection locker, selected at checkout)
    lockerDetails: LockerDetailsSchema,

    // Collection locker (seller's drop-off locker, selected when booking PUDO shipment)
    collectionLocker: CollectionLockerSchema,

    courierSandbox: {
      type: Boolean,
      default: false,
    },
    deliveryInstructions: String,
    pickupInstructions: String,

    // Payment (REQUIRED)
    paymentMethod: {
      type: String,
      enum: ['payfast', 'eft', 'cash_on_delivery', 'card'],
      required: [true, 'Payment method is required'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentDetails: {
      payfastPaymentId: String,
      payfastTransactionId: String,
      paidAt: Date,
      manuallyMarkedBy: Schema.Types.ObjectId,
      // PayFast ITN ids already applied to this order. PayFast retries
      // notifications, so each one is claimed exactly once — see the notify
      // route's replay guard.
      processedItnIds: [String],
    },

    // Order Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Status timestamps
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    // Tracking
    trackingNumber: String,
    trackingUrl: String,

    // Courier information
    courierProvider: {
      type: String,
      enum: ['courier-guy', 'shiplogic', 'fastway', 'pudo', null],
    },
    courierReference: String,

    // Status history
    statusHistory: [{
      status: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
      note: String,
    }],

    // Notes
    customerNotes: String,
    sellerNotes: String,

    // Cancellation
    cancellationReason: String,

    // Inventory
    // Stock is reserved (decremented) at checkout. This guards against
    // releasing it more than once — e.g. repeated PayFast ITN callbacks for a
    // failed payment, or a failed-payment cancel followed by a manual cancel.
    stockRestored: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique order number BEFORE validation.
//
// Format: ORDER - YYYYMMDD - 0001
//   - YYYYMMDD is the order date (server local time)
//   - 0001 is a per-day sequence that increments with every order and resets at midnight
//
// The sequence is handed out with an atomic $inc on a per-day counter document,
// so concurrent checkouts never receive the same number. Gaps are possible if a
// created order is later aborted or cancelled — expected and fine for an order
// number; uniqueness is what the unique index guards.
OrderSchema.pre('validate', async function () {
  // Only generate if this is a new order and orderNumber is not set
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const dateStr = `${year}${month}${day}`; // e.g. 20261112
    const counterKey = `${year}-${month}-${day}`; // e.g. 2026-11-12

    // Atomic increment with upsert: first order of the day gets 0001.
    const counter = await OrderCounter.findOneAndUpdate(
      { date: counterKey },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );

    const sequence = String(counter.count).padStart(4, '0');
    this.orderNumber = `ORDER - ${dateStr} - ${sequence}`;
  }
});

// Add status history when status changes
OrderSchema.pre('save', function () {
  if (this.isModified('status') && !this.isNew) {
    // Don't add duplicate history entries
    const lastHistoryStatus = this.statusHistory[this.statusHistory.length - 1]?.status;

    if (lastHistoryStatus !== this.status) {
      this.statusHistory.push({
        status: this.status,
        timestamp: new Date(),
      });
    }
  }
});

// Indexes for faster queries
OrderSchema.index({ buyer: 1, createdAt: -1 });
OrderSchema.index({ seller: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ 'shippingAddress.city': 1 });
OrderSchema.index({ 'shippingAddress.province': 1 });

// Virtual for calculating order age
OrderSchema.virtual('orderAge').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Method to check if order can be cancelled
OrderSchema.methods.canBeCancelled = function () {
  return ['pending', 'confirmed'].includes(this.status) && this.paymentStatus !== 'paid';
};

// Method to check if order can be refunded
OrderSchema.methods.canBeRefunded = function () {
  return this.paymentStatus === 'paid' && ['delivered', 'shipped'].includes(this.status);
};

const Order = models.Order || model('Order', OrderSchema);

export default Order;