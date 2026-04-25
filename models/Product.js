import { Schema, model, models } from "mongoose";

const ProductSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    ownerName: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: false,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: false,
    },
    discountPercentage: {
      type: Number,
      required: false,
    },
    rating: {
      type: Number,
      required: false,
    },
    review: [
      {
        reviewer: {
          type: String,
          required: true,
        },
        
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    stock: {
      type: Number,
      required: false,
    },
    brand: {
      type: String,
    },
    category: {
      type: String,
    },
    deliveryOptions: {
      methods: [{ 
        type: String,
        // enum: ['pudo', 'door-to-door', 'pargo', 'own-delivery']
      }],
      collection: { 
        type: String,
        // enum: ['collection-allowed', 'no-collection'],
        default: 'no-collection'
      }
    },
    dimensions: {
      length: {
        type: Number,
        default: 0,
      },
      width: {
        type: Number,
        default: 0,
      },
      height: {
        type: Number,
        default: 0,
      },
    },
    weight: {
      type: Number,
      default: 0,
      min: 0,
    },
    warranty: {
      type: String,
    },
    shippingOrigin: {
      type: String,
    },
    featured: {
      type: String,
    },
    status: {
      type: String,
    },
    thumbnail: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
    // ImageKit file IDs for efficient deletion
    imageFileIds: [
      {
        type: String,
      },
    ],
    // Admin moderation fields
    flagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: populate shippingOrigin from owner's city if not explicitly set
ProductSchema.pre('save', async function(next) {
  try {
    // Only populate shippingOrigin if it's not already set
    if (!this.shippingOrigin && this.owner) {
      const User = models.User || (await import('./User.js')).default;
      const user = await User.findById(this.owner);
      if (user && user.city) {
        this.shippingOrigin = user.city;
      }
    }
  } catch (err) {
    console.warn('Failed to populate shippingOrigin from user city:', err);
  }
  next();
});

// Add index for better query performance
ProductSchema.index({ owner: 1 });
ProductSchema.index({ ownerName: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ featured: 1 });
ProductSchema.index({ status: 1 });

// Virtual for getting optimized image URLs (optional)
ProductSchema.virtual('optimizedImages').get(function() {
  // This would require importing getImagePresets in the model
  // Better to handle this in the API routes
  return this.images;
});

const Product = models.Product || model("Product", ProductSchema);

export default Product;