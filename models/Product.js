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
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    previousSlugs: [
      {
        type: String,
      },
    ],
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
    likes: {
      type: Number,
      default: 0,
    },
    isLiked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: populate shippingOrigin from owner's city if not explicitly set
ProductSchema.pre('save', async function() {
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
});

// Generate / refresh a unique slug when title changes (or slug is missing).
// Pushes the prior slug into previousSlugs so old URLs keep resolving + 301 to canonical.
ProductSchema.pre('save', async function () {
  const titleChanged = this.isModified('title');
  if (!titleChanged && this.slug) return;
  if (!this.title) return;

  const { toSlug, uniqueSlug } = await import('@/utils/slugify');

  const exists = async (candidate, excludeId) => {
    const q = { slug: candidate };
    if (excludeId) q._id = { $ne: excludeId };
    const found = await this.constructor.findOne(q).select('_id').lean();
    return !!found;
  };

  // On rename, remember the old slug so old links can 301 redirect.
  if (titleChanged && this.slug) {
    if (!this.previousSlugs) this.previousSlugs = [];
    if (!this.previousSlugs.includes(this.slug)) {
      this.previousSlugs.push(this.slug);
    }
  }

  let attempts = 0;
  const maxAttempts = 5;
  while (attempts < maxAttempts) {
    try {
      this.slug = await uniqueSlug(this.title, exists, { excludeId: this._id });
      return;
    } catch (err) {
      attempts++;
      if (attempts >= maxAttempts) {
        console.warn('Failed to generate unique Product slug:', err.message);
        this.slug = `${toSlug(this.title)}-${Date.now().toString(36).slice(-6)}`;
        return;
      }
    }
  }
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