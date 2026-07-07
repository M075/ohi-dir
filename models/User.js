// models/User.js - Add role field
import { Schema, model, models } from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new Schema(
  {
    email: {
      type: String,
      unique: [true, 'Email already exists!'],
      required: [true, 'Email is required!'],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function() {
        return this.authProvider === 'credentials';
      },
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['google', 'facebook', 'credentials'],
      default: 'google',
    },
    
    // NEW: User role - defaults to buyer
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer',
    },
    
    // Seller verification (for sellers only)
    isVerifiedSeller: {
      type: Boolean,
      default: false,
    },
    
    storename: {
      type: String,
      required: [true, 'Store name is required!'],
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
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    country: {
      type: String,
      default: 'South Africa',
    },
    city: {
      type: String,
    },
    province: {
      type: String,
      enum: [
        'Gauteng',
        'Western Cape',
        'KwaZulu-Natal',
        'Eastern Cape',
        'Free State',
        'Limpopo',
        'Mpumalanga',
        'Northern Cape',
        'North West',
        '',
        null
      ],
    },
    zipCode: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\d{4}$/.test(v);
        },
        message: 'ZIP code must be 4 digits'
      }
    },
    about: {
      type: String,
      maxLength: [500, 'About section cannot be more than 500 characters'],
    },
    image: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    bookmarks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    likes: {
      type: Number,
      default: 0,
    },
    isLiked: {
      type: Boolean,
      default: false,
    },
    
    // Geospatial fields
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },
    geocodedAddress: {
      type: String,
    },
    geocodedAt: {
      type: Date,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
    
    // Onboarding tracking
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    onboardingStep: {
      type: Number,
      default: 0,
    },
    
    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: function() {
        return this.authProvider !== 'credentials';
      }
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    // Password reset
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
  
    // Admin privileges
    isAdmin: {
      type: Boolean,
      default: false,
    },
    adminRole: {
      type: String,
      enum: ['super_admin', 'admin', 'moderator', null],
      default: null,
    },
    adminPermissions: [{
      type: String,
      enum: [
        'manage_users',
        'manage_products',
        'manage_orders',
        'manage_sellers',
        'view_analytics',
        'manage_settings',
        'manage_couriers'
      ],
    }],
    
    // Bank details for payouts
    bankDetails: {
      accountHolderName: {
        type: String,
        default: '',
      },
      bankName: {
        type: String,
        default: '',
      },
      accountNumber: {
        type: String,
        default: '',
      },
      accountType: {
        type: String,
        enum: ['savings', 'current', 'transmission', ''],
        default: 'savings',
      },
      branchCode: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to set admin based on email
UserSchema.pre('save', function() {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
  if (adminEmails.includes(this.email)) {
    this.isAdmin = true;
    if (!this.adminRole) {
      this.adminRole = 'super_admin';
    }
    if (!this.adminPermissions || this.adminPermissions.length === 0) {
      this.adminPermissions = [
        'manage_users',
        'manage_products',
        'manage_orders',
        'manage_sellers',
        'view_analytics',
        'manage_settings',
        'manage_couriers'
      ];
    }
  }
});

// Hash password before saving
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// Set location if coordinates exist
UserSchema.pre('save', function() {
  if (this.latitude != null && this.longitude != null) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude]
    };
  } else {
    this.location = undefined;
  }
});

// Ensure default storename
UserSchema.pre('save', function() {
  if (!this.storename && this.email) {
    const local = (this.email.split('@')[0] || this.email).toString();
    this.storename = local
      .replace(/\./g, '-')
      .replace(/[^a-z0-9-_]/gi, '')
      .toLowerCase();
  }

  this._wasStorenameModified = this.isModified('storename');
});

// Generate / refresh a unique slug when storename changes (or slug is missing).
// Pushes the prior slug into previousSlugs so old URLs keep resolving + 301 to canonical.
UserSchema.pre('save', async function () {
  const storenameChanged = this.isModified('storename');
  if (!storenameChanged && this.slug) return;
  if (!this.storename) return;

  const { toSlug, uniqueSlug } = await import('@/utils/slugify');

  const exists = async (candidate, excludeId) => {
    const q = { slug: candidate };
    if (excludeId) q._id = { $ne: excludeId };
    const found = await this.constructor.findOne(q).select('_id').lean();
    return !!found;
  };

  // On rename, remember the old slug so old links can 301 redirect.
  if (storenameChanged && this.slug) {
    if (!this.previousSlugs) this.previousSlugs = [];
    if (!this.previousSlugs.includes(this.slug)) {
      this.previousSlugs.push(this.slug);
    }
  }

  let attempts = 0;
  const maxAttempts = 5;
  while (attempts < maxAttempts) {
    try {
      this.slug = await uniqueSlug(this.storename, exists, { excludeId: this._id });
      return;
    } catch (err) {
      attempts++;
      if (attempts >= maxAttempts) {
        console.warn('Failed to generate unique User slug:', err.message);
        // Last-resort fallback: slug + timestamp suffix keeps the unique index happy.
        this.slug = `${toSlug(this.storename)}-${Date.now().toString(36).slice(-6)}`;
        return;
      }
    }
  }
});

// Update products when storename changes
UserSchema.post('save', async function (doc) {
  try {
    if (this._wasStorenameModified && doc && doc._id && doc.storename) {
      const mongoose = await import('mongoose');
      const Product = mongoose.models.Product || mongoose.model('Product');
      await Product.updateMany({ owner: doc._id }, { ownerName: doc.storename });
    }
  } catch (err) {
    console.warn('Failed to sync ownerName on products after user update', err);
  }
});

// Sparse geospatial index
UserSchema.index({ location: '2dsphere' }, { sparse: true });

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if onboarding is complete
UserSchema.methods.isOnboardingComplete = function() {
  return !!(
    this.storename &&
    this.phone &&
    this.address &&
    this.city &&
    this.province
  );
};

// NEW: Check if user has seller access
UserSchema.methods.hasSellerAccess = function() {
  return this.role === 'seller' || this.role === 'admin' || this.isAdmin;
};

// NEW: Check if user can create products
UserSchema.methods.canCreateProducts = function() {
  return this.hasSellerAccess() && this.isVerifiedSeller;
};

// Method to find nearby stores
UserSchema.statics.findNearby = function(longitude, latitude, maxDistanceKm = 50) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistanceKm * 1000
      }
    }
  });
};

// Method to check if user needs re-geocoding
UserSchema.methods.needsGeocoding = function() {
  if (!this.latitude || !this.longitude) return true;
  if (!this.geocodedAt) return true;
  
  const daysSinceGeocoding = (Date.now() - this.geocodedAt) / (1000 * 60 * 60 * 24);
  return daysSinceGeocoding > 30;
};

const User = models.User || model('User', UserSchema);

export default User;