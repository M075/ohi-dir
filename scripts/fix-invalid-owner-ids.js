import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

async function fixInvalidOwnerIds() {
  try {
    await connectDB();
    console.log('Connected to database');

    // Find all products with owner ID of '2' (invalid string)
    const productsWithInvalidOwner = await Product.find({ 
      owner: '2' 
    });

    console.log(`Found ${productsWithInvalidOwner.length} products with invalid owner ID '2'`);

    if (productsWithInvalidOwner.length === 0) {
      console.log('No products with invalid owner IDs found');
      await mongoose.connection.close();
      return;
    }

    // Get the first admin user or create a default owner
    let defaultOwner = await User.findOne({ isAdmin: true });
    
    if (!defaultOwner) {
      // If no admin exists, get the first user
      defaultOwner = await User.findOne({});
    }

    if (!defaultOwner) {
      console.error('No users found in database. Please create a user first.');
      await mongoose.connection.close();
      return;
    }

    console.log(`Using owner: ${defaultOwner._id} (${defaultOwner.email})`);

    // Update all products with invalid owner ID
    const result = await Product.updateMany(
      { owner: '2' },
      { owner: defaultOwner._id }
    );

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Updated ${result.modifiedCount} products`);
    console.log(`   - Owner ID: ${defaultOwner._id}`);
    console.log(`   - Owner Email: ${defaultOwner.email}`);

    // Verify the changes
    const verifyProducts = await Product.find({ owner: '2' });
    if (verifyProducts.length === 0) {
      console.log('✅ Verification passed: No products with invalid owner ID remain');
    } else {
      console.log(`⚠️  Warning: ${verifyProducts.length} products still have invalid owner ID`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error fixing invalid owner IDs:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixInvalidOwnerIds();
