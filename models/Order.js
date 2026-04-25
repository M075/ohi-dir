// models/Order.js - FIXED VERSION
import mongoose from 'mongoose';
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
        validator: function(v) {
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
    lockerDetails: LockerDetailsSchema,
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
  },
  {
    timestamps: true,
  }
);

// Generate unique order number BEFORE validation
OrderSchema.pre('validate', async function(next) {
  // Only generate if this is a new order and orderNumber is not set
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Try up to 10 times to generate a unique order number
    let attempts = 0;
    let orderNumber = null;
    
    while (attempts < 10) {
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      orderNumber = `ORD-${year}${month}${day}-${random}`;
      
      // Check if this order number already exists
      const existing = await mongoose.models.Order.findOne({ orderNumber });
      
      if (!existing) {
        this.orderNumber = orderNumber;
        console.log(`✅ Generated order number: ${orderNumber}`);
        break;
      }
      
      attempts++;
    }
    
    if (!this.orderNumber) {
      // Fallback: use MongoDB ObjectId as part of the order number
      const objectIdPart = this._id.toString().slice(-8);
      this.orderNumber = `ORD-${year}${month}${day}-${objectIdPart}`;
      console.log(`⚠️ Used fallback order number: ${this.orderNumber}`);
    }
  }
  next();
});

// Add status history when status changes
OrderSchema.pre('save', function(next) {
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
  next();
});

// Indexes for faster queries
OrderSchema.index({ buyer: 1, createdAt: -1 });
OrderSchema.index({ seller: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 }, { unique: true, sparse: true });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ 'shippingAddress.city': 1 });
OrderSchema.index({ 'shippingAddress.province': 1 });

// Virtual for calculating order age
OrderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Method to check if order can be cancelled
OrderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status) && this.paymentStatus !== 'paid';
};

// Method to check if order can be refunded
OrderSchema.methods.canBeRefunded = function() {
  return this.paymentStatus === 'paid' && ['delivered', 'shipped'].includes(this.status);
};

const Order = models.Order || model('Order', OrderSchema);

export default Order;