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
UserSchema.pre('save', function(next) {
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
  next();
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  next();
});

// Set location if coordinates exist
UserSchema.pre('save', function(next) {
  if (this.latitude != null && this.longitude != null) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude]
    };
  } else {
    this.location = undefined;
  }
  next();
});

// Ensure default storename
UserSchema.pre('save', function (next) {
  if (!this.storename && this.email) {
    const local = (this.email.split('@')[0] || this.email).toString();
    this.storename = local
      .replace(/\./g, '-')
      .replace(/[^a-z0-9-_]/gi, '')
      .toLowerCase();
  }

  this._wasStorenameModified = this.isModified('storename');
  next();
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