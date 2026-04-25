// scripts/fix-geospatial-data.mjs
// Run this script to fix existing users with invalid location data
// Usage: node scripts/fix-geospatial-data.mjs

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// User schema (simplified for migration)
const UserSchema = new mongoose.Schema({
  email: String,
  storename: String,
  latitude: Number,
  longitude: Number,
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: [Number],
  },
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function fixGeospatialData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully');

    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to check`);

    let fixed = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        // Check if location field exists but is invalid
        const hasInvalidLocation = user.location && 
          (!user.location.coordinates || user.location.coordinates.length !== 2);
        
        const hasCoordinates = user.latitude != null && user.longitude != null;

        if (hasInvalidLocation || (hasCoordinates && !user.location)) {
          // Fix the user
          if (hasCoordinates) {
            // Has coordinates, create proper location
            user.location = {
              type: 'Point',
              coordinates: [user.longitude, user.latitude]
            };
            console.log(`✓ Fixed ${user.email}: Added valid location`);
          } else {
            // No coordinates, remove location field
            user.location = undefined;
            console.log(`✓ Fixed ${user.email}: Removed invalid location`);
          }
          
          await user.save();
          fixed++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`✗ Error fixing user ${user.email}:`, error.message);
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Fixed: ${fixed} users`);
    console.log(`Skipped: ${skipped} users (already valid)`);
    console.log(`Total: ${users.length} users`);

    // Rebuild the geospatial index
    console.log('\nRebuilding geospatial index...');
    try {
      await User.collection.dropIndex('location_2dsphere');
      console.log('Dropped old index');
    } catch (error) {
      console.log('No old index to drop (this is fine)');
    }

    await User.collection.createIndex(
      { location: '2dsphere' },
      { sparse: true, background: true }
    );
    console.log('✓ Geospatial index rebuilt successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nConnection closed');
    process.exit(0);
  }
}

// Run the migration
fixGeospatialData();