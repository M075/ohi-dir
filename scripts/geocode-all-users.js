// scripts/geocode-all-users.js
// Run this script to geocode all existing users in your database
// Usage: node scripts/geocode-all-users.js

import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import { geocodeAddress, batchGeocode } from '../utils/geocoding.js';

async function geocodeAllUsers() {
  try {
    await connectDB();
    
    console.log('🔍 Finding users without coordinates...');
    
    // Find all users that don't have coordinates
    const users = await User.find({
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } },
        { latitude: null },
        { longitude: null }
      ],
      city: { $exists: true, $ne: null },
      province: { $exists: true, $ne: null }
    });
    
    console.log(`📍 Found ${users.length} users to geocode`);
    
    if (users.length === 0) {
      console.log('✅ All users already have coordinates!');
      process.exit(0);
    }
    
    let successCount = 0;
    let failCount = 0;
    
    // Process users one by one with delay (respecting rate limits)
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      console.log(`\n📍 [${i + 1}/${users.length}] Geocoding ${user.storename || user.username}...`);
      console.log(`   Address: ${user.address}, ${user.city}, ${user.province}`);
      
      try {
        const addressString = {
          address: user.address,
          city: user.city,
          province: user.province,
          zipCode: user.zipCode,
          country: user.country || 'South Africa'
        };
        
        const result = await geocodeAddress(addressString);
        
        // Update user
        user.latitude = result.latitude;
        user.longitude = result.longitude;
        user.geocodedAddress = result.displayName;
        user.geocodedAt = new Date();
        
        await user.save();
        
        console.log(`   ✅ Success: ${result.latitude}, ${result.longitude} (${result.provider})`);
        successCount++;
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        failCount++;
      }
      
      // Rate limiting: Wait 1 second between requests (Nominatim requirement)
      if (i < users.length - 1) {
        console.log('   ⏳ Waiting 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Geocoding Complete!');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📍 Total: ${users.length}`);
    console.log('='.repeat(50));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
geocodeAllUsers();