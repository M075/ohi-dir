// models/Cart.js
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const CartItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  // Store snapshot of product data in case product is deleted
  productSnapshot: {
    title: String,
    image: String,
    ownerName: String,
  }
});

const CartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One cart per user
    },
    items: [CartItemSchema],
    // Calculate totals
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    shipping: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate totals before saving
CartSchema.pre('save', function(next) {
  // Calculate subtotal
  this.subtotal = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  // Calculate tax (15% VAT for South Africa)
  this.tax = this.subtotal * 0.15;
  
  // Calculate shipping (free over R500, otherwise R50)
  this.shipping = this.subtotal > 500 ? 0 : 50;
  
  // Calculate total
  this.total = this.subtotal + this.tax + this.shipping;
  
  next();
});

// Add index for faster queries
CartSchema.index({ user: 1 });

const Cart = models.Cart || model('Cart', CartSchema);

export default Cart;